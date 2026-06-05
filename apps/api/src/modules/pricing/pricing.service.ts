import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingMode, OutOfRangeAction } from '@prisma/client';

export interface ResolvedPricingConfig {
  mode: PricingMode;
  flexibilityPct: number;
  outOfRangeAction: OutOfRangeAction;
  // Origin per field — useful for the admin UI to show "inherited from system / category / product"
  modeFrom: 'product' | 'category' | 'system';
  flexibilityFrom: 'product' | 'category' | 'system';
  outOfRangeFrom: 'product' | 'category' | 'system';
  // Computed price boundaries based on centralPrice + flexibilityPct.
  // null when centralPrice is unset (product not priced yet).
  floor: number | null;
  ceiling: number | null;
  centralPrice: number | null;
}

/**
 * Cascading pricing config: Product override → Category override → System default.
 *
 * The whole point of the override columns is that a single product can opt into
 * stricter or looser rules than its siblings without us inventing per-product
 * settings tables. Null at any level means "use whatever the next level up says."
 *
 * Centralising this in one service means the farmer-side, the admin-side, the
 * background out-of-range job, and any future buyer-display logic all see the
 * same numbers — no risk of drift.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get system-wide pricing settings (singleton row). Auto-creates if missing. */
  async getSystemSettings() {
    let row = await this.prisma.pricingSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      // First-boot safety: if seed didn't run, create the singleton with safe defaults.
      row = await this.prisma.pricingSettings.create({
        data: { id: 1, pricingMode: 'HYBRID', defaultFlexibilityPct: 5, outOfRangeAction: 'WARN' },
      });
    }
    return row;
  }

  async updateSystemSettings(
    dto: { pricingMode?: PricingMode; defaultFlexibilityPct?: number; outOfRangeAction?: OutOfRangeAction },
    userId?: string,
  ) {
    await this.getSystemSettings(); // ensure row exists
    if (dto.defaultFlexibilityPct !== undefined && (dto.defaultFlexibilityPct < 0 || dto.defaultFlexibilityPct > 100)) {
      throw new BadRequestException('defaultFlexibilityPct must be between 0 and 100');
    }
    return this.prisma.pricingSettings.update({
      where: { id: 1 },
      data: {
        ...(dto.pricingMode !== undefined && { pricingMode: dto.pricingMode }),
        ...(dto.defaultFlexibilityPct !== undefined && { defaultFlexibilityPct: dto.defaultFlexibilityPct }),
        ...(dto.outOfRangeAction !== undefined && { outOfRangeAction: dto.outOfRangeAction }),
        updatedById: userId,
      },
    });
  }

  /**
   * Resolve effective pricing config for one product. Reads in a single query
   * so it's safe to call repeatedly (e.g. once per row when validating a bulk
   * price update from the admin).
   */
  async resolveForProduct(productId: string): Promise<ResolvedPricingConfig> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    const settings = await this.getSystemSettings();
    return this.resolve(product, product.category, settings);
  }

  /** Pure resolver — no DB. Use when you've already loaded product+category. */
  resolve(
    product: { pricingModeOverride: PricingMode | null; flexibilityPctOverride: any; outOfRangeActionOverride: OutOfRangeAction | null; pricePerUnit: any },
    category: { pricingModeOverride: PricingMode | null; flexibilityPctOverride: any; outOfRangeActionOverride: OutOfRangeAction | null },
    settings: { pricingMode: PricingMode; defaultFlexibilityPct: any; outOfRangeAction: OutOfRangeAction },
  ): ResolvedPricingConfig {
    const mode =
      product.pricingModeOverride ?? category.pricingModeOverride ?? settings.pricingMode;
    const modeFrom = product.pricingModeOverride
      ? 'product'
      : category.pricingModeOverride
        ? 'category'
        : 'system';

    const flexibilityPct = Number(
      product.flexibilityPctOverride ?? category.flexibilityPctOverride ?? settings.defaultFlexibilityPct,
    );
    const flexibilityFrom = product.flexibilityPctOverride !== null && product.flexibilityPctOverride !== undefined
      ? 'product'
      : category.flexibilityPctOverride !== null && category.flexibilityPctOverride !== undefined
        ? 'category'
        : 'system';

    const outOfRangeAction =
      product.outOfRangeActionOverride ?? category.outOfRangeActionOverride ?? settings.outOfRangeAction;
    const outOfRangeFrom = product.outOfRangeActionOverride
      ? 'product'
      : category.outOfRangeActionOverride
        ? 'category'
        : 'system';

    const centralPrice = product.pricePerUnit !== null && product.pricePerUnit !== undefined
      ? Number(product.pricePerUnit)
      : null;
    const floor = centralPrice !== null ? +(centralPrice * (1 - flexibilityPct / 100)).toFixed(4) : null;
    const ceiling = centralPrice !== null ? +(centralPrice * (1 + flexibilityPct / 100)).toFixed(4) : null;

    return { mode, flexibilityPct, outOfRangeAction, modeFrom, flexibilityFrom, outOfRangeFrom, floor, ceiling, centralPrice };
  }

  /**
   * Validate a farmer's chosen price against the resolved config.
   * - STRICT: throws BadRequest if outside [floor, ceiling]
   * - HYBRID: allows it but reports isOutOfRange so caller can flag the listing
   * - REFERENCE: always valid, reports variance% for display
   */
  async validateFarmerPrice(productId: string, price: number): Promise<{
    valid: boolean;
    isOutOfRange: boolean;
    variancePct: number;
    config: ResolvedPricingConfig;
  }> {
    const config = await this.resolveForProduct(productId);
    if (config.centralPrice === null) {
      throw new BadRequestException('Product is not yet priced by admin');
    }
    const variancePct = +(((price - config.centralPrice) / config.centralPrice) * 100).toFixed(2);
    const inRange = config.floor !== null && config.ceiling !== null && price >= config.floor && price <= config.ceiling;
    const isOutOfRange = !inRange;

    if (config.mode === 'STRICT' && isOutOfRange) {
      throw new BadRequestException(
        `Price ${price} is outside allowed range [${config.floor} – ${config.ceiling}] (STRICT mode)`,
      );
    }
    return { valid: true, isOutOfRange, variancePct, config };
  }

  /**
   * Called by the products service after a centralPrice change.
   * - Re-evaluates every catalog item for this product against the new config.
   * - Applies the configured out-of-range action (SUSPEND / SNAP / WARN).
   * - Appends a row to ProductPriceHistory.
   *
   * Returns counts so the API can show the admin a summary
   * ("4 listings suspended, 2 snapped to ceiling").
   */
  async applyCentralPriceChange(productId: string, oldPrice: number | null, newPrice: number, changedById?: string, reason?: string) {
    await this.prisma.productPriceHistory.create({
      data: { productId, oldPrice, newPrice, changedById, reason },
    });

    const config = await this.resolveForProduct(productId);
    const items = await this.prisma.farmerCatalogItem.findMany({ where: { productId } });
    let suspended = 0, snapped = 0, warned = 0;

    for (const it of items) {
      const price = Number(it.pricePerUnit);
      const inRange = config.floor !== null && config.ceiling !== null && price >= config.floor && price <= config.ceiling;
      if (inRange) {
        // Came back into range after a price move — clear the flag.
        if (it.isOutOfRange) {
          await this.prisma.farmerCatalogItem.update({ where: { id: it.id }, data: { isOutOfRange: false } });
        }
        continue;
      }

      // Out of range. Apply the configured action.
      switch (config.outOfRangeAction) {
        case 'SUSPEND':
          await this.prisma.farmerCatalogItem.update({
            where: { id: it.id },
            data: { isListed: false, isOutOfRange: true },
          });
          suspended++;
          break;
        case 'SNAP': {
          const snappedPrice = price > (config.ceiling ?? 0) ? config.ceiling! : config.floor!;
          await this.prisma.farmerCatalogItem.update({
            where: { id: it.id },
            data: { pricePerUnit: snappedPrice, isOutOfRange: false, lastPriceUpdated: new Date() },
          });
          snapped++;
          break;
        }
        case 'WARN':
        default:
          await this.prisma.farmerCatalogItem.update({
            where: { id: it.id },
            data: { isOutOfRange: true },
          });
          warned++;
          break;
      }
    }

    return { totalListings: items.length, suspended, snapped, warned, config };
  }

  async getPriceHistory(productId: string, days = 90) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.productPriceHistory.findMany({
      where: { productId, changedAt: { gte: since } },
      orderBy: { changedAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() })); // BigInt → string for JSON
  }

  /**
   * One-shot dataset for the Daily Pricing Board screen — every priced
   * product with everything the admin needs to make a decision in a single
   * row: yesterday's price (for "Δ%"), last 7 days for the sparkline,
   * active-listings count (so the admin knows the blast radius before
   * changing a number), and the resolved floor/ceiling.
   *
   * Implemented in 4 queries total (not N+1):
   *   1. products + category
   *   2. system pricing settings (singleton)
   *   3. last 8 days of price history (filtered in JS to per-product)
   *   4. catalog-item counts grouped by productId
   */
  async getBoard(categoryId?: string) {
    const [products, settings, sinceHistory, listingCounts] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true, ...(categoryId && { categoryId }) },
        include: { category: true },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      }),
      this.getSystemSettings(),
      this.prisma.productPriceHistory.findMany({
        where: { changedAt: { gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } },
        orderBy: { changedAt: 'desc' },
      }),
      this.prisma.farmerCatalogItem.groupBy({
        by: ['productId'],
        where: { isListed: true },
        _count: { _all: true },
      }),
    ]);

    // Group history by productId for fast lookup. Each list is sorted newest-first.
    const historyByProduct = new Map<string, typeof sinceHistory>();
    for (const h of sinceHistory) {
      const arr = historyByProduct.get(h.productId) ?? [];
      arr.push(h);
      historyByProduct.set(h.productId, arr);
    }
    const listingsByProduct = new Map(listingCounts.map((c) => [c.productId, c._count._all]));

    const yesterdayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return products.map((p) => {
      const config = this.resolve(p, p.category, settings);
      const history = historyByProduct.get(p.id) ?? [];

      // Find the price as of "yesterday": the most-recent entry whose
      // changedAt is older than 24h ago. The oldPrice on that entry is
      // the price BEFORE that change, so we use newPrice for "after that
      // change took effect".
      const yesterdayEntry = history.find((h) => h.changedAt < yesterdayCutoff);
      const yesterdayPrice = yesterdayEntry?.newPrice ?? null;

      // Sparkline: build a series of (day, price) for the last 7 days.
      // Walk back day-by-day; at each day, the price is the most-recent
      // newPrice of an entry that happened at or before that day's end.
      // Falls back to the current pricePerUnit when no history exists.
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const series: { day: string; price: number | null }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayEnd = new Date(today); dayEnd.setDate(today.getDate() - i);
        const entry = history.find((h) => h.changedAt <= dayEnd);
        const price = entry?.newPrice
          ?? (i === 0 ? p.pricePerUnit : null);
        series.push({
          day: dayEnd.toISOString().slice(0, 10),
          price: price !== null ? Number(price) : null,
        });
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        nameAr: p.nameAr,
        unitOfMeasure: p.unitOfMeasure,
        category: { id: p.category.id, name: p.category.name, nameAr: p.category.nameAr },
        currentPrice: p.pricePerUnit !== null ? Number(p.pricePerUnit) : null,
        yesterdayPrice: yesterdayPrice !== null ? Number(yesterdayPrice) : null,
        sparkline: series,
        floor: config.floor,
        ceiling: config.ceiling,
        flexibilityPct: config.flexibilityPct,
        mode: config.mode,
        activeListings: listingsByProduct.get(p.id) ?? 0,
        priceUpdatedAt: p.priceUpdatedAt,
      };
    });
  }

  /**
   * Bulk update wrapper used by the Daily Pricing Board "Save N changes"
   * button. Each change runs through the same setCentralPrice flow used
   * by the per-product modal, so out-of-range actions still apply
   * (SUSPEND / SNAP / WARN) and ProductPriceHistory still gets a row.
   *
   * Failures don't roll back successful items — we return per-item
   * results so the UI can highlight which rows failed.
   */
  async bulkUpdate(
    changes: Array<{ productId: string; newPrice: number; reason?: string }>,
    updatedById?: string,
  ) {
    const results: Array<{
      productId: string;
      ok: boolean;
      newPrice?: number;
      error?: string;
      summary?: { suspended: number; snapped: number; warned: number };
    }> = [];

    for (const c of changes) {
      try {
        const product = await this.prisma.product.findUnique({ where: { id: c.productId } });
        if (!product) {
          results.push({ productId: c.productId, ok: false, error: 'Product not found' });
          continue;
        }
        const oldPrice = product.pricePerUnit !== null ? Number(product.pricePerUnit) : null;
        await this.prisma.product.update({
          where: { id: c.productId },
          data: {
            pricePerUnit: c.newPrice,
            priceUpdatedAt: new Date(),
            priceUpdatedBy: updatedById ?? null,
          },
        });
        const summary = await this.applyCentralPriceChange(c.productId, oldPrice, c.newPrice, updatedById, c.reason);
        results.push({
          productId: c.productId,
          ok: true,
          newPrice: c.newPrice,
          summary: { suspended: summary.suspended, snapped: summary.snapped, warned: summary.warned },
        });
      } catch (e: any) {
        results.push({ productId: c.productId, ok: false, error: e?.message ?? 'unknown' });
      }
    }
    return {
      total: changes.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  /** Used by the Category edit UI to show "what your override changes vs system". */
  async resolveForCategory(categoryId: string) {
    const cat = await this.prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException(`Category ${categoryId} not found`);
    const settings = await this.getSystemSettings();
    return {
      effective: {
        mode: cat.pricingModeOverride ?? settings.pricingMode,
        flexibilityPct: Number(cat.flexibilityPctOverride ?? settings.defaultFlexibilityPct),
        outOfRangeAction: cat.outOfRangeActionOverride ?? settings.outOfRangeAction,
      },
      overrides: {
        mode: cat.pricingModeOverride,
        flexibilityPct: cat.flexibilityPctOverride !== null && cat.flexibilityPctOverride !== undefined ? Number(cat.flexibilityPctOverride) : null,
        outOfRangeAction: cat.outOfRangeActionOverride,
      },
      systemDefault: {
        mode: settings.pricingMode,
        flexibilityPct: Number(settings.defaultFlexibilityPct),
        outOfRangeAction: settings.outOfRangeAction,
      },
    };
  }
}

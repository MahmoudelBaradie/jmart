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

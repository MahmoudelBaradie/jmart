import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PricingService } from '../pricing/pricing.service';

export { CreateProductDto, UpdateProductDto };

export interface ProductsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async findAll(dto: ProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.categoryId && { categoryId: dto.categoryId }),
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { nameAr: { contains: dto.search, mode: 'insensitive' } },
          { sku: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 25);
    const take = dto.limit ?? 25;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        include: {
          category: { select: { id: true, name: true, nameAr: true, code: true } },
          _count: { select: { catalogItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        ...p,
        minOrderQty: Number(p.minOrderQty),
        maxOrderQty: p.maxOrderQty ? Number(p.maxOrderQty) : null,
        listingsCount: p._count.catalogItems,
      })),
      meta: {
        total,
        page: dto.page ?? 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, nameAr: true, code: true } },
        _count: { select: { catalogItems: true } },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    return {
      ...p,
      minOrderQty: Number(p.minOrderQty),
      maxOrderQty: p.maxOrderQty ? Number(p.maxOrderQty) : null,
    };
  }

  async create(dto: CreateProductDto) {
    const cat = await this.prisma.productCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Category not found');

    const exists = await this.prisma.product.findUnique({ where: { sku: dto.sku.toUpperCase() } });
    if (exists) throw new ConflictException('SKU already exists');

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        sku: dto.sku.toUpperCase(),
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        unitOfMeasure: dto.unitOfMeasure,
        minOrderQty: dto.minOrderQty ?? 1,
        maxOrderQty: dto.maxOrderQty ?? null,
        gradeOptions: dto.gradeOptions ?? ['A', 'B'],
      },
      include: { category: { select: { id: true, name: true, nameAr: true, code: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const conflict = await this.prisma.product.findFirst({
        where: { sku: dto.sku.toUpperCase(), id: { not: id } },
      });
      if (conflict) throw new ConflictException('SKU already exists');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.sku && { sku: dto.sku.toUpperCase() }),
        ...(dto.name && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.unitOfMeasure && { unitOfMeasure: dto.unitOfMeasure }),
        ...(dto.minOrderQty !== undefined && { minOrderQty: dto.minOrderQty }),
        ...(dto.maxOrderQty !== undefined && { maxOrderQty: dto.maxOrderQty ?? null }),
        ...(dto.gradeOptions && { gradeOptions: dto.gradeOptions }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as any,
      include: { category: { select: { id: true, name: true, nameAr: true, code: true } } },
    });
  }

  async setPriceRange(id: string, priceFloor: number | null, priceCeiling: number | null) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { priceFloor, priceCeiling } as any,
      include: { category: { select: { id: true, name: true, nameAr: true, code: true } } },
    });
  }

  /**
   * Set the CENTRAL admin-controlled price for a product.
   *
   * Under the new pricing model the central price is the SUSPECTED MARKET price;
   * farmers keep their own per-listing price subject to the resolved mode:
   *   - STRICT    → farmer was already inside [floor, ceiling]; if the new
   *                 price moves them outside, the configured out-of-range
   *                 action runs (SUSPEND / SNAP / WARN).
   *   - HYBRID    → out-of-range listings get flagged for buyer-side display.
   *   - REFERENCE → no enforcement; central price is informational only.
   *
   * The blind cascade that used to overwrite every farmer's price is gone —
   * that was the old centralized-only model. Now `PricingService.applyCentralPriceChange`
   * handles the re-evaluation per the resolved config.
   */
  async setCentralPrice(productId: string, pricePerUnit: number, updatedById?: string, reason?: string) {
    const product = await this.findOne(productId);

    if (typeof pricePerUnit !== 'number' || !isFinite(pricePerUnit) || pricePerUnit <= 0) {
      throw new Error('pricePerUnit must be a positive number');
    }

    const oldPrice = (product as any).pricePerUnit != null ? Number((product as any).pricePerUnit) : null;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        pricePerUnit,
        priceUpdatedAt: new Date(),
        priceUpdatedBy: updatedById ?? null,
      } as any,
    });

    // Re-evaluate existing farmer listings + log history.
    // Returns { suspended, snapped, warned } so the controller can surface a summary.
    const summary = await this.pricing.applyCentralPriceChange(productId, oldPrice, pricePerUnit, updatedById, reason);

    return { ...updated, _priceChangeSummary: summary };
  }

  async getPriceOverview() {
    // Fetch products + lots separately then merge in JS
    // Using raw queries since priceFloor/priceCeiling are new columns not yet in the Prisma client types
    const [products, lots] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT p.id, p.sku, p.name, p."nameAr", p."unitOfMeasure",
               p."priceFloor", p."priceCeiling",
               pc.name AS "categoryName", pc."nameAr" AS "categoryNameAr"
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p."categoryId"
        WHERE p."isActive" = true
        ORDER BY pc.name, p.name
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT "productId", "pricePerUnit"
        FROM farmer_catalog_items
        WHERE "isListed" = true
      `,
    ]);

    // Group lots by productId
    const lotsByProduct = new Map<string, number[]>();
    for (const lot of lots) {
      const price = Number(lot.pricePerUnit);
      if (!lotsByProduct.has(lot.productId)) lotsByProduct.set(lot.productId, []);
      lotsByProduct.get(lot.productId)!.push(price);
    }

    return products.map((p) => {
      const prices = lotsByProduct.get(p.id) || [];
      const floor = p.priceFloor != null ? Number(p.priceFloor) : null;
      const ceiling = p.priceCeiling != null ? Number(p.priceCeiling) : null;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        nameAr: p.nameAr,
        unitOfMeasure: p.unitOfMeasure,
        priceFloor: floor,
        priceCeiling: ceiling,
        categoryName: p.categoryName,
        categoryNameAr: p.categoryNameAr,
        lotsCount: prices.length,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
        avgPrice: prices.length > 0 ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(4)) : null,
        belowFloorCount: floor != null ? prices.filter((pr) => pr < floor!).length : 0,
        aboveCeilingCount: ceiling != null ? prices.filter((pr) => pr > ceiling!).length : 0,
      };
    });
  }
}

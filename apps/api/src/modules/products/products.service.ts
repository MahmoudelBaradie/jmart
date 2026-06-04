import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
   * Set the CENTRAL admin-controlled price for a product, and propagate it to
   * every FarmerCatalogItem for that product so the marketplace + checkout
   * reflect it immediately. Runs in a single transaction.
   */
  async setCentralPrice(productId: string, pricePerUnit: number, updatedById?: string) {
    const product = await this.findOne(productId);

    if (typeof pricePerUnit !== 'number' || !isFinite(pricePerUnit) || pricePerUnit <= 0) {
      throw new Error('pricePerUnit must be a positive number');
    }

    // Respect priceFloor / priceCeiling guard-rails if set.
    const floor = (product as any).priceFloor != null ? Number((product as any).priceFloor) : null;
    const ceiling = (product as any).priceCeiling != null ? Number((product as any).priceCeiling) : null;
    if (floor != null && pricePerUnit < floor) {
      throw new Error(`Price ${pricePerUnit} is below the configured floor (${floor}).`);
    }
    if (ceiling != null && pricePerUnit > ceiling) {
      throw new Error(`Price ${pricePerUnit} is above the configured ceiling (${ceiling}).`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          pricePerUnit,
          priceUpdatedAt: new Date(),
          priceUpdatedBy: updatedById ?? null,
        } as any,
      });

      // Cascade to all farmer catalog items for this product (any grade /
      // packaging) so marketplace + new orders price uniformly.
      await tx.farmerCatalogItem.updateMany({
        where: { productId },
        data: {
          pricePerUnit,
          lastPriceUpdated: new Date(),
          updatedBy: updatedById ?? 'admin',
        },
      });

      return updated;
    });
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

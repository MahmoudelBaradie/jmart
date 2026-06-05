import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { generateLotNumber } from '../../common/utils/number-generator.util';
import { LotStatus, Prisma, StorageType } from '@prisma/client';

export interface CatalogQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  productId?: string;
  farmerId?: string;
  zoneId?: string;
}

export interface LotsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  farmerId?: string;
  productId?: string;
  categoryId?: string;
  status?: LotStatus;
  warehouseId?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Catalog ────────────────────────────────────────────────────────────────

  async getCatalog(dto: CatalogQueryDto) {
    const where: Prisma.FarmerCatalogItemWhereInput = {
      isListed: true,
      ...(dto.productId && { productId: dto.productId }),
      ...(dto.farmerId && { farmerId: dto.farmerId }),
      ...(dto.zoneId && { farm: { geoZoneId: dto.zoneId } }),
      ...(dto.search && {
        OR: [
          { product: { name: { contains: dto.search, mode: 'insensitive' } } },
          { product: { nameAr: { contains: dto.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const orderBy: Prisma.FarmerCatalogItemOrderByWithRelationInput = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.farmerCatalogItem.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              nameAr: true,
              unitOfMeasure: true,
              category: { select: { id: true, name: true } },
            },
          },
          farmer: {
            select: { id: true, businessName: true, contactPhone: true },
          },
          farm: { select: { id: true, farmName: true, geoZoneId: true } },
        },
      }),
      this.prisma.farmerCatalogItem.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
        totalPages: Math.ceil(total / (dto.limit ?? 20)),
      },
    };
  }

  async createCatalogItem(farmerId: string, dto: any) {
    const farmer = await this.prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException(`Farmer with id ${farmerId} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product with id ${dto.productId} not found`);

    if (!dto.farmId) throw new NotFoundException('farmId is required');
    const farm = await this.prisma.farmerFarm.findUnique({ where: { id: dto.farmId } });
    if (!farm) throw new NotFoundException(`Farm with id ${dto.farmId} not found`);
    if (farm.farmerId !== farmerId) throw new ForbiddenException('Farm does not belong to this farmer');

    // CENTRALISED PRICING: the catalog row inherits Product.pricePerUnit.
    // Any client-supplied dto.pricePerUnit is silently ignored.
    const inheritedPrice = product.pricePerUnit != null ? Number(product.pricePerUnit) : 0;

    return this.prisma.farmerCatalogItem.create({
      data: {
        farmerId,
        farmId: dto.farmId,
        productId: dto.productId,
        grade: dto.grade ?? 'A',
        packagingType: dto.packagingType,
        pricePerUnit: inheritedPrice,
        availableQty: dto.availableQty ?? 0,
        minOrderQty: dto.minOrderQty,
        isListed: dto.isListed ?? true,
      },
      include: {
        product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
        farm: { select: { id: true, farmName: true } },
      },
    });
  }

  async updateCatalogItem(id: string, farmerId: string, dto: any) {
    const item = await this.prisma.farmerCatalogItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Catalog item with id ${id} not found`);
    if (item.farmerId !== farmerId) throw new ForbiddenException('Catalog item does not belong to this farmer');

    // CENTRALISED PRICING: pricePerUnit cannot be changed by the farmer.
    // Quantity, packaging, and listing status remain editable.
    return this.prisma.farmerCatalogItem.update({
      where: { id },
      data: {
        ...(dto.availableQty !== undefined && { availableQty: dto.availableQty }),
        ...(dto.minOrderQty !== undefined && { minOrderQty: dto.minOrderQty }),
        ...(dto.packagingType !== undefined && { packagingType: dto.packagingType }),
        ...(dto.isListed !== undefined && { isListed: dto.isListed }),
        lastPriceUpdated: new Date(),
      },
      include: {
        product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
        farm: { select: { id: true, farmName: true } },
      },
    });
  }

  async getFarmerCatalog(farmerId: string) {
    const farmer = await this.prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException(`Farmer with id ${farmerId} not found`);

    return this.prisma.farmerCatalogItem.findMany({
      where: { farmerId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            nameAr: true,
            unitOfMeasure: true,
            priceFloor: true,
            priceCeiling: true,
            category: { select: { id: true, name: true } },
          } as any,
        },
        farm: { select: { id: true, farmName: true, geoZoneId: true } },
        _count: { select: { priceHistory: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ─── Lots ────────────────────────────────────────────────────────────────────

  async getLots(dto: LotsQueryDto) {
    const where: Prisma.InventoryLotWhereInput = {
      ...(dto.farmerId && { farmerId: dto.farmerId }),
      ...(dto.productId && { productId: dto.productId }),
      ...(dto.categoryId && { product: { categoryId: dto.categoryId } }),
      ...(dto.status && { status: dto.status }),
      ...(dto.warehouseId && { warehouseId: dto.warehouseId }),
      ...(dto.search && {
        OR: [
          { lotNumber: { contains: dto.search, mode: 'insensitive' } },
          { product: { name: { contains: dto.search, mode: 'insensitive' } } },
          { product: { nameAr: { contains: dto.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const orderBy: Prisma.InventoryLotOrderByWithRelationInput = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.inventoryLot.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          product: {
            select: {
              id: true, sku: true, name: true, nameAr: true, unitOfMeasure: true,
              // pricePerUnit here is the CENTRAL admin-set market price.
              // The buyer marketplace uses it to show "+/- vs market" badges
              // next to the farmer's offer.
              pricePerUnit: true,
              category: { select: { id: true, name: true, nameAr: true } },
            },
          },
          farmer: { select: { id: true, businessName: true } },
          farm: { select: { id: true, farmName: true } },
          warehouse: { select: { id: true, warehouseName: true } },
          _count: { select: { reservations: true, qualityInspections: true } },
        },
      }),
      this.prisma.inventoryLot.count({ where }),
    ]);

    // Enrich each lot with `pricePerKg` from the matching FarmerCatalogItem.
    // Price lives on the catalog item (farmerId + productId + grade), NOT on
    // the lot itself. Without this enrichment the marketplace shows 0 SAR
    // for every product. We also pull isOutOfRange so the UI can flag
    // overpriced listings.
    if (data.length > 0) {
      const catalogItems = await this.prisma.farmerCatalogItem.findMany({
        where: {
          OR: data.map((l) => ({ farmerId: l.farmerId, productId: l.productId, grade: l.grade })),
        },
        select: { farmerId: true, productId: true, grade: true, pricePerUnit: true, isOutOfRange: true },
      });
      const priceKey = (fId: string, pId: string, g: string) => `${fId}|${pId}|${g}`;
      const catalogMap = new Map(
        catalogItems.map((c) => [priceKey(c.farmerId, c.productId, c.grade), c]),
      );
      for (const lot of data) {
        const ci = catalogMap.get(priceKey(lot.farmerId, lot.productId, lot.grade));
        const price = ci?.pricePerUnit ?? null;
        // Expose under both common field names so existing frontends pick it up
        (lot as any).pricePerKg = price;
        (lot as any).askingPricePerKg = price;
        // For the marketplace badge: lets the UI render "خارج النطاق" without
        // a second round-trip to load the catalog item.
        (lot as any).isOutOfRange = !!ci?.isOutOfRange;
      }
    }

    return {
      data,
      meta: {
        total,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
        totalPages: Math.ceil(total / (dto.limit ?? 20)),
      },
    };
  }

  async getLotById(id: string) {
    const lot = await this.prisma.inventoryLot.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            nameAr: true,
            unitOfMeasure: true,
            category: { select: { id: true, name: true } },
          },
        },
        farmer: { select: { id: true, businessName: true, contactPhone: true } },
        farm: { select: { id: true, farmName: true, geoZoneId: true } },
        warehouse: { select: { id: true, warehouseName: true } },
        reservations: {
          select: { id: true, qtyReserved: true, status: true, reservedAt: true },
          orderBy: { reservedAt: 'desc' },
          take: 10,
        },
        qualityInspections: {
          select: { id: true, result: true, completedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { reservations: true, qualityInspections: true } },
      },
    });

    if (!lot) throw new NotFoundException(`InventoryLot with id ${id} not found`);
    return lot;
  }

  async createLot(farmerId: string, dto: any) {
    const farmer = await this.prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException(`Farmer with id ${farmerId} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product with id ${dto.productId} not found`);

    if (!dto.farmId) throw new NotFoundException('farmId is required');
    const farm = await this.prisma.farmerFarm.findUnique({ where: { id: dto.farmId } });
    if (!farm) throw new NotFoundException(`Farm with id ${dto.farmId} not found`);
    if (farm.farmerId !== farmerId) throw new ForbiddenException('Farm does not belong to this farmer');

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse) throw new NotFoundException(`Warehouse with id ${dto.warehouseId} not found`);
    }

    const lotNumber = await generateLotNumber(farmerId, this.prisma);
    const grade = dto.grade ?? 'A';
    const totalQty = Number(dto.qtyTotal ?? dto.totalWeightKg ?? 0);
    const packagingType: string | undefined = dto.packaging ?? dto.packagingType;

    // ── CENTRALISED PRICING ────────────────────────────────────────────────
    // The farmer CANNOT set or override the price (any `dto.pricePerKg` is
    // silently ignored — kept for backwards-compat with mobile clients).
    // The catalog row inherits the admin-set Product.pricePerUnit, or 0 if
    // the product hasn't been priced yet (orders will then refuse).
    const pricePerKg = product.pricePerUnit != null ? Number(product.pricePerUnit) : 0;

    // Atomically: upsert FarmerCatalogItem (so price/availability is queryable
    // by the marketplace) AND create the InventoryLot. Without this, lots
    // created via /listings/new have no price (price lives only on catalog
    // item) and show up as 0 SAR in marketplace + fail checkout validation.
    return this.prisma.$transaction(async (tx) => {
      // Always upsert the catalog row so this farmer is discoverable in the
      // marketplace for this product, even before admin sets a price. Price
      // mirrors Product.pricePerUnit (0 if unpriced — orders will refuse).
      await tx.farmerCatalogItem.upsert({
        where: {
          farmerId_productId_grade_packagingType: {
            farmerId,
            productId: dto.productId,
            grade,
            packagingType: packagingType ?? null as unknown as string,
          },
        },
        update: {
          pricePerUnit: pricePerKg,
          isListed: true,
          lastPriceUpdated: new Date(),
        },
        create: {
          farmerId,
          farmId: dto.farmId,
          productId: dto.productId,
          grade,
          packagingType,
          pricePerUnit: pricePerKg,
          availableQty: 0, // refreshed below from lots
          isListed: true,
          lastPriceUpdated: new Date(),
        },
      });

      const lot = await tx.inventoryLot.create({
        data: {
          lotNumber,
          farmerId,
          farmId: dto.farmId,
          productId: dto.productId,
          grade,
          geoZoneId: dto.geoZoneId ?? farm.geoZoneId,
          qtyTotal: totalQty,
          qtyAvailable: dto.qtyAvailable ?? totalQty,
          harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
          // Schema requires expiryDate (NOT NULL). When the caller doesn't
          // provide one, default to 30 days from harvest, or 30 days from now.
          expiryDate: dto.expiryDate
            ? new Date(dto.expiryDate)
            : new Date(
                (dto.harvestDate ? new Date(dto.harvestDate).getTime() : Date.now())
                + 30 * 24 * 60 * 60 * 1000,
              ),
          batchNotes: dto.notes,
          storageType: dto.storageType ?? StorageType.AMBIENT,
          warehouseId: dto.warehouseId,
          status: LotStatus.AVAILABLE,
        },
        include: {
          product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
          farm: { select: { id: true, farmName: true } },
          warehouse: { select: { id: true, warehouseName: true } },
        },
      });

      // Refresh catalog availableQty from authoritative sum of lot stock.
      // (Single source of truth = inventory_lot.qty_available across active lots.)
      const agg = await tx.inventoryLot.aggregate({
        where: {
          farmerId,
          productId: dto.productId,
          grade,
          status: LotStatus.AVAILABLE,
        },
        _sum: { qtyAvailable: true },
      });
      await tx.farmerCatalogItem.updateMany({
        where: {
          farmerId,
          productId: dto.productId,
          grade,
          packagingType: packagingType ?? null,
        },
        data: { availableQty: Number(agg._sum.qtyAvailable ?? 0) },
      });

      return lot;
    });
  }

  async updateLotStatus(id: string, dto: { status: LotStatus; notes?: string }) {
    const lot = await this.prisma.inventoryLot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException(`InventoryLot with id ${id} not found`);

    return this.prisma.inventoryLot.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined && { batchNotes: dto.notes }),
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        farmer: { select: { id: true, businessName: true } },
      },
    });
  }

  async updateCatalogPriceByAdmin(catalogItemId: string, pricePerUnit: number, updatedBy: string, reason?: string) {
    const item = await this.prisma.farmerCatalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException(`Catalog item ${catalogItemId} not found`);

    const oldPrice = Number(item.pricePerUnit);

    await this.prisma.priceHistory.create({
      data: {
        catalogItemId,
        oldPrice,
        newPrice: pricePerUnit,
        changedByType: 'ADMIN',
        changeReason: reason ?? 'Admin override',
      },
    });

    return this.prisma.farmerCatalogItem.update({
      where: { id: catalogItemId },
      data: { pricePerUnit, lastPriceUpdated: new Date() },
      include: {
        product: { select: { id: true, sku: true, name: true, nameAr: true, unitOfMeasure: true } },
        farmer: { select: { id: true, businessName: true } },
      },
    });
  }

  async updateCatalogItemPrice(id: string, farmerId: string, pricePerUnit: number, reason?: string) {
    const item = await this.prisma.farmerCatalogItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Catalog item ${id} not found`);
    if (item.farmerId !== farmerId) throw new ForbiddenException('Not your catalog item');

    const oldPrice = Number(item.pricePerUnit);

    // Record price history
    await this.prisma.priceHistory.create({
      data: {
        catalogItemId: id,
        oldPrice,
        newPrice: pricePerUnit,
        changedByType: 'FARMER',
        changeReason: reason ?? 'Price updated by farmer',
      },
    });

    return this.prisma.farmerCatalogItem.update({
      where: { id },
      data: { pricePerUnit, lastPriceUpdated: new Date() },
      include: {
        product: { select: { id: true, sku: true, name: true, nameAr: true, unitOfMeasure: true } },
      },
    });
  }

  async getPriceHistory(catalogItemId: string, days: number) {
    const item = await this.prisma.farmerCatalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException(`Catalog item with id ${catalogItemId} not found`);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const history = await this.prisma.priceHistory.findMany({
      where: {
        catalogItemId,
        effectiveAt: { gte: fromDate },
      },
      orderBy: { effectiveAt: 'asc' },
      select: {
        id: true,
        oldPrice: true,
        newPrice: true,
        changeReason: true,
        effectiveAt: true,
      },
    });

    return { catalogItemId, days, priceHistory: history };
  }
}

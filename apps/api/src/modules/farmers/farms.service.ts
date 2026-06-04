/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFarms(params: {
    page?: number;
    limit?: number;
    search?: string;
    zoneId?: string;
    buyerId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(params.zoneId && { geoZoneId: params.zoneId }),
      ...(params.search && {
        OR: [
          { farmName: { contains: params.search, mode: 'insensitive' } },
          { farmer: { businessName: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [farms, total]: [any[], number] = await Promise.all([
      (this.prisma as any).farmerFarm.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { id: true, businessName: true, ratingAvg: true, ratingCount: true } },
          geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } },
          catalogItems: {
            where: { isListed: true },
            select: {
              id: true,
              pricePerUnit: true,
              availableQty: true,
              product: { select: { id: true, name: true, nameAr: true, unitOfMeasure: true } },
            },
          },
          inventoryLots: {
            where: { status: 'AVAILABLE' },
            select: { id: true, qtyAvailable: true },
          },
        },
      }),
      (this.prisma as any).farmerFarm.count({ where }),
    ]);

    const farmIds = farms.map((f: any) => f.id);
    let followerCounts: Record<string, number> = {};
    let followedSet = new Set<string>();

    if (farmIds.length > 0) {
      const countRows: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT "farmId", COUNT(*) as cnt
        FROM farm_follows
        WHERE "farmId" = ANY($1::uuid[])
        GROUP BY "farmId"
      `, farmIds);
      followerCounts = Object.fromEntries(countRows.map((r: any) => [r.farmId, Number(r.cnt)]));

      if (params.buyerId) {
        const followRows: any[] = await this.prisma.$queryRawUnsafe(`
          SELECT "farmId" FROM farm_follows
          WHERE "buyerId" = $1::uuid AND "farmId" = ANY($2::uuid[])
        `, params.buyerId, farmIds);
        followedSet = new Set(followRows.map((r: any) => r.farmId));
      }
    }

    const data = farms.map((farm: any) => {
      const totalAvailableQty = (farm.inventoryLots ?? []).reduce(
        (sum: number, lot: any) => sum + Number(lot.qtyAvailable ?? 0),
        0,
      );
      const listedProducts = (farm.catalogItems ?? []).map((ci: any) => ({
        productId: ci.product?.id,
        productName: ci.product?.name,
        productNameAr: ci.product?.nameAr,
        unitOfMeasure: ci.product?.unitOfMeasure,
        pricePerUnit: Number(ci.pricePerUnit),
        availableQty: Number(ci.availableQty),
      }));

      return {
        id: farm.id,
        farmName: farm.farmName,
        farmerId: farm.farmerId,
        farmerName: farm.farmer?.businessName,
        farmerRatingAvg: farm.farmer?.ratingAvg ? Number(farm.farmer.ratingAvg) : null,
        farmerRatingCount: farm.farmer?.ratingCount ?? 0,
        geoZone: farm.geoZone,
        address: farm.address,
        areaHectares: farm.areaHectares ? Number(farm.areaHectares) : null,
        primaryProducts: farm.primaryProducts,
        isPrimary: farm.isPrimary,
        createdAt: farm.createdAt,
        followersCount: followerCounts[farm.id] ?? 0,
        catalogItemsCount: (farm.catalogItems ?? []).length,
        listedProductsCount: listedProducts.length,
        totalAvailableQty,
        listedProducts,
        isFollowing: params.buyerId ? followedSet.has(farm.id) : undefined,
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFarmProfile(farmId: string, buyerId?: string) {
    const farm: any = await (this.prisma as any).farmerFarm.findUnique({
      where: { id: farmId },
      include: {
        farmer: {
          select: {
            id: true,
            businessName: true,
            ratingAvg: true,
            ratingCount: true,
            contactPhone: true,
            farmerType: true,
          },
        },
        geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } },
        catalogItems: {
          where: { isListed: true },
          orderBy: { updatedAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                nameAr: true,
                unitOfMeasure: true,
                category: { select: { id: true, name: true, nameAr: true } },
              },
            },
          },
        },
        inventoryLots: {
          where: { status: 'AVAILABLE' },
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, name: true, nameAr: true, unitOfMeasure: true } },
          },
        },
      },
    });

    if (!farm) throw new NotFoundException(`Farm ${farmId} not found`);

    const countRows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM farm_follows WHERE "farmId" = $1::uuid`,
      farmId,
    );
    const followersCount = Number(countRows[0]?.cnt ?? 0);

    let isFollowing = false;
    if (buyerId) {
      const followRows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT 1 FROM farm_follows WHERE "buyerId" = $1::uuid AND "farmId" = $2::uuid LIMIT 1`,
        buyerId,
        farmId,
      );
      isFollowing = followRows.length > 0;
    }

    return {
      id: farm.id,
      farmName: farm.farmName,
      farmerId: farm.farmerId,
      farmer: {
        id: farm.farmer?.id,
        businessName: farm.farmer?.businessName,
        ratingAvg: farm.farmer?.ratingAvg ? Number(farm.farmer.ratingAvg) : null,
        ratingCount: farm.farmer?.ratingCount ?? 0,
        contactPhone: farm.farmer?.contactPhone,
        farmerType: farm.farmer?.farmerType,
      },
      geoZone: farm.geoZone,
      address: farm.address,
      latitude: Number(farm.latitude),
      longitude: Number(farm.longitude),
      areaHectares: farm.areaHectares ? Number(farm.areaHectares) : null,
      primaryProducts: farm.primaryProducts,
      isPrimary: farm.isPrimary,
      createdAt: farm.createdAt,
      followersCount,
      isFollowing,
      catalogItems: (farm.catalogItems ?? []).map((ci: any) => ({
        id: ci.id,
        product: ci.product,
        grade: ci.grade,
        packagingType: ci.packagingType,
        pricePerUnit: Number(ci.pricePerUnit),
        availableQty: Number(ci.availableQty),
        minOrderQty: ci.minOrderQty ? Number(ci.minOrderQty) : null,
        isListed: ci.isListed,
        lastPriceUpdated: ci.lastPriceUpdated,
      })),
      availableLots: (farm.inventoryLots ?? []).map((lot: any) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        product: lot.product,
        grade: lot.grade,
        qtyAvailable: Number(lot.qtyAvailable),
        qtyTotal: Number(lot.qtyTotal),
        harvestDate: lot.harvestDate,
        expiryDate: lot.expiryDate,
        status: lot.status,
      })),
    };
  }

  async followFarm(buyerId: string, farmId: string) {
    const farm: any = await (this.prisma as any).farmerFarm.findUnique({ where: { id: farmId } });
    if (!farm) throw new NotFoundException(`Farm ${farmId} not found`);

    const existing: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT 1 FROM farm_follows WHERE "buyerId" = $1::uuid AND "farmId" = $2::uuid LIMIT 1`,
      buyerId, farmId,
    );

    if (existing.length > 0) throw new ConflictException('Already following this farm');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO farm_follows (id, "buyerId", "farmId", "createdAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, now())`,
      buyerId, farmId,
    );

    return { message: 'Farm followed successfully', farmId, isFollowing: true };
  }

  async unfollowFarm(buyerId: string, farmId: string) {
    const deleted = await this.prisma.$executeRawUnsafe(
      `DELETE FROM farm_follows WHERE "buyerId" = $1::uuid AND "farmId" = $2::uuid`,
      buyerId, farmId,
    );

    if (deleted === 0) throw new NotFoundException('Not following this farm');
    return { message: 'Farm unfollowed successfully', farmId, isFollowing: false };
  }

  async getFollowedFarms(buyerId: string) {
    if (!buyerId) return [];

    const follows: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT "farmId", "createdAt" as "followedAt"
      FROM farm_follows
      WHERE "buyerId" = $1::uuid
      ORDER BY "createdAt" DESC
    `, buyerId);

    if (follows.length === 0) return [];

    const farmIds = follows.map((f: any) => f.farmId);
    const farms: any[] = await (this.prisma as any).farmerFarm.findMany({
      where: { id: { in: farmIds } },
      include: {
        farmer: { select: { id: true, businessName: true, ratingAvg: true, ratingCount: true } },
        geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } },
        catalogItems: {
          where: { isListed: true },
          select: { id: true, availableQty: true },
        },
      },
    });

    const countRows: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT "farmId", COUNT(*) as cnt
      FROM farm_follows
      WHERE "farmId" = ANY($1::uuid[])
      GROUP BY "farmId"
    `, farmIds);
    const followerCounts = Object.fromEntries(countRows.map((r: any) => [r.farmId, Number(r.cnt)]));
    const farmMap = Object.fromEntries(farms.map((f: any) => [f.id, f]));

    return follows.map((f: any) => {
      const farm: any = farmMap[f.farmId];
      if (!farm) return null;
      return {
        followedAt: f.followedAt,
        farm: {
          id: farm.id,
          farmName: farm.farmName,
          farmerName: farm.farmer?.businessName,
          geoZone: farm.geoZone,
          address: farm.address,
          isPrimary: farm.isPrimary,
          followersCount: followerCounts[farm.id] ?? 0,
          listedProductsCount: (farm.catalogItems ?? []).length,
          totalAvailableQty: (farm.catalogItems ?? []).reduce(
            (sum: number, ci: any) => sum + Number(ci.availableQty ?? 0),
            0,
          ),
          isFollowing: true,
        },
      };
    }).filter(Boolean);
  }
}

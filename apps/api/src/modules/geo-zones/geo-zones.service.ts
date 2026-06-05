import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateGeoZoneDto } from './dto/create-geo-zone.dto';
import { UpdateGeoZoneDto } from './dto/update-geo-zone.dto';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { ZoneLevel, ZoneStatus, Prisma } from '@prisma/client';

@Injectable()
export class GeoZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: PaginationDto) {
    const where: Prisma.GeoZoneWhereInput = {
      status: ZoneStatus.ACTIVE,
      ...(dto.search && {
        OR: [
          { zoneName: { contains: dto.search, mode: 'insensitive' } },
          { zoneNameAr: { contains: dto.search, mode: 'insensitive' } },
          { zoneCode: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.GeoZoneOrderByWithRelationInput = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.geoZone.findMany({
        where,
        skip: dto.skip,
        take: dto.take,
        orderBy,
        include: {
          parentZone: { select: { id: true, zoneName: true, zoneCode: true, zoneLevel: true } },
          _count: { select: { childZones: true } },
        },
      }),
      this.prisma.geoZone.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const zone = await this.prisma.geoZone.findUnique({
      where: { id },
      include: {
        parentZone: { select: { id: true, zoneName: true, zoneCode: true, zoneLevel: true } },
        childZones: {
          where: { status: ZoneStatus.ACTIVE },
          select: { id: true, zoneName: true, zoneCode: true, zoneLevel: true, status: true },
        },
        managedBy: { select: { id: true, fullName: true } },
        _count: {
          select: { farms: true, buyerBranches: true, warehouses: true },
        },
      },
    });

    if (!zone) throw new NotFoundException(`GeoZone with id ${id} not found`);
    return zone;
  }

  async create(dto: CreateGeoZoneDto, userId: string) {
    const internalUser = await this.prisma.internalUser.findUnique({ where: { userId } });

    if (dto.parentZoneId) {
      const parent = await this.prisma.geoZone.findUnique({ where: { id: dto.parentZoneId } });
      if (!parent) throw new NotFoundException(`Parent zone with id ${dto.parentZoneId} not found`);
    }

    return this.prisma.geoZone.create({
      data: {
        zoneCode: dto.zoneCode,
        zoneName: dto.zoneName,
        zoneNameAr: dto.zoneNameAr,
        parentZoneId: dto.parentZoneId,
        zoneLevel: dto.zoneLevel,
        boundaryGeoJson: dto.boundaryGeoJson ?? undefined,
        centroidLat: dto.centroidLat ?? this.centroidOfGeoJson(dto.boundaryGeoJson),
        centroidLng: dto.centroidLng ?? this.centroidOfGeoJson(dto.boundaryGeoJson, 'lng'),
        coverageStartTime: dto.coverageStartTime,
        coverageEndTime: dto.coverageEndTime,
        maxOrderWeightKg: dto.maxOrderWeightKg,
        status: dto.status ?? ZoneStatus.ACTIVE,
        managedById: internalUser?.id ?? null,
      } as any,
      include: {
        parentZone: { select: { id: true, zoneName: true, zoneCode: true, zoneLevel: true } },
      },
    });
  }

  async update(id: string, dto: UpdateGeoZoneDto) {
    await this.findOne(id);

    if (dto.parentZoneId) {
      const parent = await this.prisma.geoZone.findUnique({ where: { id: dto.parentZoneId } });
      if (!parent) throw new NotFoundException(`Parent zone with id ${dto.parentZoneId} not found`);
    }

    return this.prisma.geoZone.update({
      where: { id },
      data: {
        ...(dto.zoneCode !== undefined && { zoneCode: dto.zoneCode }),
        ...(dto.zoneName !== undefined && { zoneName: dto.zoneName }),
        ...(dto.zoneNameAr !== undefined && { zoneNameAr: dto.zoneNameAr }),
        ...(dto.parentZoneId !== undefined && { parentZoneId: dto.parentZoneId }),
        ...(dto.zoneLevel !== undefined && { zoneLevel: dto.zoneLevel }),
        ...((dto as any).boundaryGeoJson !== undefined && { boundaryGeoJson: (dto as any).boundaryGeoJson }),
        ...(dto.centroidLat !== undefined && { centroidLat: dto.centroidLat }),
        ...(dto.centroidLng !== undefined && { centroidLng: dto.centroidLng }),
        ...(dto.coverageStartTime !== undefined && { coverageStartTime: dto.coverageStartTime }),
        ...(dto.coverageEndTime !== undefined && { coverageEndTime: dto.coverageEndTime }),
        ...(dto.maxOrderWeightKg !== undefined && { maxOrderWeightKg: dto.maxOrderWeightKg }),
        ...(dto.status !== undefined && { status: dto.status }),
      } as any,
      include: {
        parentZone: { select: { id: true, zoneName: true, zoneCode: true } },
        _count: { select: { childZones: true } },
      },
    });
  }

  async getHierarchy() {
    return this.prisma.geoZone.findMany({
      where: { zoneLevel: ZoneLevel.REGION, status: ZoneStatus.ACTIVE },
      include: {
        childZones: {
          where: { status: ZoneStatus.ACTIVE },
          include: {
            childZones: {
              where: { status: ZoneStatus.ACTIVE },
              select: { id: true, zoneCode: true, zoneName: true, zoneNameAr: true, zoneLevel: true, status: true },
            },
          },
        },
      },
      orderBy: { zoneName: 'asc' },
    });
  }

  async getShippingRates(fromZoneId: string, toZoneId: string) {
    const [fromZone, toZone] = await Promise.all([
      this.prisma.geoZone.findUnique({ where: { id: fromZoneId } }),
      this.prisma.geoZone.findUnique({ where: { id: toZoneId } }),
    ]);

    if (!fromZone) throw new NotFoundException(`Source zone with id ${fromZoneId} not found`);
    if (!toZone) throw new NotFoundException(`Destination zone with id ${toZoneId} not found`);

    const now = new Date();

    return this.prisma.zoneShippingRate.findMany({
      where: {
        fromZoneId,
        toZoneId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      include: {
        fromZone: { select: { id: true, zoneName: true, zoneCode: true } },
        toZone: { select: { id: true, zoneName: true, zoneCode: true } },
        setBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { vehicleType: 'asc' },
    });
  }

  async createShippingRate(dto: CreateShippingRateDto, userId: string) {
    const [fromZone, toZone] = await Promise.all([
      this.prisma.geoZone.findUnique({ where: { id: dto.fromZoneId } }),
      this.prisma.geoZone.findUnique({ where: { id: dto.toZoneId } }),
    ]);

    if (!fromZone) throw new NotFoundException(`Source zone with id ${dto.fromZoneId} not found`);
    if (!toZone) throw new NotFoundException(`Destination zone with id ${dto.toZoneId} not found`);

    const internalUser = await this.prisma.internalUser.findUnique({ where: { userId } });

    return this.prisma.zoneShippingRate.create({
      data: {
        fromZoneId: dto.fromZoneId,
        toZoneId: dto.toZoneId,
        vehicleType: dto.vehicleType,
        rateType: dto.rateType,
        baseRate: dto.baseRate,
        perKgRate: dto.perKgRate ?? 0,
        minCharge: dto.minCharge,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveTo ? new Date(dto.effectiveTo as any) : undefined,
        setById: internalUser?.id ?? null,
      } as any,
      include: {
        fromZone: { select: { id: true, zoneName: true, zoneCode: true } },
        toZone: { select: { id: true, zoneName: true, zoneCode: true } },
      },
    });
  }

  /**
   * Find which active zones contain a given lat/lng point. Uses PostGIS
   * `ST_Contains` so a single SQL pass scans all zones — fast even at
   * thousands of polygons once the GIST index is added later.
   *
   * Returns zones from smallest to largest containing area, so callers
   * (signup form, marketplace filter) can pick the most specific zone.
   */
  async lookupByPoint(lat: number, lng: number) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new NotFoundException('Invalid coordinates');
    }
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        zoneCode: string;
        zoneName: string;
        zoneNameAr: string | null;
        zoneLevel: string;
        boundaryGeoJson: any;
        area: number;
      }>
    >`
      SELECT
        id,
        zone_code        AS "zoneCode",
        zone_name        AS "zoneName",
        zone_name_ar     AS "zoneNameAr",
        zone_level::text AS "zoneLevel",
        boundary_geo_json AS "boundaryGeoJson",
        ST_Area(ST_GeomFromGeoJSON(boundary_geo_json::text))::float8 AS area
      FROM geo_zones
      WHERE status = 'ACTIVE'
        AND boundary_geo_json IS NOT NULL
        AND ST_Contains(
          ST_GeomFromGeoJSON(boundary_geo_json::text),
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        )
      ORDER BY area ASC
      LIMIT 10
    `;
    return rows;
  }

  /** Naive centroid of GeoJSON Polygon outer ring — only used when admin
   *  draws a polygon but doesn't manually provide centroidLat/Lng. */
  private centroidOfGeoJson(geo: any, axis: 'lat' | 'lng' = 'lat'): number | undefined {
    if (!geo?.coordinates) return undefined;
    let ring: number[][];
    if (geo.type === 'Polygon') ring = geo.coordinates[0];
    else if (geo.type === 'MultiPolygon') ring = geo.coordinates[0]?.[0];
    else return undefined;
    if (!ring?.length) return undefined;
    const idx = axis === 'lat' ? 1 : 0; // GeoJSON is [lng, lat]
    const sum = ring.reduce((acc, p) => acc + p[idx], 0);
    return sum / ring.length;
  }

  async getCapacityStats(zoneId: string, days: number) {
    await this.findOne(zoneId);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    fromDate.setHours(0, 0, 0, 0);

    const logs = await this.prisma.zoneCapacityLog.findMany({
      where: { zoneId, recordedAt: { gte: fromDate } },
      orderBy: { recordedAt: 'asc' },
    });

    const avgUtilization =
      logs.length > 0
        ? logs.reduce((sum, log) => sum + Number(log.utilizationPct ?? 0), 0) / logs.length
        : 0;

    return {
      zoneId,
      days,
      logs,
      summary: {
        totalDays: logs.length,
        averageUtilizationPct: Math.round(avgUtilization * 100) / 100,
        peakUtilizationPct:
          logs.length > 0 ? Math.max(...logs.map((l) => Number(l.utilizationPct ?? 0))) : 0,
      },
    };
  }
}

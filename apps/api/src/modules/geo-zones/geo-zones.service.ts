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
        centroidLat: dto.centroidLat,
        centroidLng: dto.centroidLng,
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

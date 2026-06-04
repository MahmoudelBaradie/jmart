import { Injectable, NotFoundException } from '@nestjs/common';
import { WarehouseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

export interface CreateWarehouseDto {
  warehouseCode: string;
  warehouseName: string;
  geoZoneId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  totalCapacityM3?: number;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  managerId?: string;
}

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; status?: WarehouseStatus; geoZoneId?: string }) {
    const where: Prisma.WarehouseWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.geoZoneId && { geoZoneId: dto.geoZoneId }),
      ...(dto.search && {
        OR: [
          { warehouseName: { contains: dto.search, mode: 'insensitive' } },
          { warehouseCode: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          geoZone: { select: { zoneName: true, zoneCode: true } },
          manager: { select: { fullName: true } },
          _count: { select: { inventoryLots: true } },
        },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        geoZone: { select: { zoneName: true } },
        manager: { select: { id: true, fullName: true } },
        sections: true,
        _count: { select: { inventoryLots: true } },
      },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({ data: dto as any });
  }

  async update(id: string, dto: Partial<CreateWarehouseDto>) {
    await this.findOne(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto as any });
  }

  async logTemperature(warehouseId: string, dto: { sectionId?: string; temperatureC: number; humidityPct?: number }) {
    if (!dto.sectionId) {
      const firstSection = await this.prisma.warehouseSection.findFirst({
        where: { warehouseId },
      });
      dto.sectionId = firstSection?.id;
    }
    return this.prisma.temperatureLog.create({
      data: {
        sectionId: dto.sectionId,
        temperatureC: dto.temperatureC,
        humidityPct: dto.humidityPct,
        recordedAt: new Date(),
      } as any,
    });
  }

  async getTemperatureHistory(warehouseId: string, hours: number) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const sections = await this.prisma.warehouseSection.findMany({
      where: { warehouseId },
      select: { id: true },
    });
    const sectionIds = sections.map((s) => s.id);
    return this.prisma.temperatureLog.findMany({
      where: { sectionId: { in: sectionIds }, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getInventory(warehouseId: string, dto: { page?: number; limit?: number }) {
    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.inventoryLot.findMany({
        where: { warehouseId },
        skip,
        take,
        include: {
          farmer: { select: { businessName: true } },
          product: { select: { name: true, sku: true } },
        },
      }),
      this.prisma.inventoryLot.count({ where: { warehouseId } }),
    ]);
    return paginate(data, total, dto);
  }

  async getStats() {
    const [total, active, sectionStats] = await Promise.all([
      this.prisma.warehouse.count(),
      this.prisma.warehouse.count({ where: { status: WarehouseStatus.ACTIVE } }),
      this.prisma.warehouseSection.aggregate({
        _sum: { capacityM3: true, usedM3: true },
      }),
    ]);

    const totalCap = Number(sectionStats._sum.capacityM3 ?? 0);
    const usedCap = Number(sectionStats._sum.usedM3 ?? 0);

    return {
      total,
      active,
      totalCapacityM3: totalCap,
      usedCapacityM3: usedCap,
      utilizationPct: totalCap > 0 ? Math.round((usedCap / totalCap) * 100 * 10) / 10 : 0,
    };
  }
}

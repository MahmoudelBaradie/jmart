import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentStatus, VehicleType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateShipmentNumber } from '../../common/utils/number-generator.util';

export interface ShipmentFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ShipmentStatus;
  driverId?: string;
  orderId?: string;
}

export interface CreateShipmentDto {
  orderId: string;
  vehicleType?: VehicleType;
  scheduledPickup?: Date;
  scheduledDelivery?: Date;
  pickupAddress?: string;
  pickupZoneId?: string;
  deliveryAddress?: string;
  deliveryZoneId?: string;
  weightKg?: number;
  internalNotes?: string;
}

export interface AssignDriverDto {
  driverId: string;
  shippingCompanyId?: string;
  vehiclePlate?: string;
  scheduledPickup?: Date;
}

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ShipmentFilterDto) {
    const where: Prisma.ShipmentWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.driverId && { driverId: dto.driverId }),
      ...(dto.orderId && { orderId: dto.orderId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip: ((dto.page ?? 1) - 1) * (dto.limit ?? 20),
        take: dto.limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, totalAmount: true } },
          driver: { select: { fullName: true, vehiclePlate: true } },
          shippingCompany: { select: { companyName: true } },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true, buyerId: true } },
        driver: { select: { id: true, fullName: true, vehiclePlate: true, vehicleType: true } },
        shippingCompany: { select: { companyName: true } },
        trips: true,
      },
    });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    return shipment;
  }

  async create(dto: CreateShipmentDto) {
    const shipmentNumber = await generateShipmentNumber(this.prisma);
    return this.prisma.shipment.create({
      data: {
        shipmentNumber,
        orderId: dto.orderId,
        vehicleType: dto.vehicleType,
        estimatedPickupAt: dto.scheduledPickup,
        estimatedDeliveryAt: dto.scheduledDelivery,
        pickupAddress: dto.pickupAddress ?? '',
        pickupZoneId: dto.pickupZoneId ?? '',
        deliveryAddress: dto.deliveryAddress ?? '',
        deliveryZoneId: dto.deliveryZoneId ?? '',
        logisticsFee: 0,
        declaredWeightKg: dto.weightKg,
        internalNotes: dto.internalNotes,
        status: ShipmentStatus.PENDING_DRIVER,
      } as any,
    });
  }

  async update(id: string, dto: Partial<any>) {
    await this.findOne(id);
    return this.prisma.shipment.update({ where: { id }, data: dto });
  }

  async assignDriver(id: string, dto: AssignDriverDto) {
    await this.findOne(id);
    return this.prisma.shipment.update({
      where: { id },
      data: {
        driverId: dto.driverId,
        shippingCompanyId: dto.shippingCompanyId,
        estimatedPickupAt: dto.scheduledPickup,
        status: ShipmentStatus.DRIVER_ASSIGNED,
      },
    });
  }

  async updateStatus(id: string, status: ShipmentStatus, notes?: string) {
    await this.findOne(id);
    const data: Prisma.ShipmentUpdateInput = { status };
    if (notes) data.internalNotes = notes;
    if (status === ShipmentStatus.DELIVERED) data.actualDeliveryAt = new Date();
    if (status === ShipmentStatus.LOADING) data.actualPickupAt = new Date();
    return this.prisma.shipment.update({ where: { id }, data });
  }

  async getDriverShipments(driverId: string, dto: any) {
    return this.findAll({ ...dto, driverId });
  }

  async getAvailableDrivers(zoneId?: string) {
    const where: Prisma.DriverWhereInput = {
      status: 'ACTIVE' as any,
      ...(zoneId && { zoneAssignments: { some: { zoneId } } }),
    };

    return this.prisma.driver.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        vehicleType: true,
        vehiclePlate: true,
        vehicleCapacityKg: true,
        hasRefrigeration: true,
        shippingCompany: { select: { companyName: true } },
      },
    });
  }

  async getStats() {
    const counts = await this.prisma.shipment.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  }
}


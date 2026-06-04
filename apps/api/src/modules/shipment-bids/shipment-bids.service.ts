/**
 * ShipmentBids service — open marketplace for independent drivers to bid on
 * shipments and for buyers to pick the winning bid.
 *
 * Lifecycle:
 *   1. Order CONFIRMED + needs shipping → Shipment created in AWAITING_BIDS
 *   2. createOpenShipment() notifies eligible drivers (zone match)
 *   3. Drivers submitBid({ price, ETA })
 *   4. Buyer acceptBid(bidId) → other bids auto-rejected, shipment assigned
 *
 * Authorization is enforced at the service layer (not just controller):
 *   - submitBid: only the driver themselves
 *   - acceptBid: only the buyer who owns the underlying order
 *   - withdraw: only the driver who placed the bid
 *
 * All multi-row updates run inside `$transaction` for atomicity.
 */
import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentStatus, ShipmentBidStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SubmitBidDto {
  quotedPrice: number;
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  vehicleType?: string;
  capacityKg?: number;
  notes?: string;
}

@Injectable()
export class ShipmentBidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Driver submits an offer for an open shipment. */
  async submitBid(shipmentId: string, driverId: string, dto: SubmitBidDto) {
    if (!(dto.quotedPrice > 0)) {
      throw new BadRequestException('السعر المعروض يجب أن يكون أكبر من صفر');
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { select: { id: true, buyerId: true } } },
    });
    if (!shipment) throw new NotFoundException('الشحنة غير موجودة');
    if (shipment.status !== ShipmentStatus.AWAITING_BIDS) {
      throw new BadRequestException('هذه الشحنة لم تعد مفتوحة للعروض');
    }

    // Optional: enforce driver zone eligibility (pickup OR delivery zone)
    const eligible = await this.prisma.driverZoneAssignment.findFirst({
      where: {
        driverId,
        OR: [
          { zoneId: shipment.pickupZoneId,   canPickup:  true },
          { zoneId: shipment.deliveryZoneId, canDeliver: true },
        ],
      },
    });
    // Soft guard — we don't block bidding entirely (driver may be cross-zone),
    // but we flag uneligible ones so the buyer can prioritise local drivers.
    // (If you want strict, change to `if (!eligible) throw ...`)

    try {
      const bid = await this.prisma.shipmentBid.create({
        data: {
          shipmentId,
          driverId,
          quotedPrice: dto.quotedPrice,
          estimatedPickupAt:   dto.estimatedPickupAt   ? new Date(dto.estimatedPickupAt)   : null,
          estimatedDeliveryAt: dto.estimatedDeliveryAt ? new Date(dto.estimatedDeliveryAt) : null,
          vehicleType: dto.vehicleType as any,
          capacityKg:  dto.capacityKg,
          notes:       dto.notes,
        },
        include: { driver: { select: { fullName: true, ratingAvg: true } } },
      });

      // Tell the buyer a new bid arrived
      this.eventEmitter.emit('shipment.bid.created', {
        shipmentId,
        bidId: bid.id,
        buyerId: shipment.order.buyerId,
        quotedPrice: Number(bid.quotedPrice),
        driverName: (bid as any).driver?.fullName,
        eligible: !!eligible,
      });

      return { ...bid, eligible: !!eligible };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('لقد قدّمت عرضاً بالفعل لهذه الشحنة. يمكنك سحب العرض السابق ثم تقديم عرض جديد.');
      }
      throw e;
    }
  }

  /** Driver withdraws their pending bid. */
  async withdrawBid(bidId: string, driverId: string) {
    const bid = await this.prisma.shipmentBid.findUnique({ where: { id: bidId } });
    if (!bid) throw new NotFoundException('العرض غير موجود');
    if (bid.driverId !== driverId) throw new ForbiddenException('ليس عرضك');
    if (bid.status !== ShipmentBidStatus.PENDING) {
      throw new BadRequestException(`لا يمكن سحب عرض بحالة ${bid.status}`);
    }
    return this.prisma.shipmentBid.update({
      where: { id: bidId },
      data: { status: ShipmentBidStatus.WITHDRAWN, decidedAt: new Date() },
    });
  }

  /** Public read for buyer / admin — list bids on a shipment. */
  async listBidsForShipment(shipmentId: string, caller: { buyerId?: string | null; internalUserId?: string | null }) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { select: { buyerId: true } } },
    });
    if (!shipment) throw new NotFoundException('الشحنة غير موجودة');
    if (!caller.internalUserId && shipment.order.buyerId !== caller.buyerId) {
      throw new ForbiddenException('ليس لديك صلاحية مشاهدة العروض على هذه الشحنة');
    }
    return this.prisma.shipmentBid.findMany({
      where: { shipmentId },
      include: {
        driver: {
          select: {
            id: true, fullName: true, ratingAvg: true, ratingCount: true,
            vehicleType: true, vehicleCapacityKg: true, hasRefrigeration: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { quotedPrice: 'asc' }],
    });
  }

  /** Driver lists THEIR bids (across shipments). */
  async listMyBids(driverId: string, status?: ShipmentBidStatus) {
    return this.prisma.shipmentBid.findMany({
      where: { driverId, ...(status && { status }) },
      include: {
        shipment: {
          select: {
            id: true, shipmentNumber: true, status: true,
            pickupZoneId: true, deliveryZoneId: true,
            declaredWeightKg: true, estimatedPickupAt: true,
            order: { select: { orderNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Open shipments still awaiting bids — feed for the driver app. */
  async listOpenShipments(driverId: string) {
    const shipments = await this.prisma.shipment.findMany({
      where: {
        status: ShipmentStatus.AWAITING_BIDS,
        // Skip shipments where this driver already has a non-rejected bid
        NOT: {
          bids: {
            some: {
              driverId,
              status: { in: [ShipmentBidStatus.PENDING, ShipmentBidStatus.ACCEPTED] },
            },
          },
        },
      },
      include: {
        order: { select: { orderNumber: true, deliveryAddress: true } },
        pickupZone: { select: { zoneName: true, zoneNameAr: true } },
        deliveryZone: { select: { zoneName: true, zoneNameAr: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Annotate with the driver's zone eligibility
    const driverZones = await this.prisma.driverZoneAssignment.findMany({
      where: { driverId },
      select: { zoneId: true, canPickup: true, canDeliver: true },
    });
    const pickupZones   = new Set(driverZones.filter((z) => z.canPickup).map((z) => z.zoneId));
    const deliveryZones = new Set(driverZones.filter((z) => z.canDeliver).map((z) => z.zoneId));

    return shipments.map((s) => ({
      ...s,
      eligibility: {
        pickup:   pickupZones.has(s.pickupZoneId),
        delivery: deliveryZones.has(s.deliveryZoneId),
      },
    }));
  }

  /**
   * Buyer accepts a bid:
   *   - Mark this bid ACCEPTED
   *   - Mark all other PENDING bids on the same shipment REJECTED
   *   - Set shipment.driverId, status → DRIVER_ASSIGNED
   *   - Update shipment.logisticsFee from the bid
   * All in one transaction.
   */
  async acceptBid(bidId: string, caller: { buyerId?: string | null; internalUserId?: string | null }) {
    const bid = await this.prisma.shipmentBid.findUnique({
      where: { id: bidId },
      include: { shipment: { include: { order: { select: { buyerId: true } } } } },
    });
    if (!bid) throw new NotFoundException('العرض غير موجود');
    if (bid.status !== ShipmentBidStatus.PENDING) {
      throw new BadRequestException(`لا يمكن قبول عرض بحالة ${bid.status}`);
    }
    if (bid.shipment.status !== ShipmentStatus.AWAITING_BIDS) {
      throw new BadRequestException('الشحنة لم تعد مفتوحة للعروض');
    }
    if (!caller.internalUserId && bid.shipment.order.buyerId !== caller.buyerId) {
      throw new ForbiddenException('ليس لديك صلاحية قبول هذا العرض');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Accept this bid
      const accepted = await tx.shipmentBid.update({
        where: { id: bidId },
        data: {
          status: ShipmentBidStatus.ACCEPTED,
          decidedAt: new Date(),
          decidedById: caller.buyerId ?? caller.internalUserId ?? null,
        },
      });

      // 2) Reject all other pending bids on this shipment
      const rejection = await tx.shipmentBid.updateMany({
        where: {
          shipmentId: bid.shipmentId,
          status: ShipmentBidStatus.PENDING,
          NOT: { id: bidId },
        },
        data: {
          status: ShipmentBidStatus.REJECTED,
          decidedAt: new Date(),
          decidedById: caller.buyerId ?? caller.internalUserId ?? null,
        },
      });

      // 3) Assign shipment to the winning driver
      const shipment = await tx.shipment.update({
        where: { id: bid.shipmentId },
        data: {
          driverId: bid.driverId,
          status: ShipmentStatus.DRIVER_ASSIGNED,
          logisticsFee: bid.quotedPrice,
          estimatedPickupAt:   bid.estimatedPickupAt   ?? undefined,
          estimatedDeliveryAt: bid.estimatedDeliveryAt ?? undefined,
          vehicleType: bid.vehicleType ?? undefined,
        },
      });

      return { accepted, rejectedCount: rejection.count, shipment };
    });

    // Fan-out notifications
    this.eventEmitter.emit('shipment.bid.accepted', {
      shipmentId: bid.shipmentId,
      winningDriverId: bid.driverId,
      losingBidIds: [], // TODO: include list if downstream needs them
      logisticsFee: Number(bid.quotedPrice),
    });

    return result;
  }
}

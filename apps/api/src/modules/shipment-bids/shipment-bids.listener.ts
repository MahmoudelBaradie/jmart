/**
 * Event listeners that bridge order/shipment lifecycle into the bidding flow.
 *
 *   order.status.changed → CONFIRMED
 *     → ensure a Shipment exists in AWAITING_BIDS
 *     → emit notification fan-out to eligible drivers
 *
 *   shipment.bid.created
 *     → notify the buyer that a new bid arrived
 *
 *   shipment.bid.accepted
 *     → notify the winning driver
 *     → notify the losing drivers (best-effort)
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, ShipmentStatus, ShipmentBidStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateShipmentNumber } from '../../common/utils/number-generator.util';

@Injectable()
export class ShipmentBidsListener {
  private readonly log = new Logger(ShipmentBidsListener.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * When an order transitions to CONFIRMED, make sure a Shipment is open for
   * bidding. Idempotent — safe to re-run.
   */
  @OnEvent('order.status.changed')
  async onOrderStatusChanged(payload: { orderId: string; toStatus: OrderStatus }) {
    if (payload.toStatus !== OrderStatus.CONFIRMED) return;

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: { select: { requestedQty: true } },
        shipment: { select: { id: true, status: true } },
      },
    });
    if (!order) return;

    // Already has a shipment — don't duplicate.
    if (order.shipment) {
      this.log.debug(`Order ${order.orderNumber} already has shipment ${order.shipment.id}`);
      return;
    }

    const totalWeightKg = order.items.reduce((s, it) => s + Number(it.requestedQty), 0);
    const shipmentNumber = await generateShipmentNumber(this.prisma);

    const shipment = await this.prisma.shipment.create({
      data: {
        shipmentNumber,
        orderId: order.id,
        pickupZoneId: order.pickupZoneId,
        deliveryZoneId: order.deliveryZoneId,
        pickupAddress: order.pickupAddress ?? '—',
        deliveryAddress: order.deliveryAddress ?? '—',
        declaredWeightKg: totalWeightKg,
        logisticsFee: 0, // set after a bid is accepted
        status: ShipmentStatus.AWAITING_BIDS,
      },
    });
    this.log.log(`📦 Shipment ${shipment.shipmentNumber} opened for bidding (${totalWeightKg} kg)`);

    // Fan-out: notify drivers eligible for either zone
    await this.notifyEligibleDrivers(shipment.id, order.pickupZoneId, order.deliveryZoneId);
  }

  @OnEvent('shipment.bid.created')
  async onBidCreated(payload: {
    shipmentId: string; bidId: string; buyerId: string;
    quotedPrice: number; driverName?: string;
  }) {
    // The buyer's profile may not have a userId — look it up.
    const buyer = await this.prisma.buyer.findUnique({
      where: { id: payload.buyerId },
      select: { userId: true },
    });
    if (!buyer) return;

    await this.prisma.notification.create({
      data: {
        recipientId: buyer.userId,
        recipientType: 'USER',
        type: 'SHIPMENT_BID_RECEIVED' as any, // soft-typed enum (extend NotificationType in schema if needed)
        titleAr: 'عرض شحن جديد',
        bodyAr: `استلمت عرضاً جديداً بقيمة ${payload.quotedPrice} ر.س ${payload.driverName ? `من ${payload.driverName}` : ''} على شحنتك.`,
        channels: ['IN_APP'],
        payload: { shipmentId: payload.shipmentId, bidId: payload.bidId },
      } as any,
    }).catch((e) => this.log.warn(`Could not create bid notification: ${e.message}`));
  }

  @OnEvent('shipment.bid.accepted')
  async onBidAccepted(payload: { shipmentId: string; winningDriverId: string; logisticsFee: number }) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: payload.winningDriverId },
      select: { userId: true },
    });
    if (driver) {
      await this.prisma.notification.create({
        data: {
          recipientId: driver.userId,
          recipientType: 'USER',
          type: 'SHIPMENT_BID_ACCEPTED' as any,
          titleAr: 'تم قبول عرضك',
          bodyAr: `تهانينا! تم قبول عرضك بقيمة ${payload.logisticsFee} ر.س. يمكنك بدء التحضير للاستلام.`,
          channels: ['IN_APP'],
          payload: { shipmentId: payload.shipmentId },
        } as any,
      }).catch((e) => this.log.warn(`Could not notify winning driver: ${e.message}`));
    }

    // Notify losing drivers — best-effort
    const losers = await this.prisma.shipmentBid.findMany({
      where: { shipmentId: payload.shipmentId, status: ShipmentBidStatus.REJECTED, NOT: { driverId: payload.winningDriverId } },
      select: { driverId: true, driver: { select: { userId: true } } },
    });
    for (const l of losers) {
      await this.prisma.notification.create({
        data: {
          recipientId: l.driver.userId,
          recipientType: 'USER',
          type: 'SHIPMENT_BID_REJECTED' as any,
          titleAr: 'عرضك لم يُقبَل',
          bodyAr: 'تم اختيار عرض آخر لهذه الشحنة. شكراً لمشاركتك.',
          channels: ['IN_APP'],
          payload: { shipmentId: payload.shipmentId },
        } as any,
      }).catch(() => undefined);
    }
  }

  private async notifyEligibleDrivers(shipmentId: string, pickupZoneId: string, deliveryZoneId: string) {
    const assignments = await this.prisma.driverZoneAssignment.findMany({
      where: {
        OR: [
          { zoneId: pickupZoneId,   canPickup:  true },
          { zoneId: deliveryZoneId, canDeliver: true },
        ],
      },
      select: { driver: { select: { userId: true, status: true } } },
    });
    const userIds = Array.from(new Set(
      assignments
        .filter((a) => a.driver.status === 'ACTIVE')
        .map((a) => a.driver.userId),
    ));
    if (userIds.length === 0) {
      this.log.warn(`No eligible drivers found for shipment ${shipmentId}`);
      return;
    }

    await this.prisma.notification.createMany({
      data: userIds.map((uid) => ({
        recipientId: uid,
        recipientType: 'USER',
        type: 'SHIPMENT_BID_REQUESTED' as any,
        titleAr: 'فرصة شحن جديدة',
        bodyAr: 'هناك شحنة جديدة بحاجة لعرض سعر. افتح التطبيق لرؤية التفاصيل والتقدّم بعرضك.',
        channels: ['IN_APP'],
        payload: { shipmentId },
      })) as any,
    }).catch((e) => this.log.warn(`Could not fan-out driver notifications: ${e.message}`));

    this.log.log(`🔔 Notified ${userIds.length} eligible drivers for shipment ${shipmentId}`);
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateOrderNumber } from '../../common/utils/number-generator.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

export interface OrderFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: OrderStatus;
  buyerId?: string;
  farmerId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(dto: OrderFilterDto) {
    const where: Prisma.OrderWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.buyerId && { buyerId: dto.buyerId }),
      ...(dto.farmerId && {
        items: { some: { farmerId: dto.farmerId } },
      }),
      ...(dto.from || dto.to
        ? {
            createdAt: {
              ...(dto.from && { gte: dto.from }),
              ...(dto.to && { lte: dto.to }),
            },
          }
        : {}),
      ...(dto.search && {
        OR: [
          { orderNumber: { contains: dto.search, mode: 'insensitive' } },
          { deliveryAddress: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: dto.sortOrder ?? 'desc' },
        include: {
          buyer: {
            select: { id: true, businessName: true, contactPersonName: true },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, businessName: true, contactPersonName: true, contactPhone: true },
        },
        buyerBranch: true,
        items: {
          include: {
            product: { select: { id: true, name: true, category: true, unitOfMeasure: true } },
            farmer: { select: { id: true, businessName: true, contactPersonName: true } },
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
        shipment: {
          select: {
            id: true,
            shipmentNumber: true,
            status: true,
            estimatedDeliveryAt: true,
            actualDeliveryAt: true,
          },
        },
        invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
        contract: { select: { id: true, contractNumber: true, status: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Authorization gate for reading a single order. Internal users see all;
   * buyer sees only their own order; farmer sees only orders containing
   * their items. Driver of the assigned shipment also passes.
   * Returns the loaded order.
   */
  async findOneAuthorized(id: string, caller: {
    internalUserId?: string | null;
    buyerId?: string | null;
    farmerId?: string | null;
    driverId?: string | null;
  }) {
    const order: any = await this.findOne(id);
    if (caller.internalUserId) return order;
    if (caller.buyerId && order.buyerId === caller.buyerId) return order;
    if (caller.farmerId && Array.isArray(order.items)
        && order.items.some((it: any) => it.farmerId === caller.farmerId)) return order;
    if (caller.driverId && order.shipment && (order.shipment as any).driverId === caller.driverId) return order;
    throw new ForbiddenException('Not allowed to view this order');
  }

  async create(buyerId: string, dto: CreateOrderDto) {
    // ── Resolve authoritative prices + validate inventory BEFORE writing ──
    // SECURITY: never trust the client-supplied pricePerKg. The real price
    // comes from the farmer's catalog item. Quantities are validated against
    // (and later reserved from) live lot stock.
    type ResolvedItem = {
      farmerId: string; productId: string; grade: string; packaging: string;
      lotId?: string; requestedQty: number; unitPrice: number; lineTotal: number;
      catalogItemId?: string; notes?: string;
    };
    const resolved: ResolvedItem[] = [];

    for (const item of dto.items) {
      const qty = Number(item.requestedQtyKg);
      if (!(qty > 0)) {
        throw new BadRequestException('الكمية المطلوبة يجب أن تكون أكبر من صفر');
      }

      // 1) authoritative price from the catalog (farmer + product + grade + packaging)
      // ── CENTRALISED PRICING ────────────────────────────────────────────
      // SECURITY/BUSINESS RULE: the authoritative price lives on Product
      // (set by Admin). FarmerCatalogItem.pricePerUnit is now legacy and is
      // ONLY used as a fallback for products that haven't been priced yet
      // (transition period). Farmers cannot influence the order price.
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, nameAr: true, name: true, pricePerUnit: true, isActive: true },
      });
      if (!product || !product.isActive) {
        throw new BadRequestException(`المنتج غير متاح للطلب (${item.productId}).`);
      }

      let unitPrice = product.pricePerUnit != null ? Number(product.pricePerUnit) : NaN;
      let catalogItem: { id: string; pricePerUnit: any } | null = null;

      if (!(unitPrice > 0)) {
        // Fallback: use the farmer's catalog price for products awaiting
        // admin pricing. Once admin sets the price, this branch is skipped.
        catalogItem = await this.prisma.farmerCatalogItem.findFirst({
          where: {
            farmerId: item.farmerId,
            productId: item.productId,
            grade: item.grade,
            OR: [{ packagingType: item.packaging }, { packagingType: null }],
            isListed: true,
          },
          orderBy: { packagingType: 'desc' },
          select: { id: true, pricePerUnit: true },
        });
        unitPrice = catalogItem ? Number(catalogItem.pricePerUnit) : NaN;
        if (!(unitPrice > 0)) {
          throw new BadRequestException(
            `لم يتم تحديد سعر هذا المنتج (${product.nameAr ?? product.name}) من قبل الإدارة بعد. لا يمكن إتمام الطلب.`,
          );
        }
      } else {
        // Still resolve the farmer's catalogItem id (for reservation linkage)
        catalogItem = await this.prisma.farmerCatalogItem.findFirst({
          where: {
            farmerId: item.farmerId,
            productId: item.productId,
            grade: item.grade,
            OR: [{ packagingType: item.packaging }, { packagingType: null }],
          },
          orderBy: { packagingType: 'desc' },
          select: { id: true, pricePerUnit: true },
        });
      }

      // 2) inventory validation when a lot is specified
      if (item.lotId) {
        const lot = await this.prisma.inventoryLot.findUnique({ where: { id: item.lotId } });
        if (!lot) throw new BadRequestException('العرض (اللوت) غير موجود');
        if (lot.farmerId !== item.farmerId) {
          throw new BadRequestException('العرض لا يخص هذا المزارع');
        }
        if (lot.status !== 'AVAILABLE') {
          throw new BadRequestException('هذا العرض غير متاح للطلب حالياً');
        }
        if (Number(lot.qtyAvailable) < qty) {
          throw new BadRequestException(
            `الكمية المطلوبة (${qty} كجم) تتجاوز المتاح (${Number(lot.qtyAvailable)} كجم)`,
          );
        }
      }

      resolved.push({
        farmerId: item.farmerId,
        productId: item.productId,
        grade: item.grade,
        packaging: item.packaging,
        lotId: item.lotId,
        requestedQty: qty,
        unitPrice,
        lineTotal: qty * unitPrice,
        catalogItemId: catalogItem?.id,
        notes: (item as any).notes,
      });
    }

    const subtotal = resolved.reduce((sum, it) => sum + it.lineTotal, 0);
    const totalAmount = subtotal;
    const orderNumber = await generateOrderNumber(this.prisma);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          buyerId,
          buyerBranchId: dto.branchId ?? null,
          orderType: dto.orderType ?? OrderType.SPOT,
          pickupZoneId: dto.pickupZoneId,
          deliveryZoneId: dto.deliveryZoneId,
          deliveryAddress: dto.deliveryAddress,
          requestedDeliveryAt: dto.requestedDeliveryDate ? new Date(dto.requestedDeliveryDate) : null,
          buyerNotes: dto.notes ?? null,
          subtotal,
          totalAmount,
          items: {
            create: resolved.map((it) => ({
              farmerId: it.farmerId,
              productId: it.productId,
              catalogItemId: it.catalogItemId ?? null,
              grade: it.grade,
              packagingType: it.packaging,
              requestedQty: it.requestedQty,
              unitPrice: it.unitPrice,
              pricedLockedAt: new Date(),
              subtotal: it.lineTotal,
              notes: it.notes ?? null,
            })),
          },
        },
        include: {
          items: true,
          buyer: { select: { id: true, businessName: true } },
        },
      });

      // ── Reserve inventory: decrement available, bump reserved, log reservation ──
      // Prisma's nested-create may not preserve our `resolved` array order in
      // `created.items`. Build a deterministic match by sorting on a stable
      // composite key (farmerId + productId + grade + packaging + lineTotal).
      // That uniquely identifies a line within a single order; two lines
      // sharing the entire composite are merged at the cart layer already.
      const keyOf = (x: any) =>
        `${x.farmerId}|${x.productId}|${x.grade}|${x.packagingType ?? x.packaging ?? ''}|${Number(x.subtotal ?? x.lineTotal)}`;
      const itemsByKey = new Map<string, typeof created.items[number]>();
      for (const oi of created.items) itemsByKey.set(keyOf(oi), oi);

      for (const it of resolved) {
        if (!it.lotId) continue;
        const orderItem = itemsByKey.get(keyOf(it));
        if (!orderItem) continue;

        // Conditional decrement guards against a concurrent over-sell race
        const dec = await tx.inventoryLot.updateMany({
          where: { id: it.lotId, qtyAvailable: { gte: it.requestedQty } },
          data: {
            qtyAvailable: { decrement: it.requestedQty },
            qtyReserved: { increment: it.requestedQty },
          },
        });
        if (dec.count === 0) {
          // Someone else grabbed the stock between validation and commit
          throw new BadRequestException('نفدت كمية أحد العروض أثناء معالجة الطلب، يرجى المحاولة مجدداً');
        }

        await tx.lotReservation.create({
          data: {
            lotId: it.lotId,
            orderId: created.id,
            orderItemId: orderItem.id,
            qtyReserved: it.requestedQty,
            status: 'ACTIVE',
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: created.id,
          fromStatus: null,
          toStatus: OrderStatus.DRAFT,
          changedById: buyerId,
          changedByType: 'BUYER',
          reason: 'Order created',
        },
      });

      return created;
    });

    this.eventEmitter.emit('order.created', { orderId: order.id, buyerId });
    return order;
  }

  /**
   * Release all ACTIVE lot reservations for an order back to available stock.
   * Used when an order is cancelled or rejected. Must run inside a tx.
   */
  private async releaseReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.lotReservation.findMany({
      where: { orderId, status: 'ACTIVE' },
    });
    for (const r of reservations) {
      await tx.inventoryLot.update({
        where: { id: r.lotId },
        data: {
          qtyAvailable: { increment: r.qtyReserved },
          qtyReserved: { decrement: r.qtyReserved },
        },
      });
      await tx.lotReservation.update({
        where: { id: r.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }
  }

  // ── Farmer accept / reject ──────────────────────────────────────
  /** Farmer confirms an order that contains at least one of their items. */
  async acceptOrder(id: string, farmerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { select: { farmerId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const ownsItem = order.items.some((i) => i.farmerId === farmerId);
    if (!ownsItem) throw new ForbiddenException('هذا الطلب لا يحتوي على منتجاتك');

    const acceptable: OrderStatus[] = [
      OrderStatus.DRAFT, OrderStatus.SUBMITTED,
      OrderStatus.PENDING_ASSIGNMENT, OrderStatus.PENDING_SUPPLIER_CONFIRMATION,
    ];
    if (!acceptable.includes(order.status)) {
      throw new BadRequestException(`لا يمكن قبول طلب في حالة ${order.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CONFIRMED },
      });
      await tx.orderItem.updateMany({
        where: { orderId: id, farmerId },
        data: { status: 'CONFIRMED' },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: OrderStatus.CONFIRMED, changedById: farmerId, changedByType: 'FARMER', reason: 'المزارع قبل الطلب' },
      });
      return result;
    });
    this.eventEmitter.emit('order.status.changed', { orderId: id, fromStatus: order.status, toStatus: OrderStatus.CONFIRMED, changedById: farmerId });
    return updated;
  }

  /** Farmer rejects an order — cancels it and releases reserved stock. */
  async rejectOrder(id: string, farmerId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { select: { farmerId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const ownsItem = order.items.some((i) => i.farmerId === farmerId);
    if (!ownsItem) throw new ForbiddenException('هذا الطلب لا يحتوي على منتجاتك');

    const rejectable: OrderStatus[] = [
      OrderStatus.DRAFT, OrderStatus.SUBMITTED,
      OrderStatus.PENDING_ASSIGNMENT, OrderStatus.PENDING_SUPPLIER_CONFIRMATION,
    ];
    if (!rejectable.includes(order.status)) {
      throw new BadRequestException(`لا يمكن رفض طلب في حالة ${order.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.releaseReservations(tx, id);
      const result = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, cancellationReason: reason || 'رفض المزارع الطلب' },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: OrderStatus.CANCELLED, changedById: farmerId, changedByType: 'FARMER', reason: reason || 'رفض المزارع الطلب' },
      });
      return result;
    });
    this.eventEmitter.emit('order.status.changed', { orderId: id, fromStatus: order.status, toStatus: OrderStatus.CANCELLED, changedById: farmerId });
    return updated;
  }

  async submit(id: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit order in status ${order.status}. Must be DRAFT.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.SUBMITTED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: OrderStatus.DRAFT,
          toStatus: OrderStatus.SUBMITTED,
          changedById: buyerId,
          changedByType: 'BUYER',
          reason: 'Buyer submitted order',
        },
      });

      return result;
    });

    this.eventEmitter.emit('order.submitted', { orderId: id, buyerId });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, changedById: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    // ── Order status state-machine ──────────────────────────────────
    // Only transitions listed here are allowed. Prevents nonsensical jumps
    // (e.g. DELIVERED→DRAFT, or DRAFT straight to SETTLED). Forward jumps
    // that ops legitimately use (e.g. DRAFT→CONFIRMED for a quick order)
    // are permitted; backward and terminal-exit moves are blocked.
    const T = OrderStatus;
    const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
      [T.DRAFT]:                         [T.SUBMITTED, T.CONFIRMED, T.CANCELLED],
      [T.SUBMITTED]:                     [T.PENDING_ASSIGNMENT, T.PENDING_SUPPLIER_CONFIRMATION, T.CONFIRMED, T.CANCELLED],
      [T.PENDING_ASSIGNMENT]:            [T.PENDING_SUPPLIER_CONFIRMATION, T.CONFIRMED, T.CANCELLED],
      [T.PENDING_SUPPLIER_CONFIRMATION]: [T.CONFIRMED, T.CANCELLED],
      [T.CONFIRMED]:                     [T.DISPATCHED, T.IN_TRANSIT, T.CANCELLED, T.DISPUTED],
      [T.DISPATCHED]:                    [T.IN_TRANSIT, T.EXCEPTION, T.DISPUTED],
      [T.IN_TRANSIT]:                    [T.DELIVERED, T.EXCEPTION, T.DISPUTED],
      [T.DELIVERED]:                     [T.COMPLETED, T.DISPUTED],
      [T.COMPLETED]:                     [T.SETTLED, T.DISPUTED],
      [T.SETTLED]:                       [T.ARCHIVED],
      [T.DISPUTED]:                      [T.CONFIRMED, T.IN_TRANSIT, T.DELIVERED, T.COMPLETED, T.CANCELLED],
      [T.EXCEPTION]:                     [T.IN_TRANSIT, T.DELIVERED, T.CANCELLED],
      [T.CANCELLED]:                     [],
      [T.ARCHIVED]:                      [],
    };

    if (order.status === dto.status) {
      throw new BadRequestException(`الطلب بالفعل في حالة ${dto.status}`);
    }
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `انتقال غير مسموح: ${order.status} → ${dto.status}. ` +
        `الانتقالات المتاحة: ${allowed.length ? allowed.join(', ') : 'لا شيء (حالة نهائية)'}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Releasing stock if an internal cancel happens through this path
      if (dto.status === OrderStatus.CANCELLED) {
        await this.releaseReservations(tx, id);
      }

      const result = await tx.order.update({
        where: { id },
        data: { status: dto.status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          changedById,
          changedByType: 'INTERNAL',
          reason: dto.reason ?? null,
        },
      });

      return result;
    });

    this.eventEmitter.emit('order.status.changed', {
      orderId: id,
      fromStatus: order.status,
      toStatus: dto.status,
      changedById,
    });

    return updated;
  }

  async cancel(id: string, reason: string, changedById: string, caller?: {
    internalUserId?: string | null;
    buyerId?: string | null;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    // Ownership gate: internal users may cancel anything; otherwise the
    // caller MUST be the buyer who owns this order. Without this any
    // authenticated buyer could cancel any other buyer's orders.
    if (caller && !caller.internalUserId) {
      if (!caller.buyerId || caller.buyerId !== order.buyerId) {
        throw new ForbiddenException('Not allowed to cancel this order');
      }
    }

    const nonCancellableStatuses: OrderStatus[] = [
      OrderStatus.DISPATCHED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
      OrderStatus.SETTLED,
      OrderStatus.ARCHIVED,
      OrderStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in status ${order.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Return any reserved stock to availability before cancelling
      await this.releaseReservations(tx, id);

      const result = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedById,
          reason,
        },
      });

      return result;
    });

    this.eventEmitter.emit('order.status.changed', {
      orderId: id,
      fromStatus: order.status,
      toStatus: OrderStatus.CANCELLED,
      changedById,
    });

    return updated;
  }

  async getMyOrders(buyerId: string, dto: PaginationDto & { status?: OrderStatus }) {
    const where: Prisma.OrderWhereInput = {
      buyerId,
      ...(dto.status && { status: dto.status }),
      ...(dto.search && {
        OR: [
          { orderNumber: { contains: dto.search, mode: 'insensitive' } },
          { deliveryAddress: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: dto.skip,
        take: dto.take,
        orderBy: { createdAt: dto.sortOrder ?? 'desc' },
        include: {
          _count: { select: { items: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async getMyFarmerOrders(farmerId: string, dto: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; skip?: number; take?: number; status?: OrderStatus }) {
    const where: Prisma.OrderWhereInput = {
      items: { some: { farmerId } },
      ...(dto.status && { status: dto.status }),
      ...(dto.search && {
        OR: [
          { orderNumber: { contains: dto.search, mode: 'insensitive' } },
          { deliveryAddress: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: dto.skip,
        take: dto.take,
        orderBy: { createdAt: dto.sortOrder ?? 'desc' },
        include: {
          buyer: { select: { businessName: true } },
          _count: { select: { items: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async getStats() {
    const statuses = Object.values(OrderStatus);

    const counts = await Promise.all(
      statuses.map((status) =>
        this.prisma.order.count({ where: { status } }).then((count) => ({ status, count })),
      ),
    );

    const total = counts.reduce((sum, s) => sum + s.count, 0);
    const byStatus = counts.reduce<Record<string, number>>((acc, { status, count }) => {
      acc[status] = count;
      return acc;
    }, {});

    return { total, byStatus };
  }
}

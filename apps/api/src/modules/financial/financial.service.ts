import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { generateInvoiceNumber } from '../../common/utils/number-generator.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ApprovePayoutDto } from './dto/approve-payout.dto';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── INVOICES ────────────────────────────────────────────────────────────────

  async getInvoices(dto: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: InvoiceStatus;
    invoiceType?: InvoiceType;
    recipientId?: string;
  }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.invoiceType) where.invoiceType = dto.invoiceType;
    if (dto.recipientId) where.recipientId = dto.recipientId;
    if (dto.search) where.invoiceNumber = { contains: dto.search, mode: 'insensitive' };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, status: true, createdAt: true } },
          payments: { select: { id: true, amount: true, status: true, processedAt: true }, take: 5 },
        },
      }),
      this.prisma.invoice.count({ where }),
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

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, orderNumber: true, status: true, createdAt: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
    return invoice;
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const invoiceNumber = await generateInvoiceNumber(this.prisma);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: dto.orderId,
        invoiceType: dto.invoiceType,
        issuerId: dto.issuerId,
        issuerType: dto.issuerType ?? 'PLATFORM',
        recipientId: dto.recipientId,
        recipientType: dto.recipientType ?? 'BUYER',
        lineItems: dto.lineItems ?? [],
        subtotal: dto.subtotal,
        taxAmount: dto.taxAmount ?? 0,
        totalAmount: dto.totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: InvoiceStatus.DRAFT,
      } as any,
      include: { order: { select: { id: true, orderNumber: true } } },
    });
  }

  async issueInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(`Invoice cannot be issued — current status is ${invoice.status}`);
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, sentAt: new Date() },
    });
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, payerId: string) {
    // SECURITY: the read-then-write sequence MUST be serialized — two
    // concurrent payments could each see `alreadyPaid = X`, both pass the
    // ≤ total check, and both insert, overpaying the invoice. Wrap the
    // whole read+check+write in a Serializable transaction and use
    // Prisma.Decimal for monetary arithmetic (no JS float drift).
    const Decimal = Prisma.Decimal;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: { where: { status: PaymentStatus.COMPLETED } } },
      });
      if (!invoice) throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException(`Cannot record payment on an invoice with status ${invoice.status}`);
      }

      const alreadyPaid = invoice.payments.reduce(
        (sum, p) => sum.plus(new Decimal(p.amount as any)),
        new Decimal(0),
      );
      const totalAmount = new Decimal(invoice.totalAmount as any);
      const amount = new Decimal(dto.amount);
      const newPaidTotal = alreadyPaid.plus(amount);

      // 0.01 = 1 halala — tighter than the old 0.001 fudge.
      if (newPaidTotal.gt(totalAmount.plus(0.01))) {
        throw new BadRequestException(
          `Payment amount exceeds outstanding balance. Outstanding: ${totalAmount.minus(alreadyPaid).toFixed(2)}`,
        );
      }

      const isPaid = newPaidTotal.gte(totalAmount.minus(0.01));
      const newStatus = isPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      const payment = await tx.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}`,
          invoiceId,
          payerId,
          payerType: 'BUYER',
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          status: PaymentStatus.COMPLETED,
          paymentReference: dto.paymentReference ?? null,
          processedAt: new Date(),
        } as any,
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus, paidAt: isPaid ? new Date() : undefined },
      });
      return payment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── PAYOUTS ─────────────────────────────────────────────────────────────────

  async getPayouts(dto: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: PayoutStatus;
    recipientType?: string;
    farmerId?: string;
    buyerId?: string;
  }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.recipientType) where.recipientType = dto.recipientType;
    if (dto.farmerId) where.farmerId = dto.farmerId;
    if (dto.buyerId) where.buyerId = dto.buyerId;

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip,
        take,
        orderBy: { [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc' },
        include: {
          batch: { select: { id: true, batchNumber: true, status: true } },
          farmer: { select: { id: true, businessName: true } },
          driver: { select: { id: true, fullName: true } },
          buyer: { select: { id: true, businessName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.payout.count({ where }),
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

  async approvePayouts(dto: ApprovePayoutDto, approvedById: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { id: { in: dto.payoutIds } },
    });

    if (payouts.length !== dto.payoutIds.length) {
      const foundIds = new Set(payouts.map((p) => p.id));
      const missingIds = dto.payoutIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Payouts not found: ${missingIds.join(', ')}`);
    }

    const nonApprovable = payouts.filter(
      (p) => p.status !== PayoutStatus.QUEUED && p.status !== PayoutStatus.PENDING_APPROVAL,
    );
    if (nonApprovable.length > 0) {
      throw new BadRequestException(
        `Some payouts cannot be approved: ${nonApprovable.map((p) => p.id).join(', ')}`,
      );
    }

    const approvedAt = new Date();
    await this.prisma.payout.updateMany({
      where: { id: { in: dto.payoutIds } },
      data: { status: PayoutStatus.APPROVED, approvedById, approvedAt },
    });

    return { approvedCount: dto.payoutIds.length, payoutIds: dto.payoutIds, approvedAt };
  }

  // ─── REFUNDS ─────────────────────────────────────────────────────────────────

  async getRefunds(dto: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: RefundStatus;
  }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc' },
        include: {
          initiatedBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.refund.count({ where }),
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

  async createRefund(dto: CreateRefundDto, initiatedById: string) {
    return this.prisma.refund.create({
      data: {
        refundNumber: `REF-${Date.now()}`,
        originalPaymentId: dto.originalPaymentId,
        orderId: dto.orderId,
        disputeId: dto.disputeId,
        refundType: dto.refundType,
        refundMethod: dto.refundMethod,
        refundAmount: dto.refundAmount,
        refundReason: dto.reason,
        status: RefundStatus.PENDING_APPROVAL,
        initiatedById,
      } as any,
      include: { initiatedBy: { select: { id: true, fullName: true } } },
    });
  }

  async approveRefund(id: string, approvedById: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException(`Refund with ID ${id} not found`);
    if (refund.status !== RefundStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Refund cannot be approved — current status is ${refund.status}`);
    }
    return this.prisma.refund.update({
      where: { id },
      data: { status: RefundStatus.APPROVED, approvedById, approvedAt: new Date() },
      include: {
        initiatedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async getMyFinancialSummary(farmerId?: string, buyerId?: string) {
    const payoutWhere: any = {};
    if (farmerId) payoutWhere.farmerId = farmerId;
    if (buyerId) payoutWhere.buyerId = buyerId;

    const invoiceWhere: any = {};
    if (buyerId) invoiceWhere.recipientId = buyerId;
    if (farmerId) invoiceWhere.recipientId = farmerId;

    const [payoutCounts, queuedPayoutAmount, completedPayoutAmount] = await Promise.all([
      this.prisma.payout.groupBy({ by: ['status'], _count: { id: true }, where: payoutWhere }),
      this.prisma.payout.aggregate({
        _sum: { netAmount: true },
        where: { ...payoutWhere, status: { in: [PayoutStatus.QUEUED, PayoutStatus.PENDING_APPROVAL] } },
      }),
      this.prisma.payout.aggregate({
        _sum: { netAmount: true },
        where: { ...payoutWhere, status: PayoutStatus.COMPLETED },
      }),
    ]);

    const payoutCountMap: Record<string, number> = {};
    for (const row of payoutCounts) payoutCountMap[row.status] = row._count.id;

    return {
      payouts: {
        queued: payoutCountMap[PayoutStatus.QUEUED] ?? 0,
        pendingApproval: payoutCountMap[PayoutStatus.PENDING_APPROVAL] ?? 0,
        approved: payoutCountMap[PayoutStatus.APPROVED] ?? 0,
        completed: payoutCountMap[PayoutStatus.COMPLETED] ?? 0,
        totalQueuedAmount: Number(queuedPayoutAmount._sum.netAmount ?? 0),
        totalCompletedAmount: Number(completedPayoutAmount._sum.netAmount ?? 0),
      },
    };
  }

  // ─── FINANCIAL SUMMARY ─────────────────────────────────────────────────────

  async getFinancialSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoiceCounts, invoiceAmounts, payoutCounts, queuedPayoutAmount, refundCounts, pendingRefundAmount] =
      await Promise.all([
        this.prisma.invoice.groupBy({ by: ['status'], _count: { id: true } }),
        this.prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { status: { not: InvoiceStatus.VOID } },
        }),
        this.prisma.payout.groupBy({ by: ['status'], _count: { id: true } }),
        this.prisma.payout.aggregate({
          _sum: { netAmount: true },
          where: { status: { in: [PayoutStatus.QUEUED, PayoutStatus.PENDING_APPROVAL] } },
        }),
        this.prisma.refund.groupBy({ by: ['status'], _count: { id: true } }),
        this.prisma.refund.aggregate({
          _sum: { refundAmount: true },
          where: { status: { in: [RefundStatus.PENDING_APPROVAL, RefundStatus.APPROVED] } },
        }),
      ]);

    const invoiceCountMap: Record<string, number> = {};
    for (const row of invoiceCounts) invoiceCountMap[row.status] = row._count.id;
    const totalInvoices = Object.values(invoiceCountMap).reduce((a, b) => a + b, 0);

    const payoutCountMap: Record<string, number> = {};
    for (const row of payoutCounts) payoutCountMap[row.status] = row._count.id;

    const refundCountMap: Record<string, number> = {};
    for (const row of refundCounts) refundCountMap[row.status] = row._count.id;

    const totalPaid = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.COMPLETED, processedAt: { gte: startOfMonth } },
    });

    return {
      invoices: {
        total: totalInvoices,
        paid: invoiceCountMap[InvoiceStatus.PAID] ?? 0,
        outstanding: totalInvoices - (invoiceCountMap[InvoiceStatus.PAID] ?? 0) - (invoiceCountMap[InvoiceStatus.VOID] ?? 0),
        overdue: invoiceCountMap[InvoiceStatus.OVERDUE] ?? 0,
        totalIssued: Number(invoiceAmounts._sum.totalAmount ?? 0),
        paidThisMonth: Number(totalPaid._sum.amount ?? 0),
      },
      payouts: {
        queued: payoutCountMap[PayoutStatus.QUEUED] ?? 0,
        pendingApproval: payoutCountMap[PayoutStatus.PENDING_APPROVAL] ?? 0,
        approved: payoutCountMap[PayoutStatus.APPROVED] ?? 0,
        totalQueuedAmount: Number(queuedPayoutAmount._sum.netAmount ?? 0),
      },
      refunds: {
        pending: refundCountMap[RefundStatus.PENDING_APPROVAL] ?? 0,
        approved: refundCountMap[RefundStatus.APPROVED] ?? 0,
        totalPendingAmount: Number(pendingRefundAmount._sum.refundAmount ?? 0),
      },
    };
  }
}

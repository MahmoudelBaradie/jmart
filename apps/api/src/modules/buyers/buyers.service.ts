import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { DisputeStatus, KycStatus, Prisma } from '@prisma/client';

@Injectable()
export class BuyersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateBuyerDto) {
    const existing = await this.prisma.buyer.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Buyer profile already exists');

    const buyer = await this.prisma.buyer.create({
      data: {
        userId,
        businessName: dto.businessName,
        buyerType: dto.buyerType,
        contactPersonName: dto.contactPersonName,
        contactPhone: dto.contactPhone,
        commercialRegNo: dto.commercialRegNo,
      },
      include: { user: { select: { email: true, phone: true } } },
    });

    this.eventEmitter.emit('buyer.registered', { buyerId: buyer.id, userId });
    return buyer;
  }

  async getStats(userId: string) {
    const buyer = await this.prisma.buyer.findUnique({ where: { userId } });
    if (!buyer) return {};

    const [ordersCount, openDisputes, availableProducts] = await Promise.all([
      this.prisma.order.count({ where: { buyerId: buyer.id } }),
      this.prisma.dispute.count({ where: { filedById: buyer.userId, status: { not: DisputeStatus.CLOSED } } }),
      this.prisma.farmerCatalogItem.count({ where: { isListed: true, availableQty: { gt: 0 } } }),
    ]);

    return { ordersCount, openDisputes, availableProducts };
  }

  // ── Admin methods ──────────────────────────────────────────────

  async findAll(params: { page?: number; limit?: number; search?: string; kycStatus?: string }) {
    const { page = 1, limit = 20, search, kycStatus } = params;
    const where: Prisma.BuyerWhereInput = {
      ...(kycStatus && { kycStatus: kycStatus as KycStatus }),
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { contactPersonName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } }, _count: { select: { orders: true } } },
      }),
      this.prisma.buyer.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true } },
        branches: true,
        _count: { select: { orders: true } },
      },
    });
    if (!buyer) throw new NotFoundException(`Buyer ${id} not found`);
    return buyer;
  }

  async kycReview(id: string, status: KycStatus, notes?: string, reviewedById?: string) {
    const buyer = await this.findOne(id);
    return this.prisma.buyer.update({
      where: { id },
      data: { kycStatus: status },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BUYER BRANCHES (saved delivery addresses)
  // ═══════════════════════════════════════════════════════════════════════
  async getBranches(buyerId: string) {
    return this.prisma.buyerBranch.findMany({
      where: { buyerId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      include: { geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } } },
    });
  }

  async createBranch(buyerId: string, dto: any) {
    // Explicit allowlist — NEVER spread `dto` into Prisma `data` (would let
    // the caller set `buyerId`, `id`, `createdAt`, etc. → mass-assignment).
    const safe = {
      branchName: String(dto.branchName ?? '').trim(),
      branchCode: dto.branchCode ?? null,
      geoZoneId: dto.geoZoneId,
      address: dto.address,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      contactName: dto.contactName ?? null,
      contactPhone: dto.contactPhone ?? null,
      deliveryNotes: dto.deliveryNotes ?? null,
    };
    const isPrimaryReq = !!dto.isPrimary;

    const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException(`Buyer ${buyerId} not found`);

    return this.prisma.$transaction(async (tx) => {
      if (isPrimaryReq) {
        await tx.buyerBranch.updateMany({
          where: { buyerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const existingCount = await tx.buyerBranch.count({ where: { buyerId } });
      const isPrimaryFinal = isPrimaryReq || existingCount === 0;

      return tx.buyerBranch.create({
        data: { ...safe, buyerId, isPrimary: isPrimaryFinal, isActive: true },
        include: { geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } } },
      });
    });
  }

  async updateBranch(buyerId: string, branchId: string, dto: any) {
    const branch = await this.prisma.buyerBranch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);
    if (branch.buyerId !== buyerId) {
      throw new ForbiddenException('Branch does not belong to this buyer');
    }

    // Explicit allowlist on update — block any attempt to reparent (buyerId),
    // toggle isActive without going through delete, or rewrite timestamps.
    const safe: Prisma.BuyerBranchUncheckedUpdateInput = {};
    if (dto.branchName !== undefined) safe.branchName = String(dto.branchName).trim();
    if (dto.branchCode !== undefined) safe.branchCode = dto.branchCode;
    if (dto.geoZoneId !== undefined) safe.geoZoneId = dto.geoZoneId;
    if (dto.address !== undefined) safe.address = dto.address;
    if (dto.latitude !== undefined) safe.latitude = dto.latitude;
    if (dto.longitude !== undefined) safe.longitude = dto.longitude;
    if (dto.contactName !== undefined) safe.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) safe.contactPhone = dto.contactPhone;
    if (dto.deliveryNotes !== undefined) safe.deliveryNotes = dto.deliveryNotes;
    const wantsPrimary = dto.isPrimary === true;
    if (wantsPrimary) safe.isPrimary = true;

    return this.prisma.$transaction(async (tx) => {
      if (wantsPrimary) {
        await tx.buyerBranch.updateMany({
          where: { buyerId, isPrimary: true, NOT: { id: branchId } },
          data: { isPrimary: false },
        });
      }
      return tx.buyerBranch.update({
        where: { id: branchId },
        data: safe,
        include: { geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } } },
      });
    });
  }

  async deleteBranch(buyerId: string, branchId: string) {
    const branch = await this.prisma.buyerBranch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);
    if (branch.buyerId !== buyerId) {
      throw new ForbiddenException('Branch does not belong to this buyer');
    }
    // Soft-delete to preserve order history references
    await this.prisma.buyerBranch.update({
      where: { id: branchId },
      data: { isActive: false, isPrimary: false },
    });
    return { id: branchId, deleted: true };
  }
}

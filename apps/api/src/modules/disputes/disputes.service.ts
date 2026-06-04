import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DisputeCategory, DisputeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { generateDisputeNumber } from '../../common/utils/number-generator.util';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';

export interface DisputeFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: DisputeStatus;
  category?: DisputeCategory;
  filedById?: string;
}

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: DisputeFilterDto) {
    const where: Prisma.DisputeWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.category && { disputeCategory: dto.category }),
      ...(dto.filedById && { filedById: dto.filedById }),
      ...(dto.search && {
        OR: [
          { disputeNumber: { contains: dto.search, mode: 'insensitive' } },
          { description: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { fullName: true, role: true } },
          _count: { select: { evidence: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
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

  async findOne(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        evidence: true,
        assignedTo: { select: { id: true, fullName: true, role: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!dispute) throw new NotFoundException(`Dispute ${id} not found`);
    return dispute;
  }

  /** Authorize read/write on a single dispute. */
  private assertDisputeAccess(
    dispute: { filedById: string; againstId: string | null },
    caller: { internalUserId?: string | null; farmerId?: string | null; buyerId?: string | null },
  ) {
    if (caller.internalUserId) return;
    const partyIds = [caller.farmerId, caller.buyerId].filter(Boolean) as string[];
    if (partyIds.includes(dispute.filedById)) return;
    if (dispute.againstId && partyIds.includes(dispute.againstId)) return;
    throw new ForbiddenException('Not a party to this dispute');
  }

  async findOneAuthorized(id: string, caller: { internalUserId?: string | null; farmerId?: string | null; buyerId?: string | null }) {
    const dispute = await this.findOne(id);
    this.assertDisputeAccess(dispute, caller);
    return dispute;
  }

  async create(filedById: string, filedByType: string, dto: CreateDisputeDto) {
    const disputeNumber = await generateDisputeNumber(this.prisma);
    return this.prisma.dispute.create({
      data: {
        disputeNumber,
        orderId: dto.orderId,
        filedById,
        filedByType,
        againstId: dto.againstId,
        againstType: dto.againstType,
        disputeCategory: dto.category,
        description: dto.description,
        claimedAmount: dto.claimedAmount,
        status: DisputeStatus.FILED,
      },
    });
  }

  async update(id: string, dto: UpdateDisputeDto) {
    await this.findOne(id);
    return this.prisma.dispute.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.responsibility && { responsibility: dto.responsibility }),
        ...(dto.resolutionNotes && { resolutionNotes: dto.resolutionNotes }),
        ...(dto.assignedToId && { assignedToId: dto.assignedToId }),
      },
    });
  }

  async assign(id: string, assignedToId: string) {
    await this.findOne(id);
    return this.prisma.dispute.update({
      where: { id },
      data: { assignedToId, assignedAt: new Date(), status: DisputeStatus.ASSIGNED },
    });
  }

  async addEvidence(
    id: string,
    submittedById: string,
    submittedByType: string,
    dto: AddEvidenceDto,
    caller?: { internalUserId?: string | null; farmerId?: string | null; buyerId?: string | null },
  ) {
    const dispute = await this.findOne(id);
    if (caller) this.assertDisputeAccess(dispute, caller);
    return this.prisma.disputeEvidence.create({
      data: {
        disputeId: id,
        submittedById,
        submittedByType,
        evidenceType: dto.evidenceType,
        fileUrl: dto.fileUrl,
        description: dto.description,
      },
    });
  }

  async close(id: string, closedById: string, resolutionNotes: string) {
    await this.findOne(id);
    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.CLOSED,
        closedById,
        closedAt: new Date(),
        resolutionNotes,
      },
    });
  }

  async getStats() {
    const [filed, assigned, underReview, accepted, closed] = await Promise.all([
      this.prisma.dispute.count({ where: { status: DisputeStatus.FILED } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.ASSIGNED } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.UNDER_REVIEW } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.ACCEPTED } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.CLOSED } }),
    ]);

    const closedDisputes = await this.prisma.dispute.findMany({
      where: { status: DisputeStatus.CLOSED, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    });

    let avgResolutionDays = 0;
    if (closedDisputes.length > 0) {
      const totalMs = closedDisputes.reduce((sum, d) => {
        return sum + (d.closedAt!.getTime() - d.createdAt.getTime());
      }, 0);
      avgResolutionDays = totalMs / closedDisputes.length / (1000 * 60 * 60 * 24);
    }

    // `total` is the sum of all status buckets — the UI shows it next to
    // the per-bucket counters and was previously coming back as 0.
    const total = filed + assigned + underReview + accepted + closed;
    return { total, filed, assigned, underReview, accepted, closed, avgResolutionDays: Math.round(avgResolutionDays * 10) / 10 };
  }
}

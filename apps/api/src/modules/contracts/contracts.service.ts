import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractStatus, ContractType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { generateContractNumber } from '../../common/utils/number-generator.util';
import { CreateContractDto } from './dto/create-contract.dto';

export interface ContractFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ContractStatus;
  farmerId?: string;
  buyerId?: string;
}

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ContractFilterDto) {
    const where: Prisma.SupplyContractWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.farmerId && { farmerId: dto.farmerId }),
      ...(dto.buyerId && { buyerId: dto.buyerId }),
      ...(dto.search && {
        OR: [
          { contractNumber: { contains: dto.search, mode: 'insensitive' } },
          { title: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.supplyContract.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { businessName: true } },
          buyer: { select: { businessName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.supplyContract.count({ where }),
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
    const contract = await this.prisma.supplyContract.findUnique({
      where: { id },
      include: {
        farmer: { select: { id: true, businessName: true } },
        buyer: { select: { id: true, businessName: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
        penaltyClauses: true,
        draftedBy: { select: { fullName: true } },
        reviewedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  async create(dto: CreateContractDto, draftedById: string) {
    const contractNumber = await generateContractNumber(this.prisma);

    return this.prisma.supplyContract.create({
      data: {
        contractNumber,
        title: dto.title ?? `Contract ${contractNumber}`,
        farmerId: dto.farmerId,
        buyerId: dto.buyerId,
        contractType: dto.contractType ?? ContractType.SUPPLY,
        status: ContractStatus.DRAFT,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        priceLockType: dto.priceLockType as any,
        settlementFrequency: dto.settlementFrequency as any,
        paymentTermsDays: dto.paymentTermsDays ?? 0,
        autoRenew: dto.autoRenew ?? false,
        internalNotes: dto.internalNotes ?? dto.notes,
        draftedById,
        items: {
          create: (dto.items ?? []).map((item: any) => ({
            productId: item.productId,
            grade: item.grade,
            qtyPerPeriod: item.qtyPerPeriod ?? item.weeklyQtyKg ?? 0,
            periodUnit: item.periodUnit ?? 'WEEK',
            pricePerUnit: item.pricePerKg ?? item.pricePerUnit,
            tolerancePct: item.tolerancePct ?? 10,
          })),
        },
        ...(dto.penaltyClauses?.length && {
          penaltyClauses: {
            create: dto.penaltyClauses.map((clause: any) => ({
              breachType: clause.breachType,
              penaltyType: clause.penaltyType ?? 'PERCENTAGE',
              penaltyValue: clause.penaltyValue ?? clause.penaltyPct ?? 0,
              maxPenalty: clause.maxPenalty,
              appliesTo: clause.appliesTo ?? 'BOTH',
            })),
          },
        }),
      },
    });
  }

  async updateStatus(id: string, status: ContractStatus, userId: string, notes?: string) {
    await this.findOne(id);

    const data: Prisma.SupplyContractUncheckedUpdateInput = {
      status,
      ...(notes && { internalNotes: notes }),
    };
    if (status === ContractStatus.UNDER_REVIEW) data.reviewedById = userId;
    if (status === ContractStatus.ACTIVE) data.approvedById = userId;

    return this.prisma.supplyContract.update({ where: { id }, data });
  }

  async sign(id: string, caller: { farmerId: string | null; buyerId: string | null }) {
    const contract = await this.prisma.supplyContract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contract not found');

    const now = new Date();
    let data: Prisma.SupplyContractUncheckedUpdateInput;

    if (caller.farmerId && caller.farmerId === contract.farmerId) {
      data = { farmerSignedAt: now };
    } else if (caller.buyerId && caller.buyerId === contract.buyerId) {
      data = { buyerSignedAt: now };
    } else {
      throw new ForbiddenException('Only the contract farmer or buyer can sign');
    }

    return this.prisma.supplyContract.update({ where: { id }, data });
  }

  async getActiveContracts(farmerId?: string, buyerId?: string) {
    return this.prisma.supplyContract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        ...(farmerId && { farmerId }),
        ...(buyerId && { buyerId }),
      },
      include: {
        farmer: { select: { businessName: true } },
        buyer: { select: { businessName: true } },
        items: true,
      },
    });
  }

  async getStats() {
    const counts = await this.prisma.supplyContract.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  }
}

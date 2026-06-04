import { Injectable, NotFoundException } from '@nestjs/common';
import { InspectionType, InspectionResult, QualityAction, LotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

export interface CreateInspectionDto {
  lotId: string;
  orderId?: string;
  warehouseId?: string;
  inspectionType: InspectionType;
  declaredWeightKg?: number;
  notes?: string;
}

export interface CompleteInspectionDto {
  result: InspectionResult;
  actionTaken?: QualityAction;
  passedQty?: number;
  rejectedQty?: number;
  supervisorNotes?: string;
  defects?: { defectType: string; severity: string; affectedPct: number; notes?: string }[];
}

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: {
    page?: number;
    limit?: number;
    search?: string;
    result?: InspectionResult;
    inspectionType?: InspectionType;
    lotId?: string;
  }) {
    const where: Prisma.QualityInspectionWhereInput = {
      ...(dto.result && { result: dto.result }),
      ...(dto.inspectionType && { inspectionType: dto.inspectionType }),
      ...(dto.lotId && { lotId: dto.lotId }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.qualityInspection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          lot: { select: { lotNumber: true } },
          inspector: { select: { fullName: true } },
        },
      }),
      this.prisma.qualityInspection.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async findOne(id: string) {
    const inspection = await this.prisma.qualityInspection.findUnique({
      where: { id },
      include: {
        lot: { include: { product: { select: { name: true } } } },
        inspector: { select: { fullName: true } },
        supervisor: { select: { fullName: true } },
        photos: true,
        defectRecords: true,
      },
    });
    if (!inspection) throw new NotFoundException(`Inspection ${id} not found`);
    return inspection;
  }

  async create(dto: CreateInspectionDto, inspectorId: string) {
    const inspectionCount = await this.prisma.qualityInspection.count();
    const inspectionNumber = `INS-${new Date().getFullYear()}-${String(inspectionCount + 1).padStart(5, '0')}`;

    return this.prisma.qualityInspection.create({
      data: {
        inspectionNumber,
        lotId: dto.lotId,
        orderId: dto.orderId,
        warehouseId: dto.warehouseId,
        inspectionType: dto.inspectionType,
        declaredWeightKg: dto.declaredWeightKg,
        supervisorNotes: dto.notes,
        inspectorId,
        result: InspectionResult.PENDING,
      },
    });
  }

  async complete(id: string, dto: CompleteInspectionDto, supervisorSignOffId: string) {
    const inspection = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.qualityInspection.update({
        where: { id },
        data: {
          result: dto.result,
          actionTaken: dto.actionTaken,
          passedQty: dto.passedQty,
          rejectedQty: dto.rejectedQty,
          supervisorNotes: dto.supervisorNotes,
          supervisorSignOffId,
          completedAt: new Date(),
        },
      });

      if (dto.result === InspectionResult.FAILED) {
        await tx.inventoryLot.update({
          where: { id: inspection.lotId },
          data: { status: LotStatus.REJECTED },
        });
      }

      if (dto.defects?.length) {
        await tx.defectRecord.createMany({
          data: dto.defects.map((d) => ({
            inspectionId: id,
            defectType: d.defectType,
            severity: d.severity,
            affectedPct: d.affectedPct,
            notes: d.notes,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, passed, failed, partialPass, pendingToday] = await Promise.all([
      this.prisma.qualityInspection.count(),
      this.prisma.qualityInspection.count({ where: { result: InspectionResult.PASSED } }),
      this.prisma.qualityInspection.count({ where: { result: InspectionResult.FAILED } }),
      this.prisma.qualityInspection.count({ where: { result: InspectionResult.PARTIAL_PASS } }),
      this.prisma.qualityInspection.count({
        where: { result: InspectionResult.PENDING, createdAt: { gte: today } },
      }),
    ]);

    return { total, passed, failed, partialPass, pendingToday };
  }
}

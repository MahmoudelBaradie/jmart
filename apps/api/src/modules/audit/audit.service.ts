import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

export interface QueryAuditDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(dto: QueryAuditDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(dto.actorId && { actorId: dto.actorId }),
      ...(dto.action && { actionType: dto.action }),
      ...(dto.entityType && { entityType: dto.entityType }),
      ...(dto.entityId && { entityId: dto.entityId }),
      ...(dto.from || dto.to
        ? {
            timestamp: {
              ...(dto.from && { gte: new Date(dto.from) }),
              ...(dto.to && { lte: new Date(dto.to) }),
            },
          }
        : {}),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [rawData, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // AuditLog.id is a BigInt — `JSON.stringify` blows up unless we cast.
    const data = rawData.map((r) => ({ ...r, id: r.id.toString() }));

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

  async getActivityLogs(dto: { page?: number; limit?: number; userId?: string }) {
    const where: Prisma.ActivityLogWhereInput = {
      ...(dto.userId && { performedById: dto.userId }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [rawData, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    // ActivityLog.id is BigInt — same JSON.stringify guard.
    const data = rawData.map((r) => ({ ...r, id: r.id.toString() }));

    return paginate(data, total, dto);
  }

  async logAction(data: {
    actorId?: string;
    actorType?: string;
    actionType: AuditAction;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({ data });
    } catch {
      // Audit logging must never break business logic
    }
  }

  async getUserActivity(actorId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.auditLog.findMany({
      where: { actorId, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async getEntityHistory(entityType: string, entityId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskType, TaskStatus, TaskPriority, ApprovalStatus, EscalationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { generateTaskNumber } from '../../common/utils/number-generator.util';

export interface TaskFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: TaskStatus;
  taskType?: TaskType;
  assignedToId?: string;
  priority?: TaskPriority;
}

export interface CreateTaskDto {
  taskType: TaskType;
  priority?: TaskPriority;
  title: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  assignedToId?: string;
  dueAt?: Date;
}

export interface UpdateTaskDto {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
  dueAt?: Date;
  resolutionNotes?: string;
}

export interface CreateApprovalDto {
  approvalType: string;
  referenceId: string;
  referenceType: string;
  justification?: string;
  expiresAt?: Date;
}

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getTasks(dto: TaskFilterDto) {
    const where: Prisma.TaskWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.taskType && { taskType: dto.taskType }),
      ...(dto.assignedToId && { assignedToId: dto.assignedToId }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.search && {
        OR: [
          { title: { contains: dto.search, mode: 'insensitive' } },
          { taskNumber: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignedTo: { select: { fullName: true, role: true } },
          assignedBy: { select: { fullName: true } },
          _count: { select: { escalations: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async getTaskById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        assignedBy: { select: { id: true, fullName: true } },
        escalations: {
          include: {
            escalatedFrom: { select: { fullName: true } },
            escalatedTo: { select: { fullName: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async createTask(dto: CreateTaskDto, createdById: string) {
    const taskNumber = await generateTaskNumber(this.prisma);

    let dueAt = dto.dueAt;
    if (!dueAt) {
      const slaDef = await this.prisma.slaDefinition.findUnique({
        where: { taskType: dto.taskType },
      });
      if (slaDef) {
        dueAt = new Date(Date.now() + slaDef.targetMinutes * 60 * 1000);
      }
    }

    return this.prisma.task.create({
      data: {
        taskNumber,
        taskType: dto.taskType,
        priority: dto.priority ?? TaskPriority.P2,
        title: dto.title,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        assignedToId: dto.assignedToId,
        assignedById: createdById,
        slaDeadline: dueAt,
        status: TaskStatus.CREATED,
      },
    });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    await this.getTaskById(id);

    const data: any = {
      ...(dto.status && { status: dto.status }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      ...(dto.dueAt && { slaDeadline: dto.dueAt }),
      ...(dto.resolutionNotes && { resolutionNotes: dto.resolutionNotes }),
    };

    if (dto.status === TaskStatus.RESOLVED) data.resolvedAt = new Date();

    return this.prisma.task.update({ where: { id }, data });
  }

  async escalateTask(id: string, toUserId: string, reason: string, fromUserId: string) {
    await this.getTaskById(id);

    const lastEscalation = await this.prisma.escalation.findFirst({
      where: { taskId: id },
      orderBy: { escalationLevel: 'desc' },
    });
    const nextLevel = (lastEscalation?.escalationLevel ?? 0) + 1;

    await Promise.all([
      this.prisma.escalation.create({
        data: {
          taskId: id,
          escalationLevel: nextLevel,
          escalationType: EscalationType.MANUAL,
          escalatedFromId: fromUserId,
          escalatedToId: toUserId,
          reason,
        },
      }),
      this.prisma.task.update({
        where: { id },
        data: { status: TaskStatus.ESCALATED, assignedToId: toUserId },
      }),
    ]);

    return this.getTaskById(id);
  }

  async getApprovals(dto: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; status?: ApprovalStatus; entityType?: string }) {
    const where: Prisma.ApprovalRequestWhereInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.entityType && { approvalType: dto.entityType }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { fullName: true } },
          finalDecisionBy: { select: { fullName: true } },
        },
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async createApproval(dto: CreateApprovalDto, requestedById: string) {
    const count = await this.prisma.approvalRequest.count();
    const approvalNumber = `APR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.approvalRequest.create({
      data: {
        approvalNumber,
        approvalType: dto.approvalType,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        requestedById,
        approvalFlow: [],
        justification: dto.justification,
        expiresAt: dto.expiresAt,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async decideApproval(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    decisionNotes: string,
    decidedById: string,
  ) {
    const approval = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException(`Approval ${id} not found`);

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        rejectionReason: decision === 'REJECTED' ? decisionNotes : null,
        finalDecisionById: decidedById,
        finalDecisionAt: new Date(),
      },
    });
  }

  async getSlaDefinitions() {
    return this.prisma.slaDefinition.findMany({ orderBy: { taskType: 'asc' } });
  }

  async getMyTasks(internalUserId: string, dto: any) {
    return this.getTasks({ ...dto, assignedToId: internalUserId });
  }
}

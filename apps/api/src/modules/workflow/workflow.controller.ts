import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, TaskStatus, TaskType, TaskPriority, ApprovalStatus } from '@prisma/client';
import { WorkflowService } from './workflow.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('tasks')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST, InternalRole.DISPUTE_HANDLER, InternalRole.FINANCE_OFFICER, InternalRole.QUALITY_INSPECTOR, InternalRole.DRIVER_COORDINATOR, InternalRole.CONTRACT_OFFICER, InternalRole.WAREHOUSE_MANAGER)
  getTasks(
    @Query() dto: PaginationDto,
    @Query('status') status?: TaskStatus,
    @Query('taskType') taskType?: TaskType,
    @Query('priority') priority?: TaskPriority,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.workflowService.getTasks({ ...dto, status, taskType, priority, assignedToId } as any);
  }

  @Get('tasks/my')
  getMyTasks(@CurrentUser() user: any, @Query() dto: PaginationDto) {
    return this.workflowService.getMyTasks(user.internalUser?.id, dto);
  }

  @Get('tasks/:id')
  getTaskById(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.getTaskById(id);
  }

  @Post('tasks')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  createTask(@Body() dto: any, @CurrentUser() user: any) {
    return this.workflowService.createTask(dto, user.internalUser?.id);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.workflowService.updateTask(id, dto);
  }

  @Post('tasks/:id/escalate')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  escalateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('toUserId') toUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.workflowService.escalateTask(id, toUserId, reason, user.internalUser?.id);
  }

  @Get('approvals')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  getApprovals(
    @Query() dto: PaginationDto,
    @Query('status') status?: ApprovalStatus,
    @Query('entityType') entityType?: string,
  ) {
    return this.workflowService.getApprovals({ ...dto, status, entityType } as any);
  }

  @Post('approvals')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  createApproval(@Body() dto: any, @CurrentUser() user: any) {
    return this.workflowService.createApproval(dto, user.internalUser?.id);
  }

  @Post('approvals/:id/decide')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  decideApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('decisionNotes') decisionNotes: string,
  ) {
    return this.workflowService.decideApproval(id, decision, decisionNotes, user.internalUser?.id);
  }

  @Get('sla-definitions')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  getSlaDefinitions() {
    return this.workflowService.getSlaDefinitions();
  }
}


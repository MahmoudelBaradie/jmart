import { Controller, Get, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  getLogs(
    @Query() dto: PaginationDto,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: Date,
    @Query('to') to?: Date,
  ) {
    return this.auditService.getLogs({ ...dto, actorId, action, entityType, entityId, from, to });
  }

  @Get('activity')
  getActivityLogs(@Query() dto: PaginationDto, @Query('userId') userId?: string) {
    return this.auditService.getActivityLogs({ ...dto, userId });
  }

  @Get('actors/:actorId/activity')
  getUserActivity(
    @Param('actorId') actorId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.auditService.getUserActivity(actorId, days);
  }

  @Get(':entityType/:entityId/history')
  getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }
}


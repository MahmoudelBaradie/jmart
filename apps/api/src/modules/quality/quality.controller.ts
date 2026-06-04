import {
  Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, InspectionResult, InspectionType } from '@prisma/client';
import { QualityService } from './quality.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get()
  @Roles(InternalRole.QUALITY_INSPECTOR, InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  findAll(
    @Query() dto: PaginationDto,
    @Query('result') result?: InspectionResult,
    @Query('inspectionType') inspectionType?: InspectionType,
    @Query('lotId') lotId?: string,
  ) {
    return this.qualityService.findAll({ ...dto, result, inspectionType, lotId } as any);
  }

  @Get('stats')
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  getStats() {
    return this.qualityService.getStats();
  }

  @Get(':id')
  @Roles(InternalRole.QUALITY_INSPECTOR, InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qualityService.findOne(id);
  }

  @Post()
  @Roles(InternalRole.QUALITY_INSPECTOR, InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.qualityService.create(dto, user.internalUser?.id);
  }

  @Post(':id/complete')
  @Roles(InternalRole.QUALITY_INSPECTOR, InternalRole.WAREHOUSE_MANAGER)
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.qualityService.complete(id, dto, user.internalUser?.id);
  }
}


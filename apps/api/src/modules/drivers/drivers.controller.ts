import { Controller, Get, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalRole } from '@prisma/client';

@ApiTags('Drivers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'List all drivers' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.driversService.findAll(pagination, { status, zoneId });
  }

  @Get(':id')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'Get driver detail' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Update driver status' })
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.driversService.updateStatus(id, status);
  }
}

import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, ShipmentStatus } from '@prisma/client';
import { LogisticsService } from './logistics.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('shipments')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.DRIVER_COORDINATOR)
  findAll(
    @Query() dto: PaginationDto,
    @Query('status') status?: ShipmentStatus,
    @Query('driverId') driverId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.logisticsService.findAll({ ...dto, status, driverId, orderId });
  }

  @Get('available-drivers')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.DRIVER_COORDINATOR)
  getAvailableDrivers(@Query('zoneId') zoneId?: string) {
    return this.logisticsService.getAvailableDrivers(zoneId);
  }

  @Get('shipments/stats')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  getStats() {
    return this.logisticsService.getStats();
  }

  @Get('shipments/my')
  getDriverShipments(@CurrentUser() user: any, @Query() dto: PaginationDto) {
    return this.logisticsService.getDriverShipments(user.driver?.id, dto);
  }

  @Get('shipments/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.logisticsService.findOne(id);
  }

  @Post('shipments')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN, InternalRole.DRIVER_COORDINATOR)
  create(@Body() dto: any) {
    return this.logisticsService.create(dto);
  }

  @Patch('shipments/:id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN, InternalRole.DRIVER_COORDINATOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.logisticsService.update(id, dto);
  }

  @Post('shipments/:id/assign-driver')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.DRIVER_COORDINATOR, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  assignDriver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.logisticsService.assignDriver(id, dto);
  }

  @Patch('shipments/:id/status')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN, InternalRole.DRIVER_COORDINATOR)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ShipmentStatus,
    @Body('notes') notes?: string,
  ) {
    return this.logisticsService.updateStatus(id, status, notes);
  }
}


import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, WarehouseStatus } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.WAREHOUSE_MANAGER)
  findAll(
    @Query() dto: PaginationDto,
    @Query('status') status?: WarehouseStatus,
    @Query('geoZoneId') geoZoneId?: string,
  ) {
    return this.warehousesService.findAll({ ...dto, status, geoZoneId });
  }

  @Get('stats')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  getStats() {
    return this.warehousesService.getStats();
  }

  @Get(':id')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.WAREHOUSE_MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  create(@Body() dto: any) {
    return this.warehousesService.create(dto);
  }

  @Patch(':id')
  @Roles(InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.warehousesService.update(id, dto);
  }

  @Post(':id/temperature')
  @Roles(InternalRole.WAREHOUSE_MANAGER)
  logTemperature(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.warehousesService.logTemperature(id, dto);
  }

  @Get(':id/temperature')
  @Roles(InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  getTemperatureHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    return this.warehousesService.getTemperatureHistory(id, hours);
  }

  @Get(':id/inventory')
  @Roles(InternalRole.WAREHOUSE_MANAGER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  getInventory(@Param('id', ParseUUIDPipe) id: string, @Query() dto: PaginationDto) {
    return this.warehousesService.getInventory(id, dto);
  }
}


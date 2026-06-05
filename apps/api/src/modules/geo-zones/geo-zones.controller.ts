import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GeoZonesService } from './geo-zones.service';
import { CreateGeoZoneDto } from './dto/create-geo-zone.dto';
import { UpdateGeoZoneDto } from './dto/update-geo-zone.dto';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalRole } from '@prisma/client';

@ApiTags('Geo Zones')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('geo-zones')
export class GeoZonesController {
  constructor(private readonly geoZonesService: GeoZonesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active geo zones with pagination' })
  async findAll(@Query() dto: PaginationDto) {
    return this.geoZonesService.findAll(dto);
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get REGION-level zones with nested children (2 levels)' })
  async getHierarchy() {
    return this.geoZonesService.getHierarchy();
  }

  @Get('lookup')
  @ApiOperation({
    summary: 'Find which zones contain a lat/lng (PostGIS ST_Contains)',
    description: 'Returns zones from smallest to largest containing area. Empty array → outside any service zone.',
  })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 24.7136 })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: 46.6753 })
  async lookupByPoint(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.geoZonesService.lookupByPoint(parseFloat(lat), parseFloat(lng));
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get active shipping rates between two zones' })
  @ApiQuery({ name: 'fromZoneId', required: true, type: String })
  @ApiQuery({ name: 'toZoneId', required: true, type: String })
  async getShippingRates(
    @Query('fromZoneId', ParseUUIDPipe) fromZoneId: string,
    @Query('toZoneId', ParseUUIDPipe) toZoneId: string,
  ) {
    return this.geoZonesService.getShippingRates(fromZoneId, toZoneId);
  }

  @Post('rates')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.GEO_ZONE_MANAGER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shipping rate between two zones (internal)' })
  async createShippingRate(
    @Body() dto: CreateShippingRateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.geoZonesService.createShippingRate(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single geo zone by ID with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geoZonesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.GEO_ZONE_MANAGER, InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new geo zone (internal)' })
  async create(
    @Body() dto: CreateGeoZoneDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.geoZonesService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.GEO_ZONE_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a geo zone (internal)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGeoZoneDto,
  ) {
    return this.geoZonesService.update(id, dto);
  }

  @Get(':id/capacity')
  @ApiOperation({ summary: 'Get capacity utilization logs for a zone' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of past days to fetch (default 30)' })
  async getCapacityStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.geoZonesService.getCapacityStats(id, days);
  }
}

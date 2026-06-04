import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { InternalRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get platform-wide operational overview' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('order-trends')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get order volume trends grouped by day' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of past days to include (default: 30)',
  })
  async getOrderTrends(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.getOrderTrends(days);
  }

  @Get('top-farmers')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get top farmers by order count this month' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top farmers to return (default: 10)',
  })
  async getTopFarmers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getTopFarmers(limit);
  }

  @Get('top-buyers')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get top buyers by spending this month' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top buyers to return (default: 10)',
  })
  async getTopBuyers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getTopBuyers(limit);
  }

  @Get('zone-activity')
  @Roles(
    InternalRole.SUPER_ADMIN,
    InternalRole.OPS_MANAGER,
    InternalRole.GEO_ZONE_MANAGER,
  )
  @ApiOperation({ summary: 'Get order activity per active geo zone (last 30 days)' })
  async getZoneActivity() {
    return this.dashboardService.getZoneActivity();
  }
}

import {
  Controller, Get, Post, Delete, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Farms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  @ApiOperation({ summary: 'List all farms with product counts and available quantities' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  async listFarms(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    const buyerId: string | undefined = user?.buyer?.id;
    return this.farmsService.listFarms({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      zoneId,
      buyerId,
    });
  }

  @Get('following')
  @ApiOperation({ summary: "Get farms the current buyer follows" })
  async getFollowedFarms(@CurrentUser() user: any) {
    const buyerId: string = user?.buyer?.id;
    return this.farmsService.getFollowedFarms(buyerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get farm profile with products and quantities' })
  async getFarmProfile(
    @Param('id', ParseUUIDPipe) farmId: string,
    @CurrentUser() user: any,
  ) {
    const buyerId: string | undefined = user?.buyer?.id;
    return this.farmsService.getFarmProfile(farmId, buyerId);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a farm (buyer only)' })
  async followFarm(
    @Param('id', ParseUUIDPipe) farmId: string,
    @CurrentUser() user: any,
  ) {
    const buyerId: string = user?.buyer?.id;
    return this.farmsService.followFarm(buyerId, farmId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a farm (buyer only)' })
  async unfollowFarm(
    @Param('id', ParseUUIDPipe) farmId: string,
    @CurrentUser() user: any,
  ) {
    const buyerId: string = user?.buyer?.id;
    return this.farmsService.unfollowFarm(buyerId, farmId);
  }
}

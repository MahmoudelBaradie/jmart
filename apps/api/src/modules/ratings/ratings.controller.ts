import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RatingsService, CreateRatingDto } from './ratings.service';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a rating for a delivered order' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(userId, dto);
  }

  @Get('farmers/:farmerId')
  @ApiOperation({ summary: 'Get ratings for a farmer' })
  async getFarmerRatings(
    @Param('farmerId', ParseUUIDPipe) farmerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratingsService.getFarmerRatings(farmerId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('buyers/:buyerId')
  @ApiOperation({ summary: 'Get ratings for a buyer' })
  async getBuyerRatings(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratingsService.getBuyerRatings(buyerId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('my-rating/order/:orderId')
  @ApiOperation({ summary: 'Check if I have rated a specific order' })
  async getMyRating(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.ratingsService.getMyRatingForOrder(userId, orderId);
  }
}

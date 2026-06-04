import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FarmersService } from './farmers.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { CreateFarmDto } from './dto/create-farm.dto';
import { KycReviewDto } from './dto/kyc-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalRole, KycStatus } from '@prisma/client';

@ApiTags('Farmers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farmers')
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create farmer profile (called by farmer after registration)' })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFarmerDto,
  ) {
    return this.farmersService.create(userId, dto);
  }

  @Get()
  @Roles(
    InternalRole.SUPER_ADMIN,
    InternalRole.OPS_MANAGER,
    InternalRole.OPS_SPECIALIST,
    InternalRole.ACCOUNT_MANAGER,
  )
  @ApiOperation({ summary: 'List all farmers (internal)' })
  @ApiQuery({ name: 'kycStatus', enum: KycStatus, required: false })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('kycStatus') kycStatus?: KycStatus,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.farmersService.findAll(pagination, { kycStatus, zoneId });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my farmer profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.farmersService.findByUserId(userId);
  }

  @Get('me/kyc-documents')
  @ApiOperation({ summary: 'Get my KYC documents' })
  async getMyKycDocuments(@CurrentUser() user: any) {
    return this.farmersService.getKycDocuments(user.farmer?.id);
  }

  @Post('me/kyc-documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a KYC document reference' })
  async addKycDocument(
    @CurrentUser() user: any,
    @Body() dto: { documentType: string; fileUrl: string; fileName?: string; expiresAt?: string },
  ) {
    return this.farmersService.addKycDocument(user.farmer?.id, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get stats for the authenticated farmer' })
  async myStats(@CurrentUser() user: any) {
    return this.farmersService.getStats(user.farmer?.id);
  }

  @Get(':id')
  @Roles(
    InternalRole.SUPER_ADMIN,
    InternalRole.OPS_MANAGER,
    InternalRole.OPS_SPECIALIST,
    InternalRole.ACCOUNT_MANAGER,
    InternalRole.CONTRACT_OFFICER,
  )
  @ApiOperation({ summary: 'Get farmer by ID (internal)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.farmersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my farmer profile' })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateFarmerDto,
  ) {
    return this.farmersService.update(user.farmer.id, dto);
  }

  @Patch(':id')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.ACCOUNT_MANAGER)
  @ApiOperation({ summary: 'Update farmer profile (internal)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFarmerDto,
  ) {
    return this.farmersService.update(id, dto);
  }

  @Post(':id/kyc-review')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review farmer KYC (internal)' })
  async reviewKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KycReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.farmersService.reviewKyc(id, dto, user.internalUser.id);
  }

  @Post(':id/suspend')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend farmer account (internal)' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.farmersService.suspend(id, reason, user.internalUser.id);
  }

  @Post(':id/farms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add farm to farmer profile (self only, or internal)' })
  async createFarm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFarmDto,
    @CurrentUser() user: any,
  ) {
    this.assertFarmerSelfOrInternal(user, id);
    return this.farmersService.createFarm(id, dto);
  }

  @Get(':id/farms')
  @ApiOperation({ summary: 'Get farmer farms (self only, or internal)' })
  async getFarms(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    this.assertFarmerSelfOrInternal(user, id);
    return this.farmersService.getFarms(id);
  }

  private assertFarmerSelfOrInternal(user: any, farmerId: string) {
    if (user?.internalUser?.id) return;
    if (user?.farmer?.id && user.farmer.id === farmerId) return;
    throw new ForbiddenException('Not allowed for this farmer profile');
  }

  @Get(':id/stats')
  @Roles(
    InternalRole.SUPER_ADMIN,
    InternalRole.OPS_MANAGER,
    InternalRole.ACCOUNT_MANAGER,
    InternalRole.FINANCE_OFFICER,
  )
  @ApiOperation({ summary: 'Get farmer statistics (internal)' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.farmersService.getStats(id);
  }
}

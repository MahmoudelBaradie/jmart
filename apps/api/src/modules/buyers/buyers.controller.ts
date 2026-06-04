import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BuyersService } from './buyers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { InternalRole, KycStatus } from '@prisma/client';

@ApiTags('Buyers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('buyers')
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create buyer profile (called by buyer after registration)' })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBuyerDto,
  ) {
    return this.buyersService.create(userId, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get stats for the authenticated buyer' })
  async myStats(@CurrentUser('id') userId: string) {
    return this.buyersService.getStats(userId);
  }

  // ── Branches (saved delivery addresses for "me") ──────────────────
  @Get('me/branches')
  @ApiOperation({ summary: 'List my saved delivery addresses (branches)' })
  async myBranches(@CurrentUser() user: AuthenticatedUser) {
    if (!user.buyer?.id) throw new ForbiddenException('Only buyers can manage branches');
    return this.buyersService.getBranches(user.buyer.id);
  }

  @Post('me/branches')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new delivery address' })
  async createMyBranch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ) {
    if (!user.buyer?.id) throw new ForbiddenException('Only buyers can manage branches');
    return this.buyersService.createBranch(user.buyer.id, dto as any);
  }

  @Patch('me/branches/:branchId')
  @ApiOperation({ summary: 'Update one of my delivery addresses' })
  async updateMyBranch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    if (!user.buyer?.id) throw new ForbiddenException('Only buyers can manage branches');
    return this.buyersService.updateBranch(user.buyer.id, branchId, dto as any);
  }

  @Delete('me/branches/:branchId')
  @ApiOperation({ summary: 'Soft-delete one of my delivery addresses' })
  async deleteMyBranch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    if (!user.buyer?.id) throw new ForbiddenException('Only buyers can manage branches');
    return this.buyersService.deleteBranch(user.buyer.id, branchId);
  }

  // ── Admin endpoints ──────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.ACCOUNT_MANAGER)
  @ApiOperation({ summary: 'List all buyers (internal)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('kycStatus') kycStatus?: string,
  ) {
    return this.buyersService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      kycStatus,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.ACCOUNT_MANAGER)
  @ApiOperation({ summary: 'Get buyer by ID (internal)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.buyersService.findOne(id);
  }

  @Post(':id/kyc-review')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review buyer KYC (internal)' })
  async kycReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: KycStatus,
    @Body('notes') notes?: string,
    @CurrentUser() user?: any,
  ) {
    return this.buyersService.kycReview(id, status, notes, user?.internalUser?.id);
  }
}

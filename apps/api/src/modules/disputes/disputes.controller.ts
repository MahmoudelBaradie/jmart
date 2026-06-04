import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, DisputeStatus, DisputeCategory } from '@prisma/client';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { ListMyDisputesDto } from './dto/list-my-disputes.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.DISPUTE_HANDLER)
  findAll(
    @Query() dto: PaginationDto,
    @Query('status') status?: DisputeStatus,
    @Query('category') category?: DisputeCategory,
  ) {
    return this.disputesService.findAll({ ...dto, status, category });
  }

  @Get('my')
  getMyDisputes(
    @CurrentUser() user: any,
    @Query() dto: ListMyDisputesDto,
  ) {
    // Dual-role users (e.g. demo) can have BOTH farmer and buyer profiles.
    // ?as= disambiguates which profile's disputes to return so the UI's
    // active role and the API view stay in sync.
    let filedById: string | undefined;
    if (dto.as === 'buyer') filedById = user.buyer?.id;
    else if (dto.as === 'farmer') filedById = user.farmer?.id;
    else filedById = user.farmer?.id ?? user.buyer?.id ?? user.id;
    // Strip `as` from the spread so the service doesn't try to pass it to Prisma
    const { as: _as, ...pagination } = dto;
    return this.disputesService.findAll({ ...pagination, filedById });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  getStats() {
    return this.disputesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.disputesService.findOneAuthorized(id, {
      internalUserId: user.internalUser?.id ?? null,
      farmerId: user.farmer?.id ?? null,
      buyerId: user.buyer?.id ?? null,
    });
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDisputeDto) {
    const filedByType = user.buyer ? 'BUYER' : user.farmer ? 'FARMER' : 'USER';
    const filedById = user.buyer?.id ?? user.farmer?.id ?? user.id;
    return this.disputesService.create(filedById, filedByType, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.DISPUTE_HANDLER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDisputeDto) {
    return this.disputesService.update(id, dto);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  assign(@Param('id') id: string, @Body('assignedToId') assignedToId: string) {
    return this.disputesService.assign(id, assignedToId);
  }

  @Post(':id/evidence')
  addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AddEvidenceDto,
  ) {
    const submittedByType = user.buyer ? 'BUYER' : user.farmer ? 'FARMER' : 'USER';
    const submittedById = user.buyer?.id ?? user.farmer?.id ?? user.id;
    return this.disputesService.addEvidence(id, submittedById, submittedByType, dto, {
      internalUserId: user.internalUser?.id ?? null,
      farmerId: user.farmer?.id ?? null,
      buyerId: user.buyer?.id ?? null,
    });
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.DISPUTE_HANDLER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  close(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('resolutionNotes') resolutionNotes: string,
  ) {
    return this.disputesService.close(id, user.internalUser.id, resolutionNotes);
  }
}


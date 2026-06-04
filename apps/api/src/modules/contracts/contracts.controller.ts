import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InternalRole, ContractStatus } from '@prisma/client';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.CONTRACT_OFFICER)
  findAll(
    @Query() dto: PaginationDto,
    @Query('status') status?: ContractStatus,
    @Query('farmerId') farmerId?: string,
    @Query('buyerId') buyerId?: string,
  ) {
    return this.contractsService.findAll({ ...dto, status, farmerId, buyerId });
  }

  @Get('my')
  getMyContracts(
    @CurrentUser() user: any,
    @Query() dto: PaginationDto,
    @Query('status') status?: ContractStatus,
  ) {
    const farmerId = user.farmer?.id;
    const buyerId = user.buyer?.id;
    return this.contractsService.findAll({ ...dto, status, farmerId, buyerId });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  getStats() {
    return this.contractsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.CONTRACT_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  create(@Body() dto: CreateContractDto, @CurrentUser() user: any) {
    return this.contractsService.create(dto, user.internalUser?.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.CONTRACT_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('status') status: ContractStatus,
    @Body('notes') notes?: string,
  ) {
    return this.contractsService.updateStatus(id, status, user.internalUser?.id, notes);
  }

  @Post(':id/sign')
  sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    // signerType is derived from JWT, never trusted from body. Service
    // additionally verifies the caller IS that party of the contract.
    return this.contractsService.sign(id, {
      farmerId: user.farmer?.id ?? null,
      buyerId: user.buyer?.id ?? null,
    });
  }
}


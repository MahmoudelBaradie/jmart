import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import {
  InternalRole,
  InvoiceStatus,
  InvoiceType,
  PayoutStatus,
  RefundStatus,
} from '@prisma/client';
import { FinancialService } from './financial.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ApprovePayoutDto } from './dto/approve-payout.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Financial')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  // ─── MY (FARMER / BUYER) ─────────────────────────────────────────────────────

  @Get('invoices/my')
  @ApiOperation({ summary: 'Get my invoices (buyer or farmer)' })
  async getMyInvoices(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('status') status?: InvoiceStatus,
  ) {
    const recipientId = user.buyer?.id ?? user.farmer?.id;
    return this.financialService.getInvoices({ ...pagination, status, recipientId });
  }

  @Get('payouts/my')
  @ApiOperation({ summary: 'Get my payouts (farmer)' })
  async getMyPayouts(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('status') status?: PayoutStatus,
  ) {
    const farmerId = user.farmer?.id;
    return this.financialService.getPayouts({ ...pagination, status, farmerId });
  }

  @Get('summary/my')
  @ApiOperation({ summary: 'Get my financial summary (farmer or buyer)' })
  async getMySummary(@CurrentUser() user: any) {
    return this.financialService.getMyFinancialSummary(user.farmer?.id, user.buyer?.id);
  }

  // ─── INVOICES ────────────────────────────────────────────────────────────────

  @Get('invoices')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all invoices' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'invoiceType', enum: InvoiceType, required: false })
  async getInvoices(
    @Query() pagination: PaginationDto,
    @Query('status') status?: InvoiceStatus,
    @Query('invoiceType') invoiceType?: InvoiceType,
  ) {
    return this.financialService.getInvoices({ ...pagination, status, invoiceType });
  }

  @Get('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get invoice by ID with payments' })
  async getInvoiceById(@Param('id', ParseUUIDPipe) id: string) {
    return this.financialService.getInvoiceById(id);
  }

  @Post('invoices')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new invoice (DRAFT)' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.financialService.createInvoice(dto);
  }

  @Post('invoices/:id/issue')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a draft invoice' })
  async issueInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.financialService.issueInvoice(id);
  }

  @Post('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  async recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    const recordedById = user.internalUser?.id ?? user.id;
    return this.financialService.recordPayment(id, dto, recordedById);
  }

  // ─── PAYOUTS ─────────────────────────────────────────────────────────────────

  @Get('payouts')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all payouts' })
  @ApiQuery({ name: 'status', enum: PayoutStatus, required: false })
  @ApiQuery({ name: 'recipientType', required: false })
  async getPayouts(
    @Query() pagination: PaginationDto,
    @Query('status') status?: PayoutStatus,
    @Query('recipientType') recipientType?: string,
  ) {
    return this.financialService.getPayouts({ ...pagination, status, recipientType });
  }

  @Post('payouts/approve')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch approve queued/pending payouts' })
  async approvePayouts(
    @Body() dto: ApprovePayoutDto,
    @CurrentUser() user: any,
  ) {
    const approvedById = user.internalUser?.id ?? user.id;
    return this.financialService.approvePayouts(dto, approvedById);
  }

  // ─── REFUNDS ─────────────────────────────────────────────────────────────────

  @Get('refunds')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all refunds' })
  @ApiQuery({ name: 'status', enum: RefundStatus, required: false })
  async getRefunds(
    @Query() pagination: PaginationDto,
    @Query('status') status?: RefundStatus,
  ) {
    return this.financialService.getRefunds({ ...pagination, status });
  }

  @Post('refunds')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a refund request' })
  async createRefund(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: any,
  ) {
    const initiatedById = user.internalUser?.id ?? user.id;
    return this.financialService.createRefund(dto, initiatedById);
  }

  @Post('refunds/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending refund' })
  async approveRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const approvedById = user.internalUser?.id ?? user.id;
    return this.financialService.approveRefund(id, approvedById);
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────────

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.FINANCE_OFFICER, InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform-wide financial summary' })
  async getFinancialSummary() {
    return this.financialService.getFinancialSummary();
  }
}

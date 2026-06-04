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
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { InternalRole, OrderStatus, OrderType } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListMyOrdersDto } from './dto/list-my-orders.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'List all orders (internal)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'orderType', enum: OrderType, required: false })
  @ApiQuery({ name: 'buyerId', required: false })
  @ApiQuery({ name: 'farmerId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus,
    @Query('buyerId') buyerId?: string,
    @Query('farmerId') farmerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.findAll({
      ...pagination,
      status,
      buyerId,
      farmerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my orders (buyer or farmer)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'as', enum: ['buyer', 'farmer'], required: false, description: 'Force role view when user has both buyer and farmer profiles (demo accounts).' })
  async getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyOrdersDto,
    @Query('as') roleView?: 'buyer' | 'farmer',
  ) {
    // Evaluate getters on the class instance BEFORE spreading so skip/take
    // are not lost when the spread creates a plain object without a prototype.
    const pagination = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      skip: query.skip,
      take: query.take,
    };

    const farmerId = user.farmer?.id;
    const buyerId = user.buyer?.id;

    // For dual-role users (e.g. demo), the caller specifies which role's
    // orders to return. Without ?as, fall back to farmer-first (preserves
    // pre-existing behaviour for single-role accounts).
    if (roleView === 'buyer' && buyerId) {
      return this.ordersService.getMyOrders(buyerId, {
        ...pagination,
        status: query.status as OrderStatus | undefined,
      });
    }
    if (roleView === 'farmer' && farmerId) {
      return this.ordersService.getMyFarmerOrders(farmerId, {
        ...pagination,
        status: query.status as OrderStatus | undefined,
      });
    }

    if (farmerId) {
      return this.ordersService.getMyFarmerOrders(farmerId, {
        ...pagination,
        status: query.status as OrderStatus | undefined,
      });
    }
    if (buyerId) {
      return this.ordersService.getMyOrders(buyerId, {
        ...pagination,
        status: query.status as OrderStatus | undefined,
      });
    }
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  @Get('stats')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get order statistics by status (internal)' })
  async getStats() {
    return this.ordersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (authorized parties only)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findOneAuthorized(id, {
      internalUserId: user.internalUser?.id ?? null,
      buyerId: user.buyer?.id ?? null,
      farmerId: user.farmer?.id ?? null,
      driverId: (user as any).driver?.id ?? null,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order (buyer)' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    const buyerId = user.buyer?.id;
    if (!buyerId) throw new ForbiddenException('Only buyers can create orders');
    return this.ordersService.create(buyerId, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft order (buyer)' })
  async submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const buyerId = user.buyer?.id;
    if (!buyerId) throw new ForbiddenException('Only buyers can submit orders');
    return this.ordersService.submit(id, buyerId);
  }

  @Patch(':id/status')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'Update order status (internal)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const changedById = user.internalUser?.id ?? user.id;
    return this.ordersService.updateStatus(id, dto, changedById);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (buyer or ops)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const changedById = user.internalUser?.id ?? user.buyer?.id ?? user.id;
    return this.ordersService.cancel(id, reason ?? 'No reason provided', changedById, {
      internalUserId: user.internalUser?.id ?? null,
      buyerId: user.buyer?.id ?? null,
    });
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Farmer accepts (confirms) an order containing their items' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const farmerId = user.farmer?.id;
    if (!farmerId) throw new ForbiddenException('Only farmers can accept orders');
    return this.ordersService.acceptOrder(id, farmerId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Farmer rejects an order (cancels + releases reserved stock)' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const farmerId = user.farmer?.id;
    if (!farmerId) throw new ForbiddenException('Only farmers can reject orders');
    return this.ordersService.rejectOrder(id, farmerId, reason ?? '');
  }
}

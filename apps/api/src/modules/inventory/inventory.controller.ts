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
import { InventoryService, CatalogQueryDto } from './inventory.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';
import { LotsQueryDto } from './dto/lots-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalRole, LotStatus } from '@prisma/client';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── Catalog endpoints ───────────────────────────────────────────────────────

  @Get('catalog')
  @ApiOperation({ summary: 'Browse available farmer catalog listings' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'farmerId', required: false, type: String })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  async getCatalog(
    @Query() dto: PaginationDto,
    @Query('productId') productId?: string,
    @Query('farmerId') farmerId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.inventoryService.getCatalog({ ...dto, productId, farmerId, zoneId });
  }

  @Get('catalog/my')
  @ApiOperation({ summary: "Get the logged-in farmer's catalog listings" })
  async getMyCatalog(@CurrentUser() user: any) {
    return this.inventoryService.getFarmerCatalog(user.farmer.id);
  }

  @Post('catalog')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new catalog listing (farmer only)' })
  async createCatalogItem(
    @CurrentUser() user: any,
    @Body() dto: CreateCatalogItemDto,
  ) {
    return this.inventoryService.createCatalogItem(user.farmer.id, dto);
  }

  @Patch('catalog/:id')
  @ApiOperation({ summary: 'Update an existing catalog listing (farmer owner only)' })
  async updateCatalogItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateCatalogItemDto>,
  ) {
    return this.inventoryService.updateCatalogItem(id, user.farmer.id, dto);
  }

  // ─── Lot endpoints ───────────────────────────────────────────────────────────

  /**
   * Public marketplace: accessible to all authenticated users (farmers, buyers, internal).
   * Returns ACTIVE lots by default; supports categoryId filtering.
   */
  @Get('lots')
  @ApiOperation({ summary: 'Browse available inventory lots (marketplace)' })
  async getMarketLots(@Query() dto: LotsQueryDto) {
    return this.inventoryService.getLots({
      ...dto,
      status: dto.status ?? LotStatus.AVAILABLE,
    });
  }

  /**
   * Internal management: restricted to ops/warehouse roles.
   */
  @Get('lots/manage')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST, InternalRole.WAREHOUSE_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List inventory lots with filters (internal)' })
  async getLots(@Query() dto: LotsQueryDto) {
    return this.inventoryService.getLots({ ...dto });
  }

  @Post('lots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new inventory lot (farmer only)' })
  async createLot(
    @CurrentUser() user: any,
    @Body() dto: CreateLotDto,
  ) {
    return this.inventoryService.createLot(user.farmer.id, dto);
  }

  @Get('lots/:id')
  @ApiOperation({ summary: 'Get a single inventory lot with full details' })
  async getLotById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getLotById(id);
  }

  @Patch('lots/:id/status')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST, InternalRole.WAREHOUSE_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update lot status (internal)' })
  async updateLotStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLotStatusDto,
  ) {
    return this.inventoryService.updateLotStatus(id, dto);
  }

  @Patch('catalog/:id/price/admin')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.OPS_MANAGER, InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin override catalog item price' })
  async adminUpdateCatalogPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('pricePerUnit') pricePerUnit: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const updatedBy = user.internalUser?.id ?? user.id;
    return this.inventoryService.updateCatalogPriceByAdmin(id, pricePerUnit, updatedBy, reason);
  }

  @Patch('catalog/:id/price')
  @ApiOperation({ summary: 'Update catalog item price (farmer)' })
  async updateCatalogPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('pricePerUnit') pricePerUnit: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.updateCatalogItemPrice(id, user.farmer.id, pricePerUnit, reason);
  }

  @Get('price-history/:productId')
  @ApiOperation({ summary: 'Get price history for a product' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of past days (default 30)' })
  async getPriceHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.inventoryService.getPriceHistory(productId, days);
  }
}

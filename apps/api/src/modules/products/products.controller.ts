import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const { SUPER_ADMIN, OPS_MANAGER, OPS_SPECIALIST } = InternalRole;

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 25,
      search,
      categoryId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // ── Static routes BEFORE /:id to avoid route collision ──

  @Get('price-overview')
  @UseGuards(RolesGuard)
  @Roles(SUPER_ADMIN, OPS_MANAGER, OPS_SPECIALIST)
  @ApiOperation({ summary: 'Price overview: all products with live lot prices vs range (admin)' })
  async getPriceOverview() {
    return this.productsService.getPriceOverview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(SUPER_ADMIN, OPS_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(SUPER_ADMIN, OPS_MANAGER, OPS_SPECIALIST)
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/price-range')
  @UseGuards(RolesGuard)
  @Roles(SUPER_ADMIN, OPS_MANAGER)
  @ApiOperation({ summary: 'Set price floor/ceiling for a product (admin)' })
  @ApiBody({ schema: { properties: { priceFloor: { type: 'number', nullable: true }, priceCeiling: { type: 'number', nullable: true } } } })
  async setPriceRange(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('priceFloor') priceFloor?: number | null,
    @Body('priceCeiling') priceCeiling?: number | null,
  ) {
    return this.productsService.setPriceRange(
      id,
      priceFloor ?? null,
      priceCeiling ?? null,
    );
  }

  @Patch(':id/price')
  @UseGuards(RolesGuard)
  @Roles(SUPER_ADMIN, OPS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set the central admin price for a product (cascades to all farmer catalog items)',
  })
  @ApiBody({ schema: { properties: { pricePerUnit: { type: 'number', example: 11.25 } } } })
  async setPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('pricePerUnit') pricePerUnit: number,
    @CurrentUser() user: any,
  ) {
    return this.productsService.setCentralPrice(id, pricePerUnit, user.internalUser?.id ?? user.id);
  }
}

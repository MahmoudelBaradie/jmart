import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalRole } from '@prisma/client';
import {
  CategoriesService,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './categories.service';

const { SUPER_ADMIN, OPS_MANAGER, OPS_SPECIALIST } = InternalRole;

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── GET /categories — paginated list ──────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List product categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.categoriesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      parentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // ── GET /categories/flat — all active for dropdowns ───────────────────────
  @Get('flat')
  @ApiOperation({ summary: 'All active categories (flat list for dropdowns)' })
  async findFlat() {
    return this.categoriesService.findAllFlat();
  }

  // ── GET /categories/products — products with optional category filter ─────
  @Get('products')
  @ApiOperation({ summary: 'List products (optionally filtered by category)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findProducts(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.categoriesService.findAllProducts({
      categoryId,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : true,
    });
  }

  // ── GET /categories/:id ───────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  // ── GET /categories/:id/products ─────────────────────────────────────────
  @Get(':id/products')
  @ApiOperation({ summary: 'Get products in a category' })
  async findCategoryProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('search') search?: string,
  ) {
    return this.categoriesService.findProducts(id, search);
  }

  // ── POST /categories ──────────────────────────────────────────────────────
  @Post()
  @Roles(SUPER_ADMIN, OPS_MANAGER)
  @ApiOperation({ summary: 'Create product category' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // ── PATCH /categories/:id ─────────────────────────────────────────────────
  @Patch(':id')
  @Roles(SUPER_ADMIN, OPS_MANAGER, OPS_SPECIALIST)
  @ApiOperation({ summary: 'Update category' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  // ── DELETE /categories/:id ────────────────────────────────────────────────
  @Delete(':id')
  @Roles(SUPER_ADMIN, OPS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate category' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deactivate(id);
  }
}

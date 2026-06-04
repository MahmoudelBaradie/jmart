import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, StorageType } from '@prisma/client';

export interface CreateCategoryDto {
  code: string;
  name: string;
  nameAr?: string;
  parentId?: string;
  storageType: StorageType;
  tempMinC?: number;
  tempMaxC?: number;
  maxHoursTransit?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  isActive?: boolean;
}

export interface CategoriesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
  includeProducts?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ───────────────────────────────────────────────────────────────────

  async findAll(dto: CategoriesQueryDto) {
    const where: Prisma.ProductCategoryWhereInput = {
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.parentId !== undefined && {
        parentId: dto.parentId === 'null' ? null : dto.parentId,
      }),
      ...(dto.search && {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { nameAr: { contains: dto.search, mode: 'insensitive' } },
          { code: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 50);
    const take = dto.limit ?? 50;

    const [data, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        skip,
        take,
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        include: {
          parent: { select: { id: true, name: true, nameAr: true, code: true } },
          _count: { select: { children: true, products: true } },
        },
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      data: data.map((c) => this.format(c)),
      meta: {
        total,
        page: dto.page ?? 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // ─── All flat (for dropdowns) ────────────────────────────────────────────────

  async findAllFlat() {
    const cats = await this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        _count: { select: { products: true } },
      },
    });
    return cats.map((c) => this.format(c));
  }

  // ─── Single ─────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const cat = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, nameAr: true, code: true } },
        children: {
          select: { id: true, name: true, nameAr: true, code: true, isActive: true },
          orderBy: { name: 'asc' },
        },
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            nameAr: true,
            unitOfMeasure: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
          take: 100,
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!cat) throw new NotFoundException('Category not found');
    return this.format(cat);
  }

  // ─── Products of a category ─────────────────────────────────────────────────

  async findProducts(categoryId: string, search?: string) {
    const cat = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    const products = await this.prisma.product.findMany({
      where: {
        categoryId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameAr: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });

    return products;
  }

  // ─── All products (with optional category filter) ───────────────────────────

  async findAllProducts(params: {
    categoryId?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.categoryId && { categoryId: params.categoryId }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { nameAr: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        category: {
          select: { id: true, name: true, nameAr: true, code: true },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    return products;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.productCategory.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new ConflictException('Category code already exists');

    if (dto.parentId) {
      const parent = await this.prisma.productCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const cat = await this.prisma.productCategory.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        nameAr: dto.nameAr,
        parentId: dto.parentId ?? null,
        storageType: dto.storageType,
        tempMinC: dto.tempMinC,
        tempMaxC: dto.tempMaxC,
        maxHoursTransit: dto.maxHoursTransit,
      },
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return this.format(cat);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.code) {
      const conflict = await this.prisma.productCategory.findFirst({
        where: { code: dto.code.toUpperCase(), id: { not: id } },
      });
      if (conflict) throw new ConflictException('Category code already exists');
    }

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.name && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId ?? null }),
        ...(dto.storageType && { storageType: dto.storageType }),
        ...(dto.tempMinC !== undefined && { tempMinC: dto.tempMinC }),
        ...(dto.tempMaxC !== undefined && { tempMaxC: dto.tempMaxC }),
        ...(dto.maxHoursTransit !== undefined && {
          maxHoursTransit: dto.maxHoursTransit,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return this.format(updated);
  }

  // ─── Delete (deactivate) ─────────────────────────────────────────────────────

  async deactivate(id: string) {
    await this.findOne(id);
    await this.prisma.productCategory.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Category deactivated' };
  }

  // ─── Format ─────────────────────────────────────────────────────────────────

  private format(cat: any) {
    return {
      id: cat.id,
      code: cat.code,
      name: cat.name,
      nameAr: cat.nameAr,
      storageType: cat.storageType,
      tempMinC: cat.tempMinC ? Number(cat.tempMinC) : null,
      tempMaxC: cat.tempMaxC ? Number(cat.tempMaxC) : null,
      maxHoursTransit: cat.maxHoursTransit,
      isActive: cat.isActive,
      parentId: cat.parentId,
      parent: cat.parent ?? null,
      children: cat.children ?? undefined,
      products: cat.products ?? undefined,
      productsCount: cat._count?.products ?? 0,
      childrenCount: cat._count?.children ?? 0,
      createdAt: cat.createdAt,
    };
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalRole, PricingMode, OutOfRangeAction } from '@prisma/client';
import { PricingService } from './pricing.service';

class UpdateSystemSettingsDto {
  @IsOptional() @IsEnum(PricingMode)
  pricingMode?: PricingMode;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  defaultFlexibilityPct?: number;

  @IsOptional() @IsEnum(OutOfRangeAction)
  outOfRangeAction?: OutOfRangeAction;
}

class UpdateCategoryPricingDto {
  // Explicit null is allowed (clears override). We use ValidateIf so the enum
  // check only runs when the caller actually sent a non-null enum value.
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(PricingMode)
  pricingModeOverride?: PricingMode | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(0) @Max(100)
  flexibilityPctOverride?: number | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(OutOfRangeAction)
  outOfRangeActionOverride?: OutOfRangeAction | null;
}

class UpdateProductPricingDto extends UpdateCategoryPricingDto {}

@ApiTags('Pricing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  // ─── System settings ─────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get system-wide pricing settings' })
  getSettings() {
    return this.pricing.getSystemSettings();
  }

  @Patch('settings')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Update system-wide pricing settings' })
  updateSettings(@Body() dto: UpdateSystemSettingsDto, @CurrentUser('id') userId: string) {
    return this.pricing.updateSystemSettings(dto, userId);
  }

  // ─── Resolved config (any authenticated user) ────────────────────
  @Get('resolve/product/:id')
  @ApiOperation({ summary: 'Resolve effective pricing config for a product (cascade)' })
  resolveProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricing.resolveForProduct(id);
  }

  @Get('resolve/category/:id')
  @ApiOperation({ summary: 'Show resolved + override + system default for a category' })
  resolveCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricing.resolveForCategory(id);
  }

  // ─── Daily pricing board (admin specialist screen) ─────────────
  @Get('board')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'All-products pricing board with yesterday price, sparkline, listings count' })
  board(@Query('categoryId') categoryId?: string) {
    return this.pricing.getBoard(categoryId);
  }

  @Patch('board/bulk')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Apply multiple central-price changes at once (per-product result + summary)' })
  bulkUpdate(
    @Body() body: { changes: Array<{ productId: string; newPrice: number; reason?: string }> },
    @CurrentUser('id') userId: string,
  ) {
    return this.pricing.bulkUpdate(body?.changes ?? [], userId);
  }

  // ─── Price history ───────────────────────────────────────────────
  @Get('history/product/:id')
  @ApiOperation({ summary: 'Get price change history for a product' })
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: string,
  ) {
    return this.pricing.getPriceHistory(id, days ? parseInt(days, 10) : 90);
  }

  // ─── Category override ───────────────────────────────────────────
  @Patch('category/:id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Set/clear category pricing overrides (null clears)' })
  async setCategoryOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryPricingDto,
  ) {
    // We accept explicit null in the body to clear an override; undefined leaves it alone.
    const data: any = {};
    if ('pricingModeOverride' in dto)      data.pricingModeOverride = dto.pricingModeOverride;
    if ('flexibilityPctOverride' in dto)   data.flexibilityPctOverride = dto.flexibilityPctOverride;
    if ('outOfRangeActionOverride' in dto) data.outOfRangeActionOverride = dto.outOfRangeActionOverride;
    // Delegate the actual update to the categories module via prisma directly —
    // this is a thin pass-through to keep the override surface in one place.
    return (this.pricing as any).prisma.productCategory.update({ where: { id }, data });
  }

  // ─── Product override ────────────────────────────────────────────
  @Patch('product/:id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Set/clear product pricing overrides (null clears)' })
  async setProductOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductPricingDto,
  ) {
    const data: any = {};
    if ('pricingModeOverride' in dto)      data.pricingModeOverride = dto.pricingModeOverride;
    if ('flexibilityPctOverride' in dto)   data.flexibilityPctOverride = dto.flexibilityPctOverride;
    if ('outOfRangeActionOverride' in dto) data.outOfRangeActionOverride = dto.outOfRangeActionOverride;
    return (this.pricing as any).prisma.product.update({ where: { id }, data });
  }
}

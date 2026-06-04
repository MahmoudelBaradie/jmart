import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLotDto {
  @ApiPropertyOptional({ description: 'Farm UUID where the lot was harvested' })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional({ description: 'Farmer catalog item UUID this lot is linked to' })
  @IsOptional()
  @IsUUID()
  catalogItemId?: string;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Grade of produce (e.g. A, B, Premium)', example: 'A' })
  @IsString()
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ description: 'Packaging type (e.g. crate, sack)', example: 'crate' })
  @IsString()
  @IsNotEmpty()
  packaging: string;

  @ApiProperty({ description: 'Total weight of the lot in kilograms', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  totalWeightKg: number;

  @ApiProperty({ description: 'Price per kilogram in local currency', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  pricePerKg: number;

  // Typed as `string` (not Date) so the global ValidationPipe with
  // `enableImplicitConversion: true` does NOT coerce to Date before
  // `@IsDateString` runs — that race made all ISO inputs fail.
  // The service converts to `new Date(...)` when writing.
  @ApiPropertyOptional({ description: 'Harvest date (ISO 8601)', example: '2026-05-18' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({ description: 'Expiry or best-before date (ISO 8601)', example: '2026-06-18' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Physical storage location description' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Warehouse UUID where the lot is stored' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the lot' })
  @IsOptional()
  @IsString()
  notes?: string;
}

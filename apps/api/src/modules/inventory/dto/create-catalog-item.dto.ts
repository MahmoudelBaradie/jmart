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

export class CreateCatalogItemDto {
  @ApiPropertyOptional({ description: 'Farm UUID where produce originates' })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiProperty({ description: 'Product UUID from the product catalogue' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Grade offered (e.g. A, B, Premium)', example: 'A' })
  @IsString()
  @IsNotEmpty()
  gradeOffered: string;

  @ApiProperty({ description: 'Packaging type offered (e.g. crate, sack, carton)', example: 'crate' })
  @IsString()
  @IsNotEmpty()
  packagingOffered: string;

  @ApiProperty({ description: 'Price per unit in local currency', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  pricePerUnit: number;

  @ApiProperty({ description: 'Available quantity in units', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  availableQty: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderQty?: number;

  @ApiPropertyOptional({ description: 'Harvest date (ISO 8601 date string)', example: '2026-05-20' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({ description: 'Estimated delivery date (ISO 8601 date string)', example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}

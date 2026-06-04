import {
  IsUUID, IsString, IsOptional, IsArray, IsNumber,
  IsPositive, Min, Max, MinLength, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'VEG-TOM-001' })
  @IsString()
  @MinLength(1)
  sku: string;

  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'طماطم' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({ example: 'KG' })
  @IsString()
  @MinLength(1)
  unitOfMeasure: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  minOrderQty?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxOrderQty?: number;

  @ApiPropertyOptional({ example: ['A', 'B'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gradeOptions?: string[];
}

import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
  IsNumber,
  IsPositive,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '@prisma/client';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Farmer UUID' })
  @IsUUID()
  farmerId: string;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'A', description: 'Produce grade' })
  @IsString()
  @MinLength(1)
  grade: string;

  @ApiProperty({ example: '25kg bag', description: 'Packaging type' })
  @IsString()
  @MinLength(1)
  packaging: string;

  @ApiProperty({ example: 500, description: 'Requested quantity in kilograms' })
  @IsNumber()
  @IsPositive()
  requestedQtyKg: number;

  @ApiProperty({ example: 12.5, description: 'Price per kilogram' })
  @IsNumber()
  @IsPositive()
  pricePerKg: number;

  @ApiPropertyOptional({ description: 'Inventory lot UUID to pull from' })
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Buyer branch UUID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ description: 'Pickup zone UUID' })
  @IsUUID()
  pickupZoneId: string;

  @ApiProperty({ description: 'Delivery zone UUID' })
  @IsUUID()
  deliveryZoneId: string;

  @ApiProperty({ example: '123 Market Street, Riyadh' })
  @IsString()
  @MinLength(5)
  deliveryAddress: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  requestedDeliveryDate: string;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.SPOT })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType = OrderType.SPOT;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Order line items (min 1)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VehicleType } from '@prisma/client';

export class CreateShippingRateDto {
  @ApiProperty({ description: 'UUID of the source zone' })
  @IsUUID()
  fromZoneId: string;

  @ApiProperty({ description: 'UUID of the destination zone' })
  @IsUUID()
  toZoneId: string;

  @ApiProperty({ enum: VehicleType, description: 'Vehicle type for this rate' })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiProperty({ description: 'Rate type identifier (e.g. STANDARD, EXPRESS)', example: 'STANDARD' })
  @IsString()
  @IsNotEmpty()
  rateType: string;

  @ApiProperty({ description: 'Base flat rate charge', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseRate: number;

  @ApiPropertyOptional({ description: 'Additional charge per kilogram', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  perKgRate?: number;

  @ApiPropertyOptional({ description: 'Additional charge per kilometre', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  perKmRate?: number;

  @ApiPropertyOptional({ description: 'Minimum total charge', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minCharge?: number;

  @ApiPropertyOptional({ description: 'Maximum total charge cap', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxCharge?: number;

  @ApiProperty({ description: 'Date from which this rate becomes effective (ISO 8601)' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Date on which this rate expires (ISO 8601). Omit for open-ended.' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

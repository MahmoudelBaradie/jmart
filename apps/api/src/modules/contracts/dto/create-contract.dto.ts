import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContractType,
  PriceLockType,
  SettlementFrequency,
  BreachSeverity,
} from '@prisma/client';

export class ContractItemDto {
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

  @ApiProperty({ example: 1000, description: 'Committed weekly quantity in kilograms' })
  @IsNumber()
  @IsPositive()
  weeklyQtyKg: number;

  @ApiProperty({ example: 11.5, description: 'Agreed price per kilogram' })
  @IsNumber()
  @IsPositive()
  pricePerKg: number;

  @ApiPropertyOptional({ example: 10, description: 'Tolerance percentage (default 10%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerancePct?: number = 10;
}

export class PenaltyClauseDto {
  @ApiProperty({ example: 'LATE_DELIVERY', description: 'Type of breach' })
  @IsString()
  @MinLength(1)
  breachType: string;

  @ApiProperty({ enum: BreachSeverity, description: 'Severity of the breach' })
  @IsEnum(BreachSeverity)
  breachSeverity: BreachSeverity;

  @ApiPropertyOptional({ example: 2.5, description: 'Penalty as a percentage of order value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyPct?: number;

  @ApiPropertyOptional({ example: 500, description: 'Fixed penalty amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyFixed?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Maximum penalty cap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPenalty?: number;

  @ApiPropertyOptional({ example: 24, description: 'Grace window in hours before penalty applies' })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceWindowHours?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateContractDto {
  @ApiProperty({ description: 'Farmer UUID' })
  @IsUUID()
  farmerId: string;

  @ApiProperty({ description: 'Buyer UUID' })
  @IsUUID()
  buyerId: string;

  @ApiProperty({ example: 'Weekly Tomato Supply Agreement', description: 'Contract title' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ enum: ContractType, default: ContractType.SUPPLY })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType = ContractType.SUPPLY;

  @ApiProperty({ example: '2026-06-01', description: 'Contract start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Contract end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: PriceLockType, default: PriceLockType.MARKET_RATE })
  @IsOptional()
  @IsEnum(PriceLockType)
  priceLockType?: PriceLockType = PriceLockType.MARKET_RATE;

  @ApiPropertyOptional({ example: 500000, description: 'Estimated total contract value' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalValueEstimated?: number;

  @ApiPropertyOptional({ enum: SettlementFrequency, default: SettlementFrequency.PER_ORDER })
  @IsOptional()
  @IsEnum(SettlementFrequency)
  settlementFrequency?: SettlementFrequency = SettlementFrequency.PER_ORDER;

  @ApiPropertyOptional({ example: 30, description: 'Payment terms in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number = 0;

  @ApiPropertyOptional({ example: false, description: 'Whether contract auto-renews' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 500, description: 'Minimum total volume in specified unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalVolumeMin?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum total volume in specified unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalVolumeMax?: number;

  @ApiPropertyOptional({ example: 'ton', description: 'Volume unit' })
  @IsOptional()
  @IsString()
  volumeUnit?: string;

  @ApiPropertyOptional({ example: 30, description: 'Renewal notice days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  renewalNoticeDays?: number;

  @ApiPropertyOptional({ description: 'Contract description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Internal notes (admin only)' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ type: [ContractItemDto], description: 'Contract line items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  items?: ContractItemDto[];

  @ApiPropertyOptional({ type: [PenaltyClauseDto], description: 'Optional penalty clauses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PenaltyClauseDto)
  penaltyClauses?: PenaltyClauseDto[];
}

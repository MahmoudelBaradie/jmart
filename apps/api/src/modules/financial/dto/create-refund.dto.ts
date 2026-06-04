import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundType, RefundMethod } from '@prisma/client';

export class CreateRefundDto {
  @ApiProperty({ description: 'UUID of the original payment being refunded' })
  @IsUUID()
  originalPaymentId: string;

  @ApiPropertyOptional({ description: 'UUID of the associated order' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'UUID of the associated dispute' })
  @IsOptional()
  @IsUUID()
  disputeId?: string;

  @ApiProperty({ enum: RefundType })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiProperty({ enum: RefundMethod })
  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;

  @ApiProperty({ description: 'Refund amount (must be greater than 0)' })
  @IsNumber()
  @Min(0.01)
  refundAmount: number;

  @ApiProperty({ description: 'Reason for the refund' })
  @IsString()
  reason: string;
}

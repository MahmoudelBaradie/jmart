import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({ description: 'Payment amount (must be greater than 0)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payment method (e.g., BANK_TRANSFER, CASH, CREDIT_CARD)' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'External transaction reference from payment gateway' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

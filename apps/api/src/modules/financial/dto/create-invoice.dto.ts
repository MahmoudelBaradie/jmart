import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType } from '@prisma/client';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'UUID of the associated order' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiPropertyOptional({ description: 'UUID of the issuing entity (defaults to platform)' })
  @IsOptional()
  @IsUUID()
  issuerId?: string;

  @ApiPropertyOptional({ description: 'Issuer type: PLATFORM, FARMER, etc.', default: 'PLATFORM' })
  @IsOptional()
  @IsString()
  issuerType?: string;

  @ApiProperty({ description: 'UUID of the recipient entity' })
  @IsUUID()
  recipientId: string;

  @ApiPropertyOptional({ description: 'Recipient type: BUYER, FARMER, etc.', default: 'BUYER' })
  @IsOptional()
  @IsString()
  recipientType?: string;

  @ApiPropertyOptional({ description: 'Invoice line items (JSON)', type: Array })
  @IsOptional()
  @IsArray()
  lineItems?: any[];

  @ApiProperty({ description: 'Subtotal before tax and discounts' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Tax amount', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({ description: 'Total amount due' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Due date for payment (ISO date string)' })
  @IsDateString()
  dueDate: string;
}

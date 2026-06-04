import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuyerType } from '@prisma/client';

export class CreateBuyerDto {
  @ApiProperty({ example: 'Al-Noor Trading Co.' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiProperty({ enum: BuyerType })
  @IsEnum(BuyerType)
  buyerType: BuyerType;

  @ApiProperty({ example: 'Mohammed Al-Otaibi' })
  @IsString()
  contactPersonName: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: '1010123456' })
  @IsOptional()
  @IsString()
  commercialRegNo?: string;
}

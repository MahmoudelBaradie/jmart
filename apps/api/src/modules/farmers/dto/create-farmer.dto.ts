import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FarmerType } from '@prisma/client';

export class CreateFarmerDto {
  @ApiProperty({ example: 'Al-Hada Farms LLC' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiProperty({ enum: FarmerType })
  @IsEnum(FarmerType)
  farmerType: FarmerType;

  @ApiProperty({ example: 'Ahmed Al-Ghamdi' })
  @IsString()
  contactPersonName: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ example: '1010123456' })
  @IsOptional()
  @IsString()
  commercialRegNo?: string;

  @ApiPropertyOptional({ example: 'SA0380000000608010167519' })
  @IsOptional()
  @IsString()
  bankAccountIban?: string;

  @ApiPropertyOptional({ example: 'Al Rajhi Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;
}

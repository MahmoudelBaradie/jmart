import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';

export class KycReviewDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: KycStatus;

  @ApiPropertyOptional({ example: 'Documents are incomplete' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LotStatus } from '@prisma/client';

export class UpdateLotStatusDto {
  @ApiProperty({ enum: LotStatus, description: 'New status for the inventory lot' })
  @IsEnum(LotStatus)
  status: LotStatus;

  @ApiPropertyOptional({ description: 'Reason or additional notes for the status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}

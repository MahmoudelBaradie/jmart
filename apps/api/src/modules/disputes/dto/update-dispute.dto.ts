import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeResponsibility, DisputeStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateDisputeDto {
  @ApiPropertyOptional({ enum: DisputeStatus, description: 'New status of the dispute' })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ enum: DisputeResponsibility, description: 'Assigned responsibility party' })
  @IsOptional()
  @IsEnum(DisputeResponsibility)
  responsibility?: DisputeResponsibility;

  @ApiPropertyOptional({ example: 1200.00, description: 'Resolved amount after negotiation' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  resolvedAmount?: number;

  @ApiPropertyOptional({ example: 'Both parties agreed on a 20% refund.', description: 'Notes from the resolution' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Internal user ID to assign the dispute to' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

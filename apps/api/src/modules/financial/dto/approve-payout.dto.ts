import { IsUUID, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovePayoutDto {
  @ApiProperty({ description: 'Array of payout UUIDs to approve', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  payoutIds: string[];

  @ApiPropertyOptional({ description: 'Optional notes about the approval decision' })
  @IsOptional()
  @IsString()
  notes?: string;
}

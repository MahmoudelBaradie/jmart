import { IsOptional, IsIn, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DisputeStatus } from '@prisma/client';

export class ListMyDisputesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DisputeStatus, description: 'Filter by dispute status' })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({
    enum: ['buyer', 'farmer'],
    description: 'For dual-role users: which role\'s disputes to return.',
  })
  @IsOptional()
  @IsIn(['buyer', 'farmer'])
  as?: 'buyer' | 'farmer';
}

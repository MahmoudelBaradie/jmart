import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OrderStatus } from '@prisma/client';

export class ListMyOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by order status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['buyer', 'farmer'],
    description: 'For dual-role users: which role\'s orders to return.',
  })
  @IsOptional()
  @IsIn(['buyer', 'farmer'])
  as?: 'buyer' | 'farmer';
}

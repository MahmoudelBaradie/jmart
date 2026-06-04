import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListBannersQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by active state. Omit to return both active and inactive (admin view).',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by exact zone match (admin view).' })
  @IsOptional()
  @IsUUID()
  geoZoneId?: string;
}

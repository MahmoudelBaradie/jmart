import {
  IsBoolean, IsDateString, IsHexColor, IsInt, IsOptional, IsString, IsUUID,
  IsUrl, Length, Max, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBannerDto {
  @ApiProperty({ example: 'عروض اليوم' })
  @IsString()
  @Length(1, 120)
  titleAr: string;

  @ApiPropertyOptional({ example: "Today's Deals" })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  subtitleAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  subtitleEn?: string;

  @ApiPropertyOptional({ example: 'https://cdn.jmart.sa/banners/spring-sale.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({ example: '🌾' })
  @IsOptional()
  @IsString()
  @Length(1, 8)
  emoji?: string;

  @ApiPropertyOptional({ example: '/marketplace?category=fruits' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  linkUrl?: string;

  /// Accepts hex (#16a34a) or a free-form CSS class string (handled at UI layer)
  @ApiPropertyOptional({ example: '#16a34a' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Null = global; otherwise zone UUID' })
  @IsOptional()
  @IsUUID()
  geoZoneId?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

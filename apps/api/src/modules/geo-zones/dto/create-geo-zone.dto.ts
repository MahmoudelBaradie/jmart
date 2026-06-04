import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ZoneLevel, ZoneStatus } from '@prisma/client';

export class CreateGeoZoneDto {
  @ApiProperty({ description: 'Unique zone code (e.g. SA-RIYADH-001)' })
  @IsString()
  @IsNotEmpty()
  zoneCode: string;

  @ApiProperty({ description: 'Zone name in English' })
  @IsString()
  @IsNotEmpty()
  zoneName: string;

  @ApiPropertyOptional({ description: 'Zone name in Arabic' })
  @IsOptional()
  @IsString()
  zoneNameAr?: string;

  @ApiPropertyOptional({ description: 'Parent zone UUID' })
  @IsOptional()
  @IsUUID()
  parentZoneId?: string;

  @ApiProperty({ enum: ZoneLevel, description: 'Zone hierarchy level' })
  @IsEnum(ZoneLevel)
  zoneLevel: ZoneLevel;

  @ApiPropertyOptional({ description: 'Centroid latitude (decimal degrees)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centroidLat?: number;

  @ApiPropertyOptional({ description: 'Centroid longitude (decimal degrees)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centroidLng?: number;

  @ApiPropertyOptional({ description: 'Coverage start time in HH:MM format', example: '06:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'coverageStartTime must be in HH:MM format' })
  coverageStartTime?: string;

  @ApiPropertyOptional({ description: 'Coverage end time in HH:MM format', example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'coverageEndTime must be in HH:MM format' })
  coverageEndTime?: string;

  @ApiPropertyOptional({ description: 'Maximum order weight in kilograms' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxOrderWeightKg?: number;

  @ApiPropertyOptional({ enum: ZoneStatus, description: 'Zone operational status', default: ZoneStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;
}

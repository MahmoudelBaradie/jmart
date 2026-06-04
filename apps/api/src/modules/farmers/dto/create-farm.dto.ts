import { IsString, IsUUID, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFarmDto {
  @ApiProperty({ example: 'Al-Hada Main Farm' })
  @IsString()
  farmName: string;

  @ApiProperty({ example: 'zone-uuid' })
  @IsUUID()
  geoZoneId: string;

  @ApiProperty({ example: 'Taif Road, Al-Hada, Taif' })
  @IsString()
  address: string;

  @ApiProperty({ example: 21.3891 })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 40.4233 })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: 50.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaHectares?: number;

  @ApiPropertyOptional({ example: ['vegetables', 'fruits'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryProducts?: string[];
}

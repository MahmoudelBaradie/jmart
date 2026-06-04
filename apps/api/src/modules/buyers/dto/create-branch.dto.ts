import {
  IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID,
  Length, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBranchDto {
  @ApiProperty({ example: 'الفرع الرئيسي - الرياض' })
  @IsString()
  @Length(1, 255)
  branchName: string;

  @ApiPropertyOptional({ example: 'RIYADH-01' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  branchCode?: string;

  @ApiProperty({ description: 'UUID of the GeoZone (district/city) for delivery routing' })
  @IsUUID()
  geoZoneId: string;

  @ApiProperty({ example: 'حي النخيل، شارع الأمير محمد بن سعد، الرياض' })
  @IsString()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ example: 24.7136 })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 46.6753 })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: 'محمد أحمد' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  contactName?: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @IsOptional()
  @IsString()
  @Length(5, 20)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Free-text delivery instructions (gate code, landmark, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostMediaType } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ example: 'وصل محصول الطماطم الطازج اليوم! 🍅' })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Image or video URLs (pasted links for now; hosted URLs later)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_protocol: true }, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ enum: PostMediaType, default: PostMediaType.NONE })
  @IsOptional()
  @IsEnum(PostMediaType)
  mediaType?: PostMediaType;
}

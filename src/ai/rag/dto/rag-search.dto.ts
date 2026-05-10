import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from 'src/common/enums/article-status.enum';

export class RagSearchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ default: 5, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({
    enum: ArticleStatus,
    example: ArticleStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  articleStatus?: ArticleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

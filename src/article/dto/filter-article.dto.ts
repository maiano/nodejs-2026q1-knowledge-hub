import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { PaginationSortDto } from '../../common/dto/pagination-sort.dto';

export class FilterArticleDto extends PaginationSortDto {
  @ApiPropertyOptional({
    description: 'Filter articles by status',
    enum: ArticleStatus,
    example: ArticleStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: 'Filter articles by category id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter articles by tag value',
    example: 'nestjs',
  })
  @IsOptional()
  @IsString()
  tag?: string;
}

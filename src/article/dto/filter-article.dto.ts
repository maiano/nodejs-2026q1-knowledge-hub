import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { PaginationSortDto } from '../../common/dto/pagination-sort.dto';

export class FilterArticleDto extends PaginationSortDto {
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

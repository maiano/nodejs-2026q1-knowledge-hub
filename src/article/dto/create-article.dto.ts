import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class CreateArticleDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsEnum(ArticleStatus)
  status: ArticleStatus;

  @IsOptional()
  @IsUUID()
  authorId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsArray()
  tags: string[];
}

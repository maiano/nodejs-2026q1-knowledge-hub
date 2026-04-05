import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsUUID()
  authorId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

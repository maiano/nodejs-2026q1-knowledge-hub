import { IsString, MinLength, IsUUID, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsUUID()
  articleId: string;

  @IsOptional()
  @IsUUID()
  authorId?: string | null;
}

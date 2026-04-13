import { IsString, MinLength, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment text content',
    example: 'Great article, thanks for sharing.',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({
    description: 'Identifier of the related article',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  articleId: string;

  @ApiPropertyOptional({
    description: 'Optional author identifier',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  authorId?: string | null;
}

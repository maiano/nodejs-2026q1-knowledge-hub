import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class ArticleResponseDto {
  @ApiProperty({
    description: 'Article identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  id: string;

  @ApiProperty({
    description: 'Article title',
    example: 'NestJS Validation Best Practices',
  })
  title: string;

  @ApiProperty({
    description: 'Article body content',
    example: 'Detailed article content goes here.',
  })
  content: string;

  @ApiProperty({
    description: 'Article publication status',
    enum: ArticleStatus,
    example: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @ApiPropertyOptional({
    description: 'Optional author identifier',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  authorId: string | null;

  @ApiPropertyOptional({
    description: 'Optional category identifier',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  categoryId: string | null;

  @ApiProperty({
    description: 'Article tags',
    type: [String],
    example: ['nestjs', 'swagger'],
  })
  tags: string[];

  @ApiProperty({
    description: 'Creation timestamp in milliseconds',
    example: 1712923200000,
  })
  createdAt: number;

  @ApiProperty({
    description: 'Last update timestamp in milliseconds',
    example: 1712923200000,
  })
  updatedAt: number;
}

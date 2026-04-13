import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty({
    description: 'Comment identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440020',
  })
  id: string;

  @ApiProperty({
    description: 'Comment content',
    example: 'Great article, thanks for sharing.',
  })
  content: string;

  @ApiProperty({
    description: 'Related article identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  articleId: string;

  @ApiPropertyOptional({
    description: 'Optional author identifier',
    format: 'uuid',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  authorId: string | null;

  @ApiProperty({
    description: 'Creation timestamp in milliseconds',
    example: 1712923200000,
  })
  createdAt: number;
}

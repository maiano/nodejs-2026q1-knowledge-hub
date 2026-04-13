import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindCommentsQueryDto {
  @ApiProperty({
    description: 'Identifier of the article whose comments should be returned',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  articleId: string;
}

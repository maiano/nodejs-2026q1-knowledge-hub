import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Backend',
  })
  name: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Backend development related materials',
  })
  description: string;
}

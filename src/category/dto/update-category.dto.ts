import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Updated category name',
    example: 'Architecture',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Updated category description',
    example: 'Updated category description',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  description: string;
}

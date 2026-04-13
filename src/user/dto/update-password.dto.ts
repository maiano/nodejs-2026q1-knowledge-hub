import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current password of the user',
    example: 'OldPassword123',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password to set',
    example: 'NewPassword123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  newPassword: string;
}

import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(1)
  newPassword: string;
}

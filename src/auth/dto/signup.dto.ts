import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

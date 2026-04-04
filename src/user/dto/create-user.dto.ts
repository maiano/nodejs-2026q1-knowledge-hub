import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique user login',
    example: 'john.doe',
  })
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Plain password that will be hashed before storage',
    example: 'StrongPassword123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({
    description: 'User role. Defaults to viewer when omitted.',
    enum: UserRole,
    example: UserRole.VIEWER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

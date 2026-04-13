import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'User identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique user login',
    example: 'john.doe',
  })
  login: string;

  @ApiProperty({
    description: 'Assigned user role',
    enum: UserRole,
    example: UserRole.VIEWER,
  })
  role: UserRole;

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

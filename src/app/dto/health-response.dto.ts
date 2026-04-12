import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Process uptime in seconds',
    example: 123.45,
  })
  uptime: number;
}

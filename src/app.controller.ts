import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './app/dto/health-response.dto';

@Controller()
@ApiTags('App')
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Get application health status' })
  @ApiOkResponse({
    description: 'Application health information',
    type: HealthResponseDto,
  })
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }
}

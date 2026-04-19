import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './app/dto/health-response.dto';
import { Public } from './auth/decorators/public.decorator';

@Controller()
@ApiTags('App')
export class AppController {
  @Public()
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

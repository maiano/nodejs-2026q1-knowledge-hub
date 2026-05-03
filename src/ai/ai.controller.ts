import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { TranslateDto } from './dto/translate.dto';
import { AiRateLimitGuard } from './rate-limit/ai-rate-limit.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('AI')
@Roles(UserRole.EDITOR, UserRole.ADMIN)
@Controller('ai')
@UseGuards(AiRateLimitGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Summarize article content with AI' })
  summarize(
    @Param('articleId', new ParseUUIDPipe()) articleId: string,
    @Body() dto: SummarizeDto,
  ) {
    return this.aiService.summarizeArticle(articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Translate article content with AI' })
  translate(
    @Param('articleId', new ParseUUIDPipe()) articleId: string,
    @Body() dto: TranslateDto,
  ) {
    return this.aiService.translateArticle(articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze article content with AI' })
  analyze(
    @Param('articleId', new ParseUUIDPipe()) articleId: string,
    @Body() dto: AnalyzeDto,
  ) {
    return this.aiService.analyzeArticle(articleId, dto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate free-form AI response' })
  generate(@Body() dto: GenerateDto) {
    return this.aiService.generate(dto);
  }

  @Get('usage')
  @ApiOperation({ summary: 'AI usage statistics and observability metrics' })
  getUsage() {
    return this.aiService.getUsage();
  }
}

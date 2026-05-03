import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { TranslateDto } from './dto/translate.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('articles/:articleId/summarize')
  @ApiOperation({ summary: 'Summarize article content with AI' })
  summarize(@Param('articleId') articleId: string, @Body() dto: SummarizeDto) {
    return this.aiService.summarizeArticle(articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @ApiOperation({ summary: 'Translate article content with AI' })
  translate(@Param('articleId') articleId: string, @Body() dto: TranslateDto) {
    return this.aiService.translateArticle(articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @ApiOperation({ summary: 'Analyze article content with AI' })
  analyze(@Param('articleId') articleId: string, @Body() dto: AnalyzeDto) {
    return this.aiService.analyzeArticle(articleId, dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate free-form AI response' })
  generate(@Body() dto: GenerateDto) {
    return this.aiService.generate(dto);
  }
}

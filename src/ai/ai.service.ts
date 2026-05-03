import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyzeDto } from './dto/analyze.dto';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { TranslateDto } from './dto/translate.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from './gemini/gemini.service';
import { AiCacheService } from './cache/ai-cache.service';
import { AiUsageService } from './usage/ai-usage.service';
import { AiOutputValidator } from './validators/ai-output.validator';
import { AiSessionContextService } from './context/ai-session-context.service';
import { buildSummarizePrompt } from './prompts/summarize.prompt';
import { buildTranslatePrompt } from './prompts/translate.prompt';
import { buildAnalyzePrompt } from './prompts/analyze.prompt';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly cache: AiCacheService,
    private readonly usage: AiUsageService,
    private readonly validator: AiOutputValidator,
    private readonly sessionContext: AiSessionContextService,
  ) {}

  async summarizeArticle(articleId: string, dto: SummarizeDto) {
    const article = await this.getArticleOrThrow(articleId);
    const updatedAt = article.updatedAt.getTime();
    const maxLength = dto.maxLength ?? 'medium';

    const cacheKey = this.cache.buildKey(
      articleId,
      'summarize',
      { maxLength },
      updatedAt,
    );

    const cached = this.cache.get<object>(cacheKey);
    if (cached !== null) {
      this.usage.track('summarize');
      return cached;
    }

    const prompt = buildSummarizePrompt(article, { maxLength });
    const start = Date.now();
    const { text, usage } = await this.gemini.generate(prompt);
    const latencyMs = Date.now() - start;
    const summary = this.validator.ensureText(text);

    this.usage.track('summarize', usage, latencyMs);

    const result = {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  async translateArticle(articleId: string, dto: TranslateDto) {
    const article = await this.getArticleOrThrow(articleId);
    const updatedAt = article.updatedAt.getTime();

    const cacheKey = this.cache.buildKey(
      articleId,
      'translate',
      {
        targetLanguage: dto.targetLanguage,
        sourceLanguage: dto.sourceLanguage,
      },
      updatedAt,
    );

    const cached = this.cache.get<object>(cacheKey);
    if (cached !== null) {
      this.usage.track('translate');
      return cached;
    }

    const prompt = buildTranslatePrompt(article, dto);

    const start = Date.now();
    const { text, usage } = await this.gemini.generate(prompt);
    const latencyMs = Date.now() - start;

    this.usage.track('translate', usage, latencyMs);

    const parsed = this.validator.parseTranslate(text, dto.sourceLanguage);
    const result = { articleId, ...parsed };

    this.cache.set(cacheKey, result);
    return result;
  }

  async analyzeArticle(articleId: string, dto: AnalyzeDto) {
    const article = await this.getArticleOrThrow(articleId);
    const prompt = buildAnalyzePrompt(article, dto);

    const start = Date.now();
    const { text, usage } = await this.gemini.generate(prompt);
    const latencyMs = Date.now() - start;

    this.usage.track('analyze', usage, latencyMs);

    const parsed = this.validator.parseAnalyze(text);
    return { articleId, ...parsed };
  }

  async generate(dto: GenerateDto) {
    const history = dto.sessionId ? this.sessionContext.get(dto.sessionId) : [];
    const contextPrefix = history
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const fullPrompt = contextPrefix
      ? `${contextPrefix}\nUser: ${dto.prompt}`
      : dto.prompt;

    const start = Date.now();
    const { text, usage } = await this.gemini.generate(fullPrompt);
    const latencyMs = Date.now() - start;
    const resultText = this.validator.ensureText(text);

    this.usage.track('generate', usage, latencyMs);

    if (dto.sessionId) {
      this.sessionContext.set(dto.sessionId, 'user', dto.prompt);
      this.sessionContext.set(dto.sessionId, 'model', resultText);
    }

    return { result: resultText };
  }

  private async getArticleOrThrow(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) throw new NotFoundException(`Article ${articleId} not found`);
    return article;
  }
}

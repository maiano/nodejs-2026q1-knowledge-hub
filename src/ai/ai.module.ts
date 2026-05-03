import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini/gemini.service';
import { AiCacheService } from './cache/ai-cache.service';
import { AiUsageService } from './usage/ai-usage.service';
import { AiOutputValidator } from './validators/ai-output.validator';
import { AiSessionContextService } from './context/ai-session-context.service';
import { AiRateLimitGuard } from './rate-limit/ai-rate-limit.guard';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    GeminiService,
    AiCacheService,
    AiUsageService,
    AiOutputValidator,
    AiSessionContextService,
    AiRateLimitGuard,
  ],
  exports: [
    AiService,
    GeminiService,
    AiCacheService,
    AiUsageService,
    AiOutputValidator,
    AiSessionContextService,
    AiRateLimitGuard,
  ],
})
export class AiModule {}

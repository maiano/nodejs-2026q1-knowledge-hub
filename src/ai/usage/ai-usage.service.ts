import { Injectable } from '@nestjs/common';
import { GeminiUsage } from '../gemini/gemini.service';

export type AiEndpoint = 'summarize' | 'translate' | 'analyze' | 'generate';

type LatencyStats = {
  count: number;
  totalMs: number;
  maxMs: number;
};

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly requestsByEndpoint: Record<AiEndpoint, number> = {
    summarize: 0,
    translate: 0,
    analyze: 0,
    generate: 0,
  };

  private tokens = { prompt: 0, output: 0, total: 0 };
  private latency: LatencyStats = { count: 0, totalMs: 0, maxMs: 0 };

  track(endpoint: AiEndpoint, usage?: GeminiUsage, latencyMs?: number) {
    this.totalRequests += 1;
    this.requestsByEndpoint[endpoint] += 1;

    if (usage) {
      this.tokens.prompt += usage.promptTokens ?? 0;
      this.tokens.output += usage.outputTokens ?? 0;
      this.tokens.total += usage.totalTokens ?? 0;
    }

    if (latencyMs !== undefined) {
      this.latency.count++;
      this.latency.totalMs += latencyMs;
      this.latency.maxMs = Math.max(this.latency.maxMs, latencyMs);
    }
  }

  getStats() {
    return {
      totalRequests: this.totalRequests,
      requestsByEndpoint: { ...this.requestsByEndpoint },
      tokens: { ...this.tokens },
      latency: {
        count: this.latency.count,
        avgMs:
          this.latency.count > 0
            ? Math.round(this.latency.totalMs / this.latency.count)
            : 0,
        maxMs: this.latency.maxMs,
      },
    };
  }
}

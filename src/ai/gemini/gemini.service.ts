import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface GeminiUsage {
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GeminiResult {
  text: string;
  usage?: GeminiUsage;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GeminiService.name);
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.baseUrl =
      process.env.GEMINI_API_BASE_URL ??
      'https://generativelanguage.googleapis.com';
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

    if (!this.apiKey) {
      this.logger.warn(
        {
          baseUrl: this.baseUrl,
          model: this.model,
        },
        'GEMINI_API_KEY is not set',
      );
    }
  }

  async generate(prompt: string, retries = 3): Promise<GeminiResult> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('AI service is not configured');
    }

    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const delay = Math.pow(2, attempt) * 1000;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (response.status === 401 || response.status === 403) {
          this.logger.error(
            {
              statusCode: response.status,
              model: this.model,
            },
            'Gemini API authentication error',
          );
          throw new InternalServerErrorException(
            'AI service configuration error',
          );
        }

        if (response.status === 429) {
          if (attempt < retries) {
            this.logger.warn(
              {
                attempt,
                retries,
                delay,
                statusCode: response.status,
                model: this.model,
              },
              'Gemini upstream rate limit',
            );
            await this.sleep(delay);
            continue;
          }
          throw new ServiceUnavailableException(
            'AI service is temporarily unavailable',
          );
        }

        if (response.status >= 500) {
          if (attempt < retries) {
            this.logger.warn(
              {
                attempt,
                retries,
                delay,
                statusCode: response.status,
                model: this.model,
              },
              'Gemini upstream server error',
            );
            await this.sleep(delay);
            continue;
          }
          throw new ServiceUnavailableException('AI service error');
        }

        if (!response.ok) {
          throw new ServiceUnavailableException('AI service error');
        }

        const data = (await response.json()) as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        const usage: GeminiUsage | undefined = data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              outputTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined;

        return { text, usage };
      } catch (err) {
        if (
          err instanceof InternalServerErrorException ||
          err instanceof ServiceUnavailableException
        ) {
          throw err;
        }

        if (attempt === retries) {
          this.logger.error(
            {
              err,
              retries,
              model: this.model,
            },
            'Gemini API network error',
          );
          throw new ServiceUnavailableException('AI service is unreachable');
        }

        this.logger.warn(
          {
            attempt,
            retries,
            delay,
            model: this.model,
          },
          'Gemini network error',
        );
        await this.sleep(delay);
      }
    }

    throw new ServiceUnavailableException('AI service is unavailable');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

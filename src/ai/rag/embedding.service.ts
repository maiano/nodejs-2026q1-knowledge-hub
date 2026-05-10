import {
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

interface EmbeddingResponse {
  embedding: { values: number[] };
}

@Injectable()
export class EmbeddingService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(EmbeddingService.name);
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.baseUrl =
      process.env.GEMINI_API_BASE_URL ??
      'https://generativelanguage.googleapis.com';
    this.model = process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004';

    if (!this.apiKey) {
      this.logger.warn(
        {
          baseUrl: this.baseUrl,
          model: this.model,
        },
        'GEMINI_API_KEY is not set for embeddings',
      );
    }
  }

  async embed(text: string, retries = 3): Promise<number[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('AI service is not configured');
    }

    const url = `${this.baseUrl}/v1beta/models/${this.model}:embedContent`;

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
            model: `models/${this.model}`,
            content: { parts: [{ text }] },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (response.status === 401 || response.status === 403) {
          this.logger.error(
            {
              statusCode: response.status,
              model: this.model,
            },
            'Gemini embedding auth error',
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
              'Gemini embedding upstream rate limit',
            );
            await this.sleep(delay);
            continue;
          }
          throw new ServiceUnavailableException(
            'Embedding service is temporarily unavailable',
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
              'Gemini embedding upstream server error',
            );
            await this.sleep(delay);
            continue;
          }
          throw new ServiceUnavailableException('Embedding service error');
        }

        if (!response.ok) {
          throw new ServiceUnavailableException(
            'Embedding service unavailable',
          );
        }

        const data = (await response.json()) as EmbeddingResponse;
        const values = data.embedding?.values;

        if (!Array.isArray(values) || values.length === 0) {
          throw new ServiceUnavailableException(
            'Embedding service returned invalid output',
          );
        }

        return values;
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
            'Gemini embedding network error',
          );
          throw new ServiceUnavailableException(
            'Embedding service is unreachable',
          );
        }

        this.logger.warn(
          {
            attempt,
            retries,
            delay,
            model: this.model,
          },
          'Gemini embedding network error',
        );
        await this.sleep(delay);
      }
    }

    throw new ServiceUnavailableException('Embedding service is unavailable');
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
      await this.sleep(100);
    }
    return results;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

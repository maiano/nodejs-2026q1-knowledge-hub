import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface ChunkPayload {
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  chunkText: string;
  status: string;
  categoryId: string | null;
  tags: string[];
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: ChunkPayload;
}

interface QdrantPoint {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly baseUrl: string;
  private readonly collection: string;
  private readonly vectorSize = 768;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(QdrantService.name);
    this.baseUrl = process.env.RAG_VECTOR_DB_URL ?? 'http://localhost:6333';
    this.collection =
      process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const response = await this.fetch(
        `GET`,
        `/collections/${this.collection}`,
      );

      if (response.status === 404) {
        await this.fetch('PUT', `/collections/${this.collection}`, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        this.logger.info(`Created Qdrant collection: ${this.collection}`);
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to initialize Qdrant collection');
    }
  }

  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    await this.fetch('PUT', `/collections/${this.collection}/points`, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async search(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    const body: Record<string, unknown> = {
      vector,
      limit,
      with_payload: true,
      with_vector: false,
    };

    if (filter) body.filter = filter;

    const response = await this.fetch(
      'POST',
      `/collections/${this.collection}/points/search`,
      body,
    );

    const data = (await response.json()) as { result: SearchResult[] };
    return data.result ?? [];
  }

  async scrollByText(
    query: string,
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    const body: Record<string, unknown> = {
      limit,
      with_payload: true,
      filter: {
        must: [
          ...((filter?.must as unknown[]) ?? []),
          {
            key: 'chunkText',
            match: { text: query },
          },
        ],
      },
    };

    const response = await this.fetch(
      'POST',
      `/collections/${this.collection}/points/scroll`,
      body,
    );

    const data = (await response.json()) as {
      result: { points: Array<{ id: string; payload: ChunkPayload }> };
    };

    return (data.result?.points ?? []).map((p) => ({
      id: String(p.id),
      score: 0.5,
      payload: p.payload,
    }));
  }

  async deleteByArticleId(articleId: string): Promise<boolean> {
    const response = await this.fetch(
      'POST',
      `/collections/${this.collection}/points/delete`,
      {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      },
    );

    return response.ok;
  }

  async getIndexedArticleIds(): Promise<Map<string, number>> {
    const response = await this.fetch(
      'POST',
      `/collections/${this.collection}/points/scroll`,
      {
        limit: 1000,
        with_payload: ['articleId', 'updatedAt'],
        with_vector: false,
      },
    );

    const data = (await response.json()) as {
      result: {
        points: Array<{ payload: { articleId: string; updatedAt: number } }>;
      };
    };

    const map = new Map<string, number>();
    for (const point of data.result?.points ?? []) {
      map.set(point.payload.articleId, point.payload.updatedAt);
    }
    return map;
  }

  private async fetch(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    try {
      const response = await globalThis.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      return response;
    } catch (err) {
      this.logger.error({ err }, 'Qdrant request failed');
      throw new ServiceUnavailableException('Vector DB is unavailable');
    }
  }

  buildFilter(params: {
    articleStatus?: string;
    categoryId?: string;
    tags?: string[];
  }): Record<string, unknown> | undefined {
    const must: unknown[] = [];

    if (params.articleStatus) {
      must.push({ key: 'status', match: { value: params.articleStatus } });
    }

    if (params.categoryId) {
      must.push({ key: 'categoryId', match: { value: params.categoryId } });
    }

    if (params.tags?.length) {
      for (const tag of params.tags) {
        must.push({ key: 'tags', match: { value: tag } });
      }
    }

    return must.length > 0 ? { must } : undefined;
  }
}

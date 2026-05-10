import { Injectable } from '@nestjs/common';
import { QdrantService } from './qdrant.service';

@Injectable()
export class ReindexTrackerService {
  constructor(private readonly qdrant: QdrantService) {}

  async getIndexedState(): Promise<Map<string, number>> {
    return this.qdrant.getIndexedArticleIds();
  }

  needsReindex(
    indexedState: Map<string, number>,
    articleId: string,
    updatedAt: number,
  ): boolean {
    const lastIndexed = indexedState.get(articleId);
    return lastIndexed === undefined || lastIndexed < updatedAt;
  }

  getArticlesToReindex<T extends { id: string; updatedAt: Date }>(
    articles: T[],
    indexedState: Map<string, number>,
  ): T[] {
    return articles.filter((article) =>
      this.needsReindex(indexedState, article.id, article.updatedAt.getTime()),
    );
  }

  getStaleArticleIds(
    indexedState: Map<string, number>,
    actualArticleIds: Iterable<string>,
  ): string[] {
    const actualIds = new Set(actualArticleIds);

    return [...indexedState.keys()].filter(
      (articleId) => !actualIds.has(articleId),
    );
  }

  markIndexed(
    indexedState: Map<string, number>,
    articleId: string,
    updatedAt: number,
  ) {
    indexedState.set(articleId, updatedAt);
  }
}

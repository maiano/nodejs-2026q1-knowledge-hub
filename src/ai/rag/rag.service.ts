import { Injectable, NotFoundException } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { EmbeddingService } from './embedding.service';
import { ChunkerService } from './chunker.service';
import { QdrantService, SearchResult } from './qdrant.service';
import { RagConversationService } from './rag-conversation.service';
import { ReindexTrackerService } from './reindex-tracker.service';
import { ReindexDto } from './dto/reindex.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { PinoLogger } from 'nestjs-pino';
import { createHash } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly embedding: EmbeddingService,
    private readonly chunker: ChunkerService,
    private readonly qdrant: QdrantService,
    private readonly conversation: RagConversationService,
    private readonly tracker: ReindexTrackerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RagService.name);
  }

  async index(dto: ReindexDto) {
    const where: Record<string, unknown> = {};

    if (dto.onlyPublished !== false) {
      where.status = 'PUBLISHED';
    }

    if (dto.articleIds?.length) {
      where.id = { in: dto.articleIds };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: { tags: true },
    });

    const indexedState = await this.tracker.getIndexedState();
    const articlesToIndex = this.tracker.getArticlesToReindex(
      articles,
      indexedState,
    );
    const actualArticleIds = new Set(articles.map((article) => article.id));
    const staleArticleIds = dto.articleIds?.length
      ? dto.articleIds.filter(
          (articleId) =>
            indexedState.has(articleId) && !actualArticleIds.has(articleId),
        )
      : this.tracker.getStaleArticleIds(indexedState, actualArticleIds);

    let indexedArticles = 0;
    let indexedChunks = 0;

    for (const articleId of staleArticleIds) {
      await this.qdrant.deleteByArticleId(articleId);
      indexedState.delete(articleId);
    }

    for (const article of articlesToIndex) {
      const updatedAt = article.updatedAt.getTime();

      await this.qdrant.deleteByArticleId(article.id);

      const fullText = `${article.title}\n\n${article.content}`;
      const chunks = this.chunker.chunk(fullText);

      const embeddings = await this.embedding.embedBatch(
        chunks.map((c) => c.text),
      );

      const points = chunks.map((chunk, i) => ({
        id: this.buildPointId(article.id, chunk.index),
        vector: embeddings[i],
        payload: {
          articleId: article.id,
          articleTitle: article.title,
          chunkIndex: chunk.index,
          chunkText: chunk.text,
          status: article.status.toLowerCase(),
          categoryId: article.categoryId,
          tags: article.tags.map((t) => t.name),
          updatedAt,
        },
      }));

      await this.qdrant.upsertPoints(points);
      this.tracker.markIndexed(indexedState, article.id, updatedAt);

      indexedArticles++;
      indexedChunks += chunks.length;

      this.logger.info(
        `Indexed article ${article.id}: ${chunks.length} chunks`,
      );
    }

    return {
      indexedArticles,
      indexedChunks,
      vectorCollection:
        process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles',
    };
  }

  async search(dto: RagSearchDto) {
    const queryVector = await this.embedding.embed(dto.query);
    const limit = dto.limit ?? 5;

    const filter = this.qdrant.buildFilter({
      articleStatus: dto.articleStatus,
      categoryId: dto.categoryId,
      tags: dto.tags,
    });

    const [semanticResults, lexicalResults] = await Promise.all([
      this.qdrant.search(queryVector, limit * 2, filter),
      this.qdrant.scrollByText(dto.query, limit, filter),
    ]);

    const merged = this.reciprocalRankFusion(
      semanticResults,
      lexicalResults,
      limit,
    );

    return {
      results: merged.map((r) => ({
        articleId: r.payload.articleId,
        articleTitle: r.payload.articleTitle,
        chunk: r.payload.chunkText,
        similarity: Math.round(r.score * 1000) / 1000,
      })),
    };
  }

  async chat(dto: RagChatDto) {
    const conv = this.conversation.getOrCreate(dto.conversationId);

    const queryVector = await this.embedding.embed(dto.question);

    const results = await this.qdrant.search(queryVector, 5);

    if (results.length === 0) {
      const answer =
        'I could not find relevant articles to answer your question. ' +
        'Try indexing articles first via POST /ai/rag/index.';

      this.conversation.addMessages(conv.id, dto.question, answer);

      return {
        answer,
        sources: [],
        conversationId: conv.id,
      };
    }

    const context = results
      .map(
        (r, i) =>
          `[Source ${i + 1}: "${r.payload.articleTitle}"]\n${r.payload.chunkText}`,
      )
      .join('\n\n---\n\n');

    const history = conv.messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = [
      'You are a helpful assistant for the Knowledge Hub platform.',
      'Answer the question based only on the provided article excerpts.',
      'If the answer is not in the excerpts, say so clearly.',
      '',
      history ? `Conversation history:\n${history}\n` : '',
      `Article excerpts:\n${context}`,
      '',
      `Question: ${dto.question}`,
      '',
      'Provide a clear, concise answer based on the sources above.',
    ]
      .filter(Boolean)
      .join('\n');

    const { text } = await this.gemini.generate(prompt);

    this.conversation.addMessages(conv.id, dto.question, text);

    return {
      answer: text.trim(),
      sources: results.map((r) => ({
        articleId: r.payload.articleId,
        articleTitle: r.payload.articleTitle,
        relevantChunk: r.payload.chunkText,
      })),
      conversationId: conv.id,
    };
  }

  async deleteArticleIndex(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) throw new NotFoundException(`Article ${articleId} not found`);

    const deleted = await this.qdrant.deleteByArticleId(articleId);
    if (!deleted) {
      throw new NotFoundException(
        `No index entries found for article ${articleId}`,
      );
    }
  }

  getConversationHistory(conversationId: string): Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }> {
    return this.conversation.getHistory(conversationId);
  }

  private reciprocalRankFusion(
    semantic: SearchResult[],
    lexical: SearchResult[],
    limit: number,
    k = 60,
  ): SearchResult[] {
    const scores = new Map<string, number>();
    const byId = new Map<string, SearchResult>();

    const addRanks = (results: SearchResult[]) => {
      results.forEach((r, rank) => {
        const prev = scores.get(r.id) ?? 0;
        scores.set(r.id, prev + 1 / (k + rank + 1));
        byId.set(r.id, r);
      });
    };

    addRanks(semantic);
    addRanks(lexical);

    return [...scores.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id, score]) => ({ ...byId.get(id)!, score }));
  }

  private buildPointId(articleId: string, chunkIndex: number): string {
    const hex = createHash('sha1')
      .update(`${articleId}:${chunkIndex}`)
      .digest('hex')
      .slice(0, 32);

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      `4${hex.slice(13, 16)}`,
      `a${hex.slice(17, 20)}`,
      hex.slice(20, 32),
    ].join('-');
  }
}

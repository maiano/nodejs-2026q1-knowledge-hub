import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { InMemoryStorage } from '../storage/in-memory.storage';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly storage: InMemoryStorage) {}

  findAll() {
    return this.storage.getArticles();
  }

  findById(id: string) {
    const article = this.storage.getArticles().find((a) => a.id === id);

    if (!article) throw new NotFoundException();

    return article;
  }

  create(dto: CreateArticleDto) {
    const articles = this.storage.getArticles();

    const now = Date.now();

    const article: Article = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags,
      createdAt: now,
      updatedAt: now,
    };

    articles.push(article);

    return article;
  }

  update(id: string, dto: UpdateArticleDto) {
    const articles = this.storage.getArticles();
    const article = articles.find((a) => a.id === id);

    if (!article) throw new NotFoundException();

    Object.assign(article, dto);
    article.updatedAt = Date.now();

    return article;
  }

  delete(id: string) {
    const articles = this.storage.getArticles();
    const exists = articles.find((a) => a.id === id);

    if (!exists) throw new NotFoundException();

    const comments = this.storage.getComments();
    this.storage.setComments(comments.filter((c) => c.articleId !== id));

    this.storage.setArticles(articles.filter((a) => a.id !== id));
  }

  findFiltered(query: FilterArticleDto) {
    let data = [...this.storage.getArticles()];

    if (query.status) {
      data = data.filter((a) => a.status === query.status);
    }

    if (query.categoryId) {
      data = data.filter((a) => a.categoryId === query.categoryId);
    }

    if (query.tag) {
      data = data.filter((a) => a.tags.includes(query.tag));
    }

    const total = data.length;

    if (query.sortBy) {
      data.sort((a, b) => {
        const valA = a[query.sortBy];
        const valB = b[query.sortBy];

        if (valA < valB) return query.order === 'desc' ? 1 : -1;
        if (valA > valB) return query.order === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (query.page && query.limit) {
      const start = (query.page - 1) * query.limit;
      data = data.slice(start, start + query.limit);
    }

    return {
      data,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? total,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InMemoryStorage } from '../storage/in-memory.storage';
import { Article } from './article.entity';

@Injectable()
export class ArticleService {
  constructor(private storage: InMemoryStorage) {}

  create(dto: any) {
    const articles = this.storage.getArticles();

    const article: Article = {
      id: randomUUID(),
      ...dto,
    };

    articles.push(article);

    return article;
  }

  findById(id: string) {
    const article = this.storage.getArticles().find((a) => a.id === id);

    if (!article) throw new NotFoundException();

    return article;
  }

  delete(id: string) {
    const articles = this.storage.getArticles();
    const exists = articles.find((a) => a.id === id);

    if (!exists) throw new NotFoundException();

    this.storage.setArticles(articles.filter((a) => a.id !== id));
  }
}

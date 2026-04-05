import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { InMemoryStorage } from '../storage/in-memory.storage';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly storage: InMemoryStorage) {}

  findByArticle(articleId: string) {
    return this.storage.getComments().filter((c) => c.articleId === articleId);
  }

  findById(id: string) {
    const comment = this.storage.getComments().find((c) => c.id === id);

    if (!comment) {
      throw new NotFoundException();
    }

    return comment;
  }

  create(dto: CreateCommentDto) {
    const articles = this.storage.getArticles();

    const articleExists = articles.find((a) => a.id === dto.articleId);

    if (!articleExists) {
      throw new UnprocessableEntityException();
    }

    const comments = this.storage.getComments();

    const comment: Comment = {
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: Date.now(),
    };

    comments.push(comment);

    return comment;
  }

  delete(id: string) {
    const comments = this.storage.getComments();

    const exists = comments.find((c) => c.id === id);

    if (!exists) {
      throw new NotFoundException();
    }

    this.storage.setComments(comments.filter((c) => c.id !== id));
  }
}

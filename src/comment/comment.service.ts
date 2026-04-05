import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InMemoryStorage } from '../storage/in-memory.storage';
import { Comment } from './comment.entity';

@Injectable()
export class CommentService {
  constructor(private storage: InMemoryStorage) {}

  create(dto: any) {
    const articles = this.storage.getArticles();

    const articleExists = articles.find((a) => a.id === dto.articleId);

    if (!articleExists) {
      throw new UnprocessableEntityException();
    }

    const comments = this.storage.getComments();

    const comment: Comment = {
      id: randomUUID(),
      ...dto,
    };

    comments.push(comment);

    return comment;
  }

  findById(id: string) {
    const comment = this.storage.getComments().find((c) => c.id === id);

    if (!comment) throw new NotFoundException();

    return comment;
  }

  delete(id: string) {
    const comments = this.storage.getComments();
    const exists = comments.find((c) => c.id === id);

    if (!exists) throw new NotFoundException();

    this.storage.setComments(comments.filter((c) => c.id !== id));
  }
}

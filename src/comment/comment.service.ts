import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { mapComment } from '../common/utils/mappers';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findByArticle(articleId: string) {
    if (!articleId) {
      throw new UnprocessableEntityException();
    }

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new UnprocessableEntityException();
    }

    const comments = await this.prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(mapComment);
  }

  async findById(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException();
    return mapComment(comment);
  }

  async create(dto: CreateCommentDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });

    if (!article) throw new UnprocessableEntityException();

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId: dto.authorId ?? null,
      },
    });

    return mapComment(comment);
  }

  async delete(id: string) {
    try {
      await this.prisma.comment.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
    }
  }
}

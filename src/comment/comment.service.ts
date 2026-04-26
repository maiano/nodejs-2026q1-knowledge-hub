import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { mapComment } from '../common/utils/mappers';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenError, NotFoundError } from '../common/errors';

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
    if (!comment) throw new NotFoundError(`Comment ${id} not found`);
    return mapComment(comment);
  }

  async create(dto: CreateCommentDto, actor: JwtPayload) {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });

    if (!article) throw new UnprocessableEntityException();

    const authorId =
      actor.role === UserRole.EDITOR ? actor.userId : (dto.authorId ?? null);

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId,
      },
    });

    return mapComment(comment);
  }

  async delete(id: string, actor: JwtPayload) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!comment) throw new NotFoundError(`Comment ${id} not found`);

    if (actor.role === UserRole.EDITOR && comment.authorId !== actor.userId) {
      throw new ForbiddenError('Insufficient permissions');
    }

    try {
      await this.prisma.comment.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundError(`Comment ${id} not found`);
      }
      throw e;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';
import { mapArticle } from '../common/utils/mappers';
import { ArticleStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenError, NotFoundError } from '../common/errors';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const articles = await this.prisma.article.findMany({
      include: { tags: true },
    });

    return articles.map(mapArticle);
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!article) throw new NotFoundError(`Article ${id} not found`);

    return mapArticle(article);
  }

  async create(dto: CreateArticleDto, actor: JwtPayload) {
    const { tags = [], status, ...rest } = dto;

    const authorId =
      actor.role === UserRole.EDITOR ? actor.userId : (dto.authorId ?? null);

    const article = await this.prisma.article.create({
      data: {
        ...rest,
        authorId,
        status: (status?.toUpperCase() ?? 'DRAFT') as ArticleStatus,
        tags: {
          connectOrCreate: tags.map((name) => ({
            where: { name: name.toLowerCase().trim() },
            create: { name: name.toLowerCase().trim() },
          })),
        },
      },
      include: { tags: true },
    });

    return mapArticle(article);
  }

  async update(id: string, dto: UpdateArticleDto, actor: JwtPayload) {
    const exists = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundError(`Article ${id} not found`);

    if (actor.role === UserRole.EDITOR && exists.authorId !== actor.userId) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const { tags, status, ...rest } = dto;

    const safeRest =
      actor.role === UserRole.EDITOR
        ? { ...rest, authorId: actor.userId }
        : rest;

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...safeRest,
        ...(status && { status: status.toUpperCase() as ArticleStatus }),
        ...(tags !== undefined && {
          tags: {
            set: [],
            connectOrCreate: tags.map((name) => ({
              where: { name: name.toLowerCase().trim() },
              create: { name: name.toLowerCase().trim() },
            })),
          },
        }),
      },
      include: { tags: true },
    });

    return mapArticle(article);
  }

  async delete(id: string, actor: JwtPayload) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!article) throw new NotFoundError(`Article ${id} not found`);

    if (actor.role === UserRole.EDITOR && article.authorId !== actor.userId) {
      throw new ForbiddenError('Insufficient permissions');
    }

    try {
      await this.prisma.article.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundError(`Article ${id} not found`);
      }
      throw e;
    }
  }

  async findFiltered(query: FilterArticleDto) {
    const {
      status,
      categoryId,
      tag,
      sortBy,
      order = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.ArticleWhereInput = {
      ...(status && { status: status.toUpperCase() as ArticleStatus }),
      ...(categoryId && { categoryId }),
      ...(tag && { tags: { some: { name: tag.toLowerCase() } } }),
    };

    const allowedSort = ['createdAt', 'updatedAt', 'title'];

    const orderBy =
      sortBy && allowedSort.includes(sortBy)
        ? { [sortBy]: order }
        : { createdAt: order };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        include: { tags: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: data.map(mapArticle),
      total,
      page,
      limit,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';
import { mapArticle } from '../common/utils/mappers';
import { ArticleStatus, Prisma } from '@prisma/client';

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

    if (!article) throw new NotFoundException();

    return mapArticle(article);
  }

  async create(dto: CreateArticleDto) {
    const { tags = [], status, ...rest } = dto;

    const article = await this.prisma.article.create({
      data: {
        ...rest,
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

  async update(id: string, dto: UpdateArticleDto) {
    const exists = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!exists) throw new NotFoundException();

    const { tags, status, ...rest } = dto;

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...rest,
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

  async delete(id: string) {
    try {
      await this.prisma.article.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException();
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

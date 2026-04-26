import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../common/errors';

const ALLOWED_SORT = ['name', 'id'] as const;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError(`Category ${id} not found`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: dto,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundError(`Category ${id} not found`);
      }
      throw e;
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundError(`Category ${id} not found`);
      }
      throw e;
    }
  }

  async findPaginated({
    page,
    limit,
    sortBy,
    order = 'asc',
  }: {
    page: number;
    limit: number;
    sortBy?: string;
    order: 'asc' | 'desc';
  }) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    const orderBy: Prisma.CategoryOrderByWithRelationInput =
      sortBy && ALLOWED_SORT.includes(sortBy as (typeof ALLOWED_SORT)[number])
        ? { [sortBy]: order }
        : { name: order };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.category.count({}),
      this.prisma.category.findMany({
        orderBy,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}

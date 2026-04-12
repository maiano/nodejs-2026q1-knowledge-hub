import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';

const ALLOWED_SORT = ['name', 'id'] as const;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException();
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
    } catch {
      throw new NotFoundException();
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
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
    sortBy?: (typeof ALLOWED_SORT)[number];
    order: 'asc' | 'desc';
  }) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    const orderBy: Prisma.CategoryOrderByWithRelationInput =
      sortBy && ALLOWED_SORT.includes(sortBy)
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

import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;

  const category = {
    id: 'category-id',
    name: 'Backend',
    description: 'Backend development',
  };

  beforeEach(async () => {
    clearPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(CategoryService);
  });

  it('findAll returns categories', async () => {
    prismaMock.category.findMany.mockResolvedValue([category]);

    const result = await service.findAll();

    expect(prismaMock.category.findMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([category]);
  });

  it('findById returns category', async () => {
    prismaMock.category.findUnique.mockResolvedValue(category);

    const result = await service.findById('category-id');

    expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
      where: { id: 'category-id' },
    });
    expect(result).toEqual(category);
  });

  it('findById throws NotFoundError', async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      new NotFoundError('Category missing-id not found'),
    );
  });

  it('create persists category dto', async () => {
    prismaMock.category.create.mockResolvedValue(category);

    const result = await service.create({
      name: 'Backend',
      description: 'Backend development',
    });

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Backend',
        description: 'Backend development',
      },
    });
    expect(result).toEqual(category);
  });

  it('update returns updated category', async () => {
    prismaMock.category.update.mockResolvedValue({
      ...category,
      name: 'Updated',
      description: 'Updated category description',
    });

    const result = await service.update('category-id', {
      name: 'Updated',
      description: 'Updated category description',
    });

    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: 'category-id' },
      data: {
        name: 'Updated',
        description: 'Updated category description',
      },
    });
    expect(result).toEqual({
      ...category,
      name: 'Updated',
      description: 'Updated category description',
    });
  });

  it('update converts P2025 to NotFoundError', async () => {
    prismaMock.category.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.update('missing-id', {
        name: 'Updated',
        description: 'Updated category description',
      }),
    ).rejects.toThrow(new NotFoundError('Category missing-id not found'));
  });

  it('delete removes category', async () => {
    prismaMock.category.delete.mockResolvedValue(undefined);

    await service.delete('category-id');

    expect(prismaMock.category.delete).toHaveBeenCalledWith({
      where: { id: 'category-id' },
    });
  });

  it('delete converts P2025 to NotFoundError', async () => {
    prismaMock.category.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.delete('missing-id')).rejects.toThrow(
      new NotFoundError('Category missing-id not found'),
    );
  });

  it('findPaginated returns paginated categories with allowed sorting', async () => {
    prismaMock.category.count.mockReturnValue('count-operation');
    prismaMock.category.findMany.mockReturnValue('find-many-operation');
    prismaMock.$transaction.mockResolvedValue([1, [category]]);

    const result = await service.findPaginated({
      page: 2,
      limit: 5,
      sortBy: 'id',
      order: 'desc',
    });

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      'count-operation',
      'find-many-operation',
    ]);
    expect(result).toEqual({
      data: [category],
      total: 1,
      page: 2,
      limit: 5,
    });
  });

  it('findPaginated normalizes invalid page/limit and fallback sort', async () => {
    prismaMock.category.count.mockReturnValue('count-operation');
    prismaMock.category.findMany.mockReturnValue('find-many-operation');
    prismaMock.$transaction.mockResolvedValue([0, []]);

    const result = await service.findPaginated({
      page: 0,
      limit: 0,
      sortBy: 'description',
      order: 'asc',
    });

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      skip: 0,
      take: 1,
    });
    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 1,
    });
  });
});

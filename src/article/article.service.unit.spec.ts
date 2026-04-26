import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ForbiddenError, NotFoundError } from '../common/errors';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;

  const adminActor: JwtPayload = {
    userId: 'admin-id',
    login: 'admin',
    role: UserRole.ADMIN,
  };

  const editorActor: JwtPayload = {
    userId: 'editor-id',
    login: 'editor',
    role: UserRole.EDITOR,
  };

  const articleRecord = {
    id: 'article-id',
    title: 'Article title',
    content: 'Article content',
    status: 'DRAFT' as const,
    authorId: 'author-id',
    categoryId: 'category-id',
    createdAt: new Date('2026-04-26T12:00:00.000Z'),
    updatedAt: new Date('2026-04-26T13:00:00.000Z'),
    tags: [{ id: 'tag-1', name: 'nestjs' }],
  };

  beforeEach(async () => {
    clearPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(ArticleService);
  });

  describe('findAll', () => {
    it('returns mapped articles with string tags', async () => {
      prismaMock.article.findMany.mockResolvedValue([articleRecord]);

      const result = await service.findAll();

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        include: { tags: true },
      });
      expect(result).toEqual([
        {
          id: 'article-id',
          title: 'Article title',
          content: 'Article content',
          status: ArticleStatus.DRAFT,
          authorId: 'author-id',
          categoryId: 'category-id',
          createdAt: articleRecord.createdAt.getTime(),
          updatedAt: articleRecord.updatedAt.getTime(),
          tags: ['nestjs'],
        },
      ]);
    });
  });

  describe('findById', () => {
    it('returns mapped article on success', async () => {
      prismaMock.article.findUnique.mockResolvedValue(articleRecord);

      const result = await service.findById('article-id');

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-id' },
        include: { tags: true },
      });
      expect(result).toEqual({
        id: 'article-id',
        title: 'Article title',
        content: 'Article content',
        status: ArticleStatus.DRAFT,
        authorId: 'author-id',
        categoryId: 'category-id',
        createdAt: articleRecord.createdAt.getTime(),
        updatedAt: articleRecord.updatedAt.getTime(),
        tags: ['nestjs'],
      });
    });

    it('throws NotFoundError when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        new NotFoundError('Article missing-id not found'),
      );
    });
  });

  describe('create', () => {
    it('creates article with uppercased status and normalized tags for admin', async () => {
      prismaMock.article.create.mockResolvedValue(articleRecord);

      const result = await service.create(
        {
          title: 'Article title',
          content: 'Article content',
          status: ArticleStatus.DRAFT,
          authorId: 'author-id',
          categoryId: 'category-id',
          tags: ['NestJS ', ' Swagger'],
        },
        adminActor,
      );

      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          title: 'Article title',
          content: 'Article content',
          authorId: 'author-id',
          categoryId: 'category-id',
          status: 'DRAFT',
          tags: {
            connectOrCreate: [
              {
                where: { name: 'nestjs' },
                create: { name: 'nestjs' },
              },
              {
                where: { name: 'swagger' },
                create: { name: 'swagger' },
              },
            ],
          },
        },
        include: { tags: true },
      });
      expect(result.tags).toEqual(['nestjs']);
      expect(result.status).toBe(ArticleStatus.DRAFT);
    });

    it('forces editor to create article as self author', async () => {
      prismaMock.article.create.mockResolvedValue({
        ...articleRecord,
        authorId: editorActor.userId,
      });

      await service.create(
        {
          title: 'Article title',
          content: 'Article content',
          status: ArticleStatus.PUBLISHED,
          authorId: 'someone-else',
          categoryId: 'category-id',
          tags: [],
        },
        editorActor,
      );

      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          title: 'Article title',
          content: 'Article content',
          authorId: editorActor.userId,
          categoryId: 'category-id',
          status: 'PUBLISHED',
          tags: {
            connectOrCreate: [],
          },
        },
        include: { tags: true },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundError when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { title: 'Updated title' }, adminActor),
      ).rejects.toThrow(new NotFoundError('Article missing-id not found'));
    });

    it('throws ForbiddenError when editor updates foreign article', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: 'other-user-id',
      });

      await expect(
        service.update('article-id', { title: 'Updated title' }, editorActor),
      ).rejects.toThrow(new ForbiddenError('Insufficient permissions'));
    });

    it('replaces tags and updates status for admin', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: 'author-id',
      });
      prismaMock.article.update.mockResolvedValue({
        ...articleRecord,
        status: 'PUBLISHED' as const,
        title: 'Updated title',
        tags: [
          { id: 'tag-2', name: 'nodejs' },
          { id: 'tag-3', name: 'prisma' },
        ],
      });

      const result = await service.update(
        'article-id',
        {
          title: 'Updated title',
          status: ArticleStatus.PUBLISHED,
          tags: ['NodeJS ', ' Prisma'],
        },
        adminActor,
      );

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { id: 'article-id' },
        data: {
          title: 'Updated title',
          status: 'PUBLISHED',
          tags: {
            set: [],
            connectOrCreate: [
              {
                where: { name: 'nodejs' },
                create: { name: 'nodejs' },
              },
              {
                where: { name: 'prisma' },
                create: { name: 'prisma' },
              },
            ],
          },
        },
        include: { tags: true },
      });
      expect(result.status).toBe(ArticleStatus.PUBLISHED);
      expect(result.tags).toEqual(['nodejs', 'prisma']);
    });

    it('forces editor authorId to self on update', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: editorActor.userId,
      });
      prismaMock.article.update.mockResolvedValue({
        ...articleRecord,
        authorId: editorActor.userId,
      });

      await service.update(
        'article-id',
        {
          authorId: 'another-user',
          content: 'Updated content',
        },
        editorActor,
      );

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { id: 'article-id' },
        data: {
          authorId: editorActor.userId,
          content: 'Updated content',
        },
        include: { tags: true },
      });
    });
  });

  describe('delete', () => {
    it('throws NotFoundError when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing-id', adminActor)).rejects.toThrow(
        new NotFoundError('Article missing-id not found'),
      );
    });

    it('throws ForbiddenError when editor deletes foreign article', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: 'other-user-id',
      });

      await expect(service.delete('article-id', editorActor)).rejects.toThrow(
        new ForbiddenError('Insufficient permissions'),
      );
    });

    it('deletes article on success', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: 'author-id',
      });
      prismaMock.article.delete.mockResolvedValue(undefined);

      await service.delete('article-id', adminActor);

      expect(prismaMock.article.delete).toHaveBeenCalledWith({
        where: { id: 'article-id' },
      });
    });

    it('converts Prisma P2025 to NotFoundError', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        id: 'article-id',
        authorId: 'author-id',
      });
      prismaMock.article.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.delete('article-id', adminActor)).rejects.toThrow(
        new NotFoundError('Article article-id not found'),
      );
    });
  });

  describe('findFiltered', () => {
    it('builds filters for status, categoryId, tag and pagination', async () => {
      prismaMock.article.count.mockReturnValue('count-operation');
      prismaMock.article.findMany.mockReturnValue('find-many-operation');
      prismaMock.$transaction.mockResolvedValue([1, [articleRecord]]);

      const result = await service.findFiltered({
        status: ArticleStatus.PUBLISHED,
        categoryId: 'category-id',
        tag: 'NestJS',
        sortBy: 'title',
        order: 'asc',
        page: 2,
        limit: 5,
      });

      expect(prismaMock.article.count).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          categoryId: 'category-id',
          tags: { some: { name: 'nestjs' } },
        },
      });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          categoryId: 'category-id',
          tags: { some: { name: 'nestjs' } },
        },
        include: { tags: true },
        orderBy: { title: 'asc' },
        skip: 5,
        take: 5,
      });
      expect(prismaMock.$transaction).toHaveBeenCalledWith([
        'count-operation',
        'find-many-operation',
      ]);
      expect(result).toEqual({
        data: [
          {
            id: 'article-id',
            title: 'Article title',
            content: 'Article content',
            status: ArticleStatus.DRAFT,
            authorId: 'author-id',
            categoryId: 'category-id',
            createdAt: articleRecord.createdAt.getTime(),
            updatedAt: articleRecord.updatedAt.getTime(),
            tags: ['nestjs'],
          },
        ],
        total: 1,
        page: 2,
        limit: 5,
      });
    });

    it('falls back to createdAt sorting when sortBy is unsupported', async () => {
      prismaMock.article.count.mockReturnValue('count-operation');
      prismaMock.article.findMany.mockReturnValue('find-many-operation');
      prismaMock.$transaction.mockResolvedValue([0, []]);

      await service.findFiltered({
        sortBy: 'status',
        order: 'desc',
        page: 1,
        limit: 10,
      });

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: {},
        include: { tags: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });
});

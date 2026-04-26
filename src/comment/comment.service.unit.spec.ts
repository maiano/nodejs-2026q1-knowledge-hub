import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../common/enums/user-role.enum';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  let service: CommentService;

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

  const article = {
    id: 'article-id',
  };

  const comment = {
    id: 'comment-id',
    content: 'Great article',
    articleId: 'article-id',
    authorId: 'author-id',
    createdAt: new Date('2026-04-26T12:00:00.000Z'),
  };

  beforeEach(async () => {
    clearPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(CommentService);
  });

  it('findByArticle throws when articleId is missing', async () => {
    await expect(service.findByArticle('')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('findByArticle throws when article does not exist', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    await expect(service.findByArticle('missing-article')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('findByArticle returns mapped comments ordered by createdAt desc', async () => {
    prismaMock.article.findUnique.mockResolvedValue(article);
    prismaMock.comment.findMany.mockResolvedValue([comment]);

    const result = await service.findByArticle('article-id');

    expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
      where: { articleId: 'article-id' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      {
        id: 'comment-id',
        content: 'Great article',
        articleId: 'article-id',
        authorId: 'author-id',
        createdAt: comment.createdAt.getTime(),
      },
    ]);
  });

  it('findById returns mapped comment', async () => {
    prismaMock.comment.findUnique.mockResolvedValue(comment);

    const result = await service.findById('comment-id');

    expect(prismaMock.comment.findUnique).toHaveBeenCalledWith({
      where: { id: 'comment-id' },
    });
    expect(result).toEqual({
      id: 'comment-id',
      content: 'Great article',
      articleId: 'article-id',
      authorId: 'author-id',
      createdAt: comment.createdAt.getTime(),
    });
  });

  it('findById throws NotFoundException', async () => {
    prismaMock.comment.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create throws when article does not exist', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          content: 'Great article',
          articleId: 'missing-article',
          authorId: 'author-id',
        },
        adminActor,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('create uses provided authorId for admin', async () => {
    prismaMock.article.findUnique.mockResolvedValue(article);
    prismaMock.comment.create.mockResolvedValue(comment);

    const result = await service.create(
      {
        content: 'Great article',
        articleId: 'article-id',
        authorId: 'author-id',
      },
      adminActor,
    );

    expect(prismaMock.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Great article',
        articleId: 'article-id',
        authorId: 'author-id',
      },
    });
    expect(result.authorId).toBe('author-id');
  });

  it('create forces editor authorId to self', async () => {
    prismaMock.article.findUnique.mockResolvedValue(article);
    prismaMock.comment.create.mockResolvedValue({
      ...comment,
      authorId: editorActor.userId,
    });

    await service.create(
      {
        content: 'Great article',
        articleId: 'article-id',
        authorId: 'someone-else',
      },
      editorActor,
    );

    expect(prismaMock.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Great article',
        articleId: 'article-id',
        authorId: editorActor.userId,
      },
    });
  });

  it('delete throws NotFoundException when comment does not exist', async () => {
    prismaMock.comment.findUnique.mockResolvedValue(null);

    await expect(service.delete('missing-id', adminActor)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('delete throws ForbiddenException when editor deletes foreign comment', async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      id: 'comment-id',
      authorId: 'other-user-id',
    });

    await expect(service.delete('comment-id', editorActor)).rejects.toThrow(
      new ForbiddenException('Insufficient permissions'),
    );
  });

  it('delete removes comment on success', async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      id: 'comment-id',
      authorId: 'author-id',
    });
    prismaMock.comment.delete.mockResolvedValue(undefined);

    await service.delete('comment-id', adminActor);

    expect(prismaMock.comment.delete).toHaveBeenCalledWith({
      where: { id: 'comment-id' },
    });
  });

  it('delete converts P2025 to NotFoundException', async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      id: 'comment-id',
      authorId: 'author-id',
    });
    prismaMock.comment.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.delete('comment-id', adminActor)).rejects.toThrow(
      NotFoundException,
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  mapArticle,
  mapComment,
  mapRoleFromPrisma,
  mapRoleToPrisma,
  mapUser,
} from './mappers';
import { UserRole } from '../enums/user-role.enum';
import { ArticleStatus } from '../enums/article-status.enum';

describe('mappers', () => {
  describe('mapRoleFromPrisma', () => {
    it('maps ADMIN role', () => {
      expect(mapRoleFromPrisma('ADMIN')).toBe(UserRole.ADMIN);
    });

    it('maps EDITOR role', () => {
      expect(mapRoleFromPrisma('EDITOR')).toBe(UserRole.EDITOR);
    });

    it('maps VIEWER role', () => {
      expect(mapRoleFromPrisma('VIEWER')).toBe(UserRole.VIEWER);
    });
  });

  describe('mapRoleToPrisma', () => {
    it('maps admin role', () => {
      expect(mapRoleToPrisma(UserRole.ADMIN)).toBe('ADMIN');
    });

    it('maps editor role', () => {
      expect(mapRoleToPrisma(UserRole.EDITOR)).toBe('EDITOR');
    });

    it('maps viewer role', () => {
      expect(mapRoleToPrisma(UserRole.VIEWER)).toBe('VIEWER');
    });
  });

  describe('mapArticle', () => {
    it('maps article to response shape', () => {
      const createdAt = new Date('2026-04-26T12:00:00.000Z');
      const updatedAt = new Date('2026-04-26T13:00:00.000Z');

      const result = mapArticle({
        id: 'article-id',
        title: 'Article title',
        content: 'Article content',
        status: 'PUBLISHED',
        authorId: 'author-id',
        categoryId: 'category-id',
        createdAt,
        updatedAt,
        tags: [
          { id: 'tag-1', name: 'nestjs' },
          { id: 'tag-2', name: 'swagger' },
        ],
      });

      expect(result).toEqual({
        id: 'article-id',
        title: 'Article title',
        content: 'Article content',
        status: ArticleStatus.PUBLISHED,
        authorId: 'author-id',
        categoryId: 'category-id',
        createdAt: createdAt.getTime(),
        updatedAt: updatedAt.getTime(),
        tags: ['nestjs', 'swagger'],
      });
    });

    it('throws for invalid article status', () => {
      expect(() =>
        mapArticle({
          id: 'article-id',
          title: 'Article title',
          content: 'Article content',
          status: 'BROKEN' as never,
          authorId: 'author-id',
          categoryId: 'category-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
        }),
      ).toThrow(new Error('Invalid status: BROKEN'));
    });
  });

  describe('mapUser', () => {
    it('strips password and maps role/timestamps', () => {
      const createdAt = new Date('2026-04-26T12:00:00.000Z');
      const updatedAt = new Date('2026-04-26T13:00:00.000Z');

      const result = mapUser({
        id: 'user-id',
        login: 'john.doe',
        password: 'secret',
        role: 'EDITOR',
        createdAt,
        updatedAt,
      });

      expect(result).toEqual({
        id: 'user-id',
        login: 'john.doe',
        role: UserRole.EDITOR,
        createdAt: createdAt.getTime(),
        updatedAt: updatedAt.getTime(),
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('mapComment', () => {
    it('maps comment timestamps', () => {
      const createdAt = new Date('2026-04-26T12:00:00.000Z');

      const result = mapComment({
        id: 'comment-id',
        content: 'Nice article',
        articleId: 'article-id',
        authorId: 'author-id',
        createdAt,
      });

      expect(result).toEqual({
        id: 'comment-id',
        content: 'Nice article',
        articleId: 'article-id',
        authorId: 'author-id',
        createdAt: createdAt.getTime(),
      });
    });
  });
});

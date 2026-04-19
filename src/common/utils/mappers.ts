import { User, Article, Comment, Tag } from '@prisma/client';
import { UserRole } from '../enums/user-role.enum';
import { ArticleStatus } from '../enums/article-status.enum';

import { UserRole as PrismaUserRole } from '@prisma/client';

export const mapRoleFromPrisma = (role: PrismaUserRole): UserRole => {
  switch (role) {
    case 'ADMIN':
      return UserRole.ADMIN;
    case 'EDITOR':
      return UserRole.EDITOR;
    case 'VIEWER':
      return UserRole.VIEWER;
  }
};

export const mapRoleToPrisma = (role: UserRole): PrismaUserRole => {
  switch (role) {
    case UserRole.ADMIN:
      return 'ADMIN';
    case UserRole.EDITOR:
      return 'EDITOR';
    case UserRole.VIEWER:
      return 'VIEWER';
  }
};

const mapArticleStatus = (status: string): ArticleStatus => {
  const normalized = status.toLowerCase() as ArticleStatus;
  if (!Object.values(ArticleStatus).includes(normalized)) {
    throw new Error(`Invalid status: ${status}`);
  }
  return normalized;
};

type ArticleWithTags = Article & {
  tags: Tag[];
};

export const mapArticle = (article: ArticleWithTags) => {
  const { tags, createdAt, updatedAt, status, ...rest } = article;

  return {
    ...rest,
    status: mapArticleStatus(status),
    tags: tags.map((t) => t.name),
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
  };
};

export const mapUser = (user: User) => {
  const { password: _, createdAt, updatedAt, role, ...rest } = user;

  return {
    ...rest,
    role: mapRoleFromPrisma(role),
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
  };
};

export const mapComment = (comment: Comment) => {
  const { createdAt, ...rest } = comment;

  return {
    ...rest,
    createdAt: createdAt.getTime(),
  };
};

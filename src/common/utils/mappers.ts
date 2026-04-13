import { User, Article, Comment, Tag } from '@prisma/client';
import { UserRole } from '../enums/user-role.enum';
import { ArticleStatus } from '../enums/article-status.enum';

export const mapUserRole = (role: string): UserRole => {
  const normalized = role.toLowerCase() as UserRole;
  if (!Object.values(UserRole).includes(normalized)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return normalized;
};

export const mapArticleStatus = (status: string): ArticleStatus => {
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
    role: mapUserRole(role),
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

import { describe, expect, it } from 'vitest';
import { CreateArticleDto } from '../article/dto/create-article.dto';
import { SignupDto } from '../auth/dto/signup.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { RefreshDto } from '../auth/dto/refresh.dto';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import { CreateCommentDto } from '../comment/dto/create-comment.dto';
import { ArticleStatus } from './enums/article-status.enum';
import { UserRole } from './enums/user-role.enum';
import { validateDto } from './testing/validation.helper';
import { CreateUserDto } from '../user/dto/create-user.dto';

describe('DTO validation', () => {
  it('fails SignupDto when required fields are missing', async () => {
    const errors = await validateDto(SignupDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['login', 'password']),
    );
  });

  it('passes valid SignupDto payload', async () => {
    const errors = await validateDto(SignupDto, {
      login: 'john.doe',
      password: 'Pass123!',
    });

    expect(errors).toHaveLength(0);
  });

  it('fails LoginDto when required fields are missing', async () => {
    const errors = await validateDto(LoginDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['login', 'password']),
    );
  });

  it('passes valid LoginDto payload', async () => {
    const errors = await validateDto(LoginDto, {
      login: 'john.doe',
      password: 'Pass123!',
    });

    expect(errors).toHaveLength(0);
  });

  it('fails RefreshDto for invalid refreshToken type', async () => {
    const errors = await validateDto(RefreshDto, {
      refreshToken: 12345,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('refreshToken');
  });

  it('passes valid RefreshDto payload', async () => {
    const errors = await validateDto(RefreshDto, {
      refreshToken: 'refresh-token',
    });

    expect(errors).toHaveLength(0);
  });

  it('fails CreateUserDto when required fields are missing', async () => {
    const errors = await validateDto(CreateUserDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['login', 'password']),
    );
  });

  it('fails CreateUserDto for invalid role enum', async () => {
    const errors = await validateDto(CreateUserDto, {
      login: 'john.doe',
      password: 'Pass123!',
      role: 'superadmin',
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('role');
  });

  it('passes valid CreateUserDto payload', async () => {
    const errors = await validateDto(CreateUserDto, {
      login: 'john.doe',
      password: 'Pass123!',
      role: UserRole.EDITOR,
    });

    expect(errors).toHaveLength(0);
  });

  it('fails CreateArticleDto when required fields are missing', async () => {
    const errors = await validateDto(CreateArticleDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['title', 'content', 'status', 'tags']),
    );
  });

  it('fails CreateArticleDto for invalid status enum', async () => {
    const errors = await validateDto(CreateArticleDto, {
      title: 'Article title',
      content: 'Article content',
      status: 'invalid-status',
      tags: ['nestjs'],
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('passes valid CreateArticleDto payload', async () => {
    const errors = await validateDto(CreateArticleDto, {
      title: 'Article title',
      content: 'Article content',
      status: ArticleStatus.PUBLISHED,
      authorId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      tags: ['nestjs', 'swagger'],
    });

    expect(errors).toHaveLength(0);
  });

  it('fails CreateCategoryDto when required fields are missing', async () => {
    const errors = await validateDto(CreateCategoryDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'description']),
    );
  });

  it('passes valid CreateCategoryDto payload', async () => {
    const errors = await validateDto(CreateCategoryDto, {
      name: 'Backend',
      description: 'Backend development related materials',
    });

    expect(errors).toHaveLength(0);
  });

  it('fails CreateCommentDto when required fields are missing', async () => {
    const errors = await validateDto(CreateCommentDto, {});

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['content', 'articleId']),
    );
  });

  it('passes valid CreateCommentDto payload', async () => {
    const errors = await validateDto(CreateCommentDto, {
      content: 'Great article',
      articleId: '550e8400-e29b-41d4-a716-446655440002',
      authorId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(errors).toHaveLength(0);
  });
});

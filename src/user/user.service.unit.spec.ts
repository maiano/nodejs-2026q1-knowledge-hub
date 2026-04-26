import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenError, NotFoundError } from '../common/errors';
import { UserRole } from '../common/enums/user-role.enum';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';
import { UserService } from './user.service';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const originalEnv = { ...process.env };

  const prismaUser = {
    id: 'user-id',
    login: 'john.doe',
    password: 'hashed-password',
    role: 'VIEWER' as const,
    createdAt: new Date('2026-04-26T12:00:00.000Z'),
    updatedAt: new Date('2026-04-26T12:00:00.000Z'),
  };

  beforeEach(async () => {
    clearPrismaMock();
    process.env.CRYPT_SALT = '12';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('findAll', () => {
    it('returns mapped users without password', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        prismaUser,
        {
          ...prismaUser,
          id: 'user-2',
          login: 'alice',
          role: 'ADMIN' as const,
        },
      ]);

      const result = await service.findAll();

      expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: 'user-id',
          login: 'john.doe',
          role: UserRole.VIEWER,
          createdAt: prismaUser.createdAt.getTime(),
          updatedAt: prismaUser.updatedAt.getTime(),
        },
        {
          id: 'user-2',
          login: 'alice',
          role: UserRole.ADMIN,
          createdAt: prismaUser.createdAt.getTime(),
          updatedAt: prismaUser.updatedAt.getTime(),
        },
      ]);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
    });
  });

  describe('findById', () => {
    it('returns mapped user on success', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);

      const result = await service.findById('user-id');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(result).toEqual({
        id: prismaUser.id,
        login: prismaUser.login,
        role: UserRole.VIEWER,
        createdAt: prismaUser.createdAt.getTime(),
        updatedAt: prismaUser.updatedAt.getTime(),
      });
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundError when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        new NotFoundError('User missing-id not found'),
      );
    });
  });

  describe('create', () => {
    it('hashes password and defaults role to viewer', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockResolvedValue(prismaUser);

      const result = await service.create({
        login: 'john.doe',
        password: 'PlainPass123!',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPass123!', 12);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          login: 'john.doe',
          password: 'hashed-password',
          role: 'VIEWER',
        },
      });
      expect(result.role).toBe(UserRole.VIEWER);
      expect(result).not.toHaveProperty('password');
    });

    it('uses provided role when creating user', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockResolvedValue({
        ...prismaUser,
        role: 'EDITOR' as const,
      });

      const result = await service.create({
        login: 'editor.user',
        password: 'PlainPass123!',
        role: UserRole.EDITOR,
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          login: 'editor.user',
          password: 'hashed-password',
          role: 'EDITOR',
        },
      });
      expect(result.role).toBe(UserRole.EDITOR);
    });

    it('throws ConflictException on duplicate login', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate login', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          login: 'john.doe',
          password: 'PlainPass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('throws NotFoundError when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('missing-id', {
          oldPassword: 'old-pass',
          newPassword: 'new-pass',
        }),
      ).rejects.toThrow(new NotFoundError('User missing-id not found'));
    });

    it('throws ForbiddenError when old password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.updatePassword('user-id', {
          oldPassword: 'wrong-pass',
          newPassword: 'new-pass',
        }),
      ).rejects.toThrow(new ForbiddenError('Old password is incorrect'));
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrong-pass',
        prismaUser.password,
      );
    });

    it('hashes new password and returns mapped user on success', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password' as never);
      prismaMock.user.update.mockResolvedValue({
        ...prismaUser,
        password: 'new-hashed-password',
        updatedAt: new Date('2026-04-26T13:00:00.000Z'),
      });

      const result = await service.updatePassword('user-id', {
        oldPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass', 12);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { password: 'new-hashed-password' },
      });
      expect(result).toEqual({
        id: 'user-id',
        login: 'john.doe',
        role: UserRole.VIEWER,
        createdAt: prismaUser.createdAt.getTime(),
        updatedAt: new Date('2026-04-26T13:00:00.000Z').getTime(),
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('delete', () => {
    it('throws NotFoundError when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing-id')).rejects.toThrow(
        new NotFoundError('User missing-id not found'),
      );
    });

    it('deletes user and related comments via transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);
      prismaMock.comment.deleteMany.mockReturnValue(
        'delete-comments-operation',
      );
      prismaMock.user.delete.mockReturnValue('delete-user-operation');
      prismaMock.$transaction.mockResolvedValue(undefined);

      await service.delete('user-id');

      expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({
        where: { authorId: 'user-id' },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledWith([
        'delete-comments-operation',
        'delete-user-operation',
      ]);
    });
  });

  describe('findPaginated', () => {
    it('returns paginated users with sorting', async () => {
      prismaMock.user.count.mockReturnValue('count-operation');
      prismaMock.user.findMany.mockReturnValue('find-many-operation');
      prismaMock.$transaction.mockResolvedValue([
        2,
        [
          prismaUser,
          {
            ...prismaUser,
            id: 'user-2',
            login: 'zeta',
            role: 'EDITOR' as const,
          },
        ],
      ]);

      const result = await service.findPaginated({
        page: 2,
        limit: 5,
        sortBy: 'login',
        order: 'desc',
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { login: 'desc' },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledWith([
        'count-operation',
        'find-many-operation',
      ]);
      expect(result).toEqual({
        data: [
          {
            id: 'user-id',
            login: 'john.doe',
            role: UserRole.VIEWER,
            createdAt: prismaUser.createdAt.getTime(),
            updatedAt: prismaUser.updatedAt.getTime(),
          },
          {
            id: 'user-2',
            login: 'zeta',
            role: UserRole.EDITOR,
            createdAt: prismaUser.createdAt.getTime(),
            updatedAt: prismaUser.updatedAt.getTime(),
          },
        ],
        total: 2,
        page: 2,
        limit: 5,
      });
    });

    it('ignores unsupported sort field', async () => {
      prismaMock.user.count.mockReturnValue('count-operation');
      prismaMock.user.findMany.mockReturnValue('find-many-operation');
      prismaMock.$transaction.mockResolvedValue([0, []]);

      await service.findPaginated({
        page: 1,
        limit: 10,
        sortBy: 'password',
        order: 'asc',
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: undefined,
      });
    });
  });
});

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: {
    sign: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  const originalEnv = { ...process.env };

  const signupDto = {
    login: 'user_login',
    password: 'PlainPass123!',
  };

  const loginDto = {
    login: 'user_login',
    password: 'PlainPass123!',
  };

  const refreshDto = {
    refreshToken: 'refresh-token',
  };

  const prismaUser = {
    id: 'user-id',
    login: signupDto.login,
    password: 'hashed-password',
    role: 'VIEWER' as const,
    createdAt: new Date('2026-04-26T10:00:00.000Z'),
    updatedAt: new Date('2026-04-26T10:00:00.000Z'),
  };

  beforeEach(async () => {
    clearPrismaMock();

    process.env.CRYPT_SALT = '12';
    process.env.JWT_SECRET_KEY = 'access-secret';
    process.env.JWT_SECRET_REFRESH_KEY = 'refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '7d';

    jwtService = {
      sign: vi.fn(),
      verifyAsync: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('signup', () => {
    it('creates a user with hashed password and viewer role', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockResolvedValue(prismaUser);

      const result = await service.signup(signupDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 12);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          login: signupDto.login,
          password: 'hashed-password',
          role: 'VIEWER',
        },
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

    it('throws BadRequestException on duplicate login', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate login', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.signup(signupDto)).rejects.toThrow(
        new BadRequestException(`Login "${signupDto.login}" is already taken`),
      );
    });
  });

  describe('login', () => {
    it('throws ForbiddenException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException('Invalid login or password'),
      );
    });

    it('throws ForbiddenException when password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException('Invalid login or password'),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        prismaUser.password,
      );
    });

    it('returns access and refresh tokens for valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(prismaUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          userId: prismaUser.id,
          login: prismaUser.login,
          role: UserRole.VIEWER,
        },
        {
          secret: 'access-secret',
          expiresIn: '15m',
        },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          userId: prismaUser.id,
          login: prismaUser.login,
          role: UserRole.VIEWER,
        },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refresh token is missing', async () => {
      await expect(
        service.refresh({ refreshToken: undefined }),
      ).rejects.toThrow(new UnauthorizedException('Refresh token is required'));
    });

    it('throws ForbiddenException when token is blacklisted', async () => {
      prismaMock.tokenBlacklist.findUnique.mockResolvedValue({
        id: 'blacklist-id',
        token: refreshDto.refreshToken,
        expiresAt: new Date(),
      });

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        new ForbiddenException('Token has been invalidated'),
      );
    });

    it('throws ForbiddenException for invalid or expired token', async () => {
      prismaMock.tokenBlacklist.findUnique.mockResolvedValue(null);
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        new ForbiddenException('Invalid or expired refresh token'),
      );
    });

    it('returns a new access and refresh token pair for valid token', async () => {
      prismaMock.tokenBlacklist.findUnique.mockResolvedValue(null);
      jwtService.verifyAsync.mockResolvedValue({
        userId: 'user-id',
        login: 'user_login',
        role: UserRole.ADMIN,
      });
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh(refreshDto);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        {
          secret: 'refresh-secret',
        },
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          userId: 'user-id',
          login: 'user_login',
          role: UserRole.ADMIN,
        },
        {
          secret: 'access-secret',
          expiresIn: '15m',
        },
      );
    });
  });

  describe('logout', () => {
    it('throws UnauthorizedException when refresh token is missing', async () => {
      await expect(service.logout('')).rejects.toThrow(
        new UnauthorizedException('Refresh token is required'),
      );
    });

    it('throws ForbiddenException for invalid or expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(service.logout(refreshDto.refreshToken)).rejects.toThrow(
        new ForbiddenException('Invalid or expired refresh token'),
      );
    });

    it('stores valid refresh token in blacklist', async () => {
      const exp = Math.floor(
        new Date('2026-05-01T00:00:00.000Z').getTime() / 1000,
      );

      jwtService.verifyAsync.mockResolvedValue({ exp });
      prismaMock.tokenBlacklist.upsert.mockResolvedValue({
        id: 'blacklist-id',
        token: refreshDto.refreshToken,
        expiresAt: new Date(exp * 1000),
      });

      await service.logout(refreshDto.refreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        {
          secret: 'refresh-secret',
        },
      );
      expect(prismaMock.tokenBlacklist.upsert).toHaveBeenCalledWith({
        where: {
          token: refreshDto.refreshToken,
        },
        update: {
          expiresAt: new Date(exp * 1000),
        },
        create: {
          token: refreshDto.refreshToken,
          expiresAt: new Date(exp * 1000),
        },
      });
    });
  });

  describe('cleanExpiredTokens', () => {
    it('deletes expired tokens from blacklist', async () => {
      prismaMock.tokenBlacklist.deleteMany.mockResolvedValue({ count: 2 });

      await service.cleanExpiredTokens();

      expect(prismaMock.tokenBlacklist.deleteMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.tokenBlacklist.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});

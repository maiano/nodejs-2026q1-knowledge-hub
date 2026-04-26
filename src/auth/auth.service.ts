import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  mapRoleFromPrisma,
  mapRoleToPrisma,
  mapUser,
} from '../common/utils/mappers';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../common/errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const salt = parseInt(process.env.CRYPT_SALT ?? '10');
    const password = await bcrypt.hash(dto.password, salt);

    try {
      const user = await this.prisma.user.create({
        data: {
          login: dto.login,
          password,
          role: mapRoleToPrisma(UserRole.VIEWER),
        },
      });
      return mapUser(user);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ValidationError(`Login "${dto.login}" is already taken`);
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) throw new ForbiddenError('Invalid login or password');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new ForbiddenError('Invalid login or password');

    return this.generateTokens(
      user.id,
      user.login,
      mapRoleFromPrisma(user.role),
    );
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });

      await this.prisma.tokenBlacklist.upsert({
        where: {
          token: refreshToken,
        },
        update: {
          expiresAt: new Date(payload.exp * 1000),
        },
        create: {
          token: refreshToken,
          expiresAt: new Date(payload.exp * 1000),
        },
      });
    } catch {
      throw new ForbiddenError('Invalid or expired refresh token');
    }
  }

  async refresh(dto: RefreshDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const blacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { token: dto.refreshToken },
    });
    if (blacklisted) {
      throw new ForbiddenError('Token has been invalidated');
    }

    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });

      return this.generateTokens(payload.userId, payload.login, payload.role);
    } catch {
      throw new ForbiddenError('Invalid or expired refresh token');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    await this.prisma.tokenBlacklist.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private generateTokens(userId: string, login: string, role: UserRole) {
    const payload = { userId, login, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
    });

    return { accessToken, refreshToken };
  }
}

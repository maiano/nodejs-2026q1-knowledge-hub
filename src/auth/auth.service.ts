import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
        throw new BadRequestException(`Login "${dto.login}" is already taken`);
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) throw new ForbiddenException('Invalid login or password');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new ForbiddenException('Invalid login or password');

    return this.generateTokens(
      user.id,
      user.login,
      mapRoleFromPrisma(user.role),
    );
  }

  async refresh(dto: RefreshDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });

      return this.generateTokens(payload.userId, payload.login, payload.role);
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
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

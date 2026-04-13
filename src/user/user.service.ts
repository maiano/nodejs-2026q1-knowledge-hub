import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { mapUser } from '../common/utils/mappers';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';

const ALLOWED_SORT = ['id', 'login', 'role', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map(mapUser);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException();
    }

    return mapUser(user);
  }

  async create(dto: CreateUserDto) {
    const salt = parseInt(process.env.CRYPT_SALT ?? '10');

    const password = await bcrypt.hash(dto.password, salt);

    let user;

    try {
      user = await this.prisma.user.create({
        data: {
          login: dto.login,
          password,
          role: (dto.role?.toUpperCase() ?? 'VIEWER') as UserRole,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException();
      }
      throw e;
    }

    return mapUser(user);
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException();
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);

    if (!isMatch) {
      throw new ForbiddenException();
    }

    const salt = parseInt(process.env.CRYPT_SALT ?? '10');

    const password = await bcrypt.hash(dto.newPassword, salt);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { password },
    });

    return mapUser(updated);
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException();
    }

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({
        where: { authorId: id },
      }),
      this.prisma.user.delete({
        where: { id },
      }),
    ]);
  }

  async findPaginated({
    page,
    limit,
    sortBy,
    order,
  }: {
    page: number;
    limit: number;
    sortBy?: string;
    order: 'asc' | 'desc';
  }) {
    const skip = (page - 1) * limit;
    const safeSortBy =
      sortBy && ALLOWED_SORT.includes(sortBy as (typeof ALLOWED_SORT)[number])
        ? sortBy
        : undefined;

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: safeSortBy ? { [safeSortBy]: order } : undefined,
      }),
    ]);

    return {
      data: users.map(mapUser),
      total,
      page,
      limit,
    };
  }
}

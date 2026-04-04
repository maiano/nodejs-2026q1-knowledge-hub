import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

import { InMemoryStorage } from '../storage/in-memory.storage';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { User } from './user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UserService {
  constructor(private readonly storage: InMemoryStorage) {}

  private sanitize(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  findAll() {
    return this.storage.getUsers().map((u) => this.sanitize(u));
  }

  findById(id: string) {
    const user = this.storage.getUsers().find((u) => u.id === id);

    if (!user) {
      throw new NotFoundException();
    }

    return this.sanitize(user);
  }

  async create(dto: CreateUserDto) {
    const users = this.storage.getUsers();

    const now = Date.now();

    const newUser: User = {
      id: randomUUID(),
      login: dto.login,
      password: await bcrypt.hash(dto.password, 10),
      role: dto.role ?? UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);

    return this.sanitize(newUser);
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    const users = this.storage.getUsers();

    const user = users.find((u) => u.id === id);

    if (!user) {
      throw new NotFoundException();
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);

    if (!isMatch) {
      throw new ForbiddenException();
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.updatedAt = Date.now();

    return this.sanitize(user);
  }

  delete(id: string) {
    const users = this.storage.getUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      throw new NotFoundException();
    }

    this.handleCascadeDelete(id);

    this.storage.setUsers(users.filter((u) => u.id !== id));
  }

  private handleCascadeDelete(userId: string) {
    const articles = this.storage.getArticles();
    const comments = this.storage.getComments();

    articles.forEach((a) => {
      if (a.authorId === userId) {
        a.authorId = null;
      }
    });

    this.storage.setComments(comments.filter((c) => c.authorId !== userId));
  }
}

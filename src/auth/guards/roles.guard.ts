import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const method = request.method.toUpperCase();

    if (!user) {
      if (!requiredRoles?.length) {
        return true;
      }
      throw new UnauthorizedException('User not authenticated');
    }

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (user.role === UserRole.VIEWER && method !== 'GET') {
      throw new ForbiddenException('Viewers can only perform read operations');
    }

    return true;
  }
}

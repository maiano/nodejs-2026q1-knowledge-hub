import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExecutionContextMock } from '../../common/testing/execution-context.mock';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

const passportCanActivateMock = vi.fn();

vi.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(context: unknown) {
        return passportCanActivateMock(context);
      }
    },
}));

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: Pick<Reflector, 'getAllAndOverride'>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    passportCanActivateMock.mockReset();
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new JwtAuthGuard(reflector as Reflector);
  });

  describe('canActivate', () => {
    it('passes public route without auth', () => {
      const context = createExecutionContextMock();
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(result).toBe(true);
      expect(passportCanActivateMock).not.toHaveBeenCalled();
    });

    it('delegates protected route to passport auth guard', () => {
      const context = createExecutionContextMock();
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
      passportCanActivateMock.mockReturnValue('passport-result');

      const result = guard.canActivate(context);

      expect(result).toBe('passport-result');
      expect(passportCanActivateMock).toHaveBeenCalledWith(context);
    });
  });

  describe('handleRequest', () => {
    const context = createExecutionContextMock();

    it('returns valid user payload', () => {
      const user = {
        userId: 'user-id',
        login: 'john.doe',
        role: UserRole.ADMIN,
      };

      const result = guard.handleRequest(null, user, null, context);

      expect(result).toEqual(user);
    });

    it('throws UnauthorizedException when user is missing', () => {
      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('throws UnauthorizedException with passport error message', () => {
      expect(() =>
        guard.handleRequest(null, null, new Error('jwt expired'), context),
      ).toThrow(new UnauthorizedException('jwt expired'));
    });

    it('throws UnauthorizedException when err is present', () => {
      expect(() =>
        guard.handleRequest(new Error('boom'), null, null, context),
      ).toThrow(new UnauthorizedException('Invalid or expired token'));
    });
  });
});

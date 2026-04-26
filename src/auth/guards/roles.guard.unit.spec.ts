import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../common/enums/user-role.enum';
import { createExecutionContextMock } from '../../common/testing/execution-context.mock';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: Pick<Reflector, 'getAllAndOverride'>;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(reflector as Reflector);
  });

  it('allows request when no roles metadata and no user', () => {
    const context = createExecutionContextMock({
      request: { method: 'GET' },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    const result = guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when user is missing on protected route', () => {
    const context = createExecutionContextMock({
      request: { method: 'GET' },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('User not authenticated'),
    );
  });

  it('passes when user has required role', () => {
    const context = createExecutionContextMock({
      request: {
        method: 'POST',
        user: {
          userId: 'admin-id',
          login: 'admin',
          role: UserRole.ADMIN,
        },
      },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('throws ForbiddenException when role is insufficient', () => {
    const context = createExecutionContextMock({
      request: {
        method: 'POST',
        user: {
          userId: 'viewer-id',
          login: 'viewer',
          role: UserRole.VIEWER,
        },
      },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Insufficient permissions'),
    );
  });

  it('allows viewer with GET method', () => {
    const context = createExecutionContextMock({
      request: {
        method: 'GET',
        user: {
          userId: 'viewer-id',
          login: 'viewer',
          role: UserRole.VIEWER,
        },
      },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('throws ForbiddenException for viewer with non-GET method', () => {
    const context = createExecutionContextMock({
      request: {
        method: 'POST',
        user: {
          userId: 'viewer-id',
          login: 'viewer',
          role: UserRole.VIEWER,
        },
      },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Viewers can only perform read operations'),
    );
  });

  it('allows editor on protected write route when role matches', () => {
    const context = createExecutionContextMock({
      request: {
        method: 'PUT',
        user: {
          userId: 'editor-id',
          login: 'editor',
          role: UserRole.EDITOR,
        },
      },
    });
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([UserRole.EDITOR]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});

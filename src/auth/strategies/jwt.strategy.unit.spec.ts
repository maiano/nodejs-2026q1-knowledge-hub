import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = 'unit-test-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns payload when userId exists', async () => {
    const strategy = new JwtStrategy();
    const payload = {
      userId: 'user-id',
      login: 'john.doe',
      role: UserRole.ADMIN,
    };

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('throws UnauthorizedException when userId is missing', async () => {
    const strategy = new JwtStrategy();

    await expect(
      strategy.validate({
        userId: '',
        login: 'john.doe',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

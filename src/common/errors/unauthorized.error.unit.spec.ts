import { describe, expect, it } from 'vitest';
import { BaseError } from './base.error';
import { UnauthorizedError } from './unauthorized.error';

describe('UnauthorizedError', () => {
  it('uses default status and message', () => {
    const error = new UnauthorizedError();

    expect(error).toBeInstanceOf(BaseError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
    expect(error.name).toBe('UnauthorizedError');
  });

  it('accepts custom message', () => {
    const error = new UnauthorizedError('Refresh token is required');

    expect(error.message).toBe('Refresh token is required');
  });
});

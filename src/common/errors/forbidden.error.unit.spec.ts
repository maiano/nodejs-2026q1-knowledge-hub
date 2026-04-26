import { describe, expect, it } from 'vitest';
import { BaseError } from './base.error';
import { ForbiddenError } from './forbidden.error';

describe('ForbiddenError', () => {
  it('uses default status and message', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(BaseError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden');
    expect(error.name).toBe('ForbiddenError');
  });

  it('accepts custom message', () => {
    const error = new ForbiddenError('Insufficient permissions');

    expect(error.message).toBe('Insufficient permissions');
  });
});

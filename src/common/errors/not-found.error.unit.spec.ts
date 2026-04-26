import { describe, expect, it } from 'vitest';
import { BaseError } from './base.error';
import { NotFoundError } from './not-found.error';

describe('NotFoundError', () => {
  it('uses default status and message', () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(BaseError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('accepts custom message', () => {
    const error = new NotFoundError('User not found');

    expect(error.message).toBe('User not found');
  });
});

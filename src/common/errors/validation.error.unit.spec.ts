import { describe, expect, it } from 'vitest';
import { BaseError } from './base.error';
import { ValidationError } from './validation.error';

describe('ValidationError', () => {
  it('uses default status and message', () => {
    const error = new ValidationError();

    expect(error).toBeInstanceOf(BaseError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.name).toBe('ValidationError');
  });

  it('accepts custom message', () => {
    const error = new ValidationError('Login is already taken');

    expect(error.message).toBe('Login is already taken');
  });
});

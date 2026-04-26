import { describe, expect, it } from 'vitest';
import { BaseError } from './base.error';

describe('BaseError', () => {
  it('stores statusCode and message', () => {
    const error = new BaseError(418, 'Teapot');

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('Teapot');
    expect(error.name).toBe('BaseError');
  });
});

import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UuidValidationPipe } from './uuid-validation.pipe';

describe('UuidValidationPipe', () => {
  const pipe = new UuidValidationPipe();

  it('passes valid UUID through', () => {
    const value = '550e8400-e29b-41d4-a716-446655440000';

    expect(pipe.transform(value)).toBe(value);
  });

  it('throws BadRequestException for invalid UUID', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(
      new BadRequestException('Validation failed (uuid is expected)'),
    );
  });
});

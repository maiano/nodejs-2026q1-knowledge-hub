import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiRateLimitGuard } from './ai-rate-limit.guard';

describe('AiRateLimitGuard', () => {
  let guard: AiRateLimitGuard;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));
    process.env.AI_RATE_LIMIT_RPM = '2';
    guard = new AiRateLimitGuard();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createContext = (ip = '127.0.0.1', forwardedFor?: string) => {
    const setHeader = vi.fn();
    const request = {
      ip,
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    };

    return {
      setHeader,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader }),
        }),
      },
    };
  };

  it('allows requests within configured limit', () => {
    const { context } = createContext();

    expect(guard.canActivate(context as any)).toBe(true);
    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('throws 429 and sets Retry-After when limit is exceeded', () => {
    const { context, setHeader } = createContext();

    guard.canActivate(context as any);
    guard.canActivate(context as any);

    try {
      guard.canActivate(context as any);
      throw new Error('Expected rate limit exception');
    } catch (error) {
      expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('uses x-forwarded-for when present', () => {
    const forwarded = createContext('127.0.0.1', '203.0.113.5, 10.0.0.1');

    expect(guard.canActivate(forwarded.context as any)).toBe(true);
    expect(guard.canActivate(forwarded.context as any)).toBe(true);

    const other = createContext('127.0.0.1');
    expect(guard.canActivate(other.context as any)).toBe(true);
  });

  it('resets limit after the time window expires', () => {
    const { context } = createContext();

    expect(guard.canActivate(context as any)).toBe(true);
    expect(guard.canActivate(context as any)).toBe(true);

    vi.advanceTimersByTime(60_001);

    expect(guard.canActivate(context as any)).toBe(true);
  });
});

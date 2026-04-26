import { afterEach, describe, expect, it, vi } from 'vitest';

describe('logger.config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('sanitizes sensitive fields recursively', async () => {
    const { sanitize } = await import('./logger.config');

    expect(
      sanitize({
        password: 'secret',
        nested: {
          token: 'jwt',
          refreshToken: 'refresh',
          accessToken: 'access',
          safe: 'value',
        },
      }),
    ).toEqual({
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
        refreshToken: '[REDACTED]',
        accessToken: '[REDACTED]',
        safe: 'value',
      },
    });
  });

  it('uses pino-pretty in development and maps nest log level', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'verbose';
    process.env.LOG_MAX_FILE_SIZE = '2048';
    vi.resetModules();

    const { pinoConfig } = await import('./logger.config');
    const pinoHttp = pinoConfig.pinoHttp as any;

    expect(pinoHttp.level).toBe('trace');
    const targets = pinoHttp.transport.targets;

    expect(targets[0].target).toBe('pino-pretty');
    expect(targets[1].target).toBe('pino-roll');
    expect(targets[1].options.size).toBe('2048k');
  });

  it('uses file transports in production and omits time-based rotation', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'log';
    vi.resetModules();

    const { pinoConfig } = await import('./logger.config');
    const pinoHttp = pinoConfig.pinoHttp as any;

    expect(pinoHttp.level).toBe('info');
    const targets = pinoHttp.transport.targets;

    expect(targets[0].target).toBe('pino-roll');
    expect(targets[0].options.frequency).toBeUndefined();
    expect(targets[1].target).toBe('pino/file');
  });

  it('adds statusCode and responseTime to success and error objects', async () => {
    const { pinoConfig } = await import('./logger.config');
    const pinoHttp = pinoConfig.pinoHttp as any;

    expect(
      pinoHttp.customSuccessObject(
        {},
        { statusCode: 201 },
        { responseTime: 12, foo: 'bar' },
      ),
    ).toEqual({
      responseTime: 12,
      foo: 'bar',
      statusCode: 201,
    });

    const err = new Error('boom');

    expect(
      pinoHttp.customErrorObject({}, { statusCode: 500 }, err, {
        responseTime: 7,
        foo: 'bar',
      }),
    ).toEqual({
      responseTime: 7,
      foo: 'bar',
      err,
      statusCode: 500,
    });
  });
});

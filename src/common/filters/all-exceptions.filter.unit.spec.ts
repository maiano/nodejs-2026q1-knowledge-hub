import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PinoLogger } from 'nestjs-pino';
import { ForbiddenError } from '../errors';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let logger: Pick<PinoLogger, 'setContext' | 'warn' | 'error'>;
  let filter: AllExceptionsFilter;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;

  beforeEach(() => {
    logger = {
      setContext: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    filter = new AllExceptionsFilter(logger as PinoLogger);

    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });

    host = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test',
          method: 'GET',
        }),
        getResponse: () => ({
          status,
        }),
      }),
    } as ArgumentsHost;
  });

  it('logs and returns known HttpException', () => {
    filter.catch(new BadRequestException('Invalid payload'), host);

    expect(logger.warn).toHaveBeenCalledWith(
      { statusCode: 400, url: '/test', method: 'GET' },
      'Invalid payload',
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid payload',
        path: '/test',
      }),
    );
  });

  it('logs and returns custom BaseError', () => {
    filter.catch(new ForbiddenError('Insufficient permissions'), host);

    expect(logger.warn).toHaveBeenCalledWith(
      { statusCode: 403, url: '/test', method: 'GET' },
      'Insufficient permissions',
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      }),
    );
  });

  it('logs unknown errors as internal server error', () => {
    const error = new Error('Boom');

    filter.catch(error, host);

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, url: '/test', method: 'GET' },
      'Unhandled exception',
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      }),
    );
  });
});

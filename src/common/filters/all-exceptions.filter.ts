import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { BaseError } from '../errors/base.error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as any).message ?? exception.message);
    } else if (exception instanceof BaseError) {
      statusCode = exception.statusCode;
      message = exception.message;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
    }

    if (statusCode >= 500) {
      this.logger.error(
        { err: exception, url: request.url, method: request.method },
        'Unhandled exception',
      );
    } else {
      this.logger.warn(
        { statusCode, url: request.url, method: request.method },
        message,
      );
    }

    response.status(statusCode).json({
      statusCode,
      error: this.getErrorName(statusCode),
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorName(statusCode: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return map[statusCode] ?? 'Error';
  }
}

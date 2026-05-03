import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface IpEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly rpm: number;
  private readonly windowMs = 60_000;
  private readonly ipMap = new Map<string, IpEntry>();

  constructor() {
    this.rpm = parseInt(process.env.AI_RATE_LIMIT_RPM ?? '20', 10);
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    this.cleanupExpiredEntries(Date.now());

    const now = Date.now();
    const ip = this.getClientIp(request);
    const entry = this.ipMap.get(ip);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.ipMap.set(ip, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.rpm) {
      const retryAfterSec = Math.ceil(
        (this.windowMs - (now - entry.windowStart)) / 1000,
      );
      response.setHeader('Retry-After', String(retryAfterSec));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Retry after ${retryAfterSec} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
    return true;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0].split(',')[0].trim();
    }

    return request.ip ?? 'unknown';
  }

  private cleanupExpiredEntries(now: number) {
    for (const [ip, entry] of this.ipMap.entries()) {
      if (now - entry.windowStart > this.windowMs) {
        this.ipMap.delete(ip);
      }
    }
  }
}

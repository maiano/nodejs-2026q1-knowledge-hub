import { Injectable } from '@nestjs/common';

@Injectable()
export class AiOutputValidator {
  ensureText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}

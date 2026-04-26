import { BaseError } from './base.error';
export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

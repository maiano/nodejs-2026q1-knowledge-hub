import { BaseError } from './base.error';
export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

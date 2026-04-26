import { BaseError } from './base.error';
export class ValidationError extends BaseError {
  constructor(message = 'Validation failed') {
    super(400, message);
  }
}

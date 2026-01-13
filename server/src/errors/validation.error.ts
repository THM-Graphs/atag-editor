import AppError from './app.error.js';

/**
 * Represents an error for validation failures (e.g. missing required fields in the payload).
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

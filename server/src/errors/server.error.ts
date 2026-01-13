import AppError from './app.error.js';

/**
 * Represents an internal server error. Used as generic fallback for unexpected errors.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class InternalServerError extends AppError {
  constructor(message: string) {
    super(500, message);
  }
}

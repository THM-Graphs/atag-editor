import AppError from './app.error.js';

/**
 * Represents an error for external service failures (currently, when fetching guidelines or styles fails).
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ExternalServiceError extends AppError {
  constructor(message: string) {
    super(502, message);
  }
}

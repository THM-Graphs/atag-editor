import AppError from './app.error.js';

/**
 * Represents an error for validation failures (e.g. missing required fields or node labels).
 * Can be thrown during data checks in the frontend or when a response is received from the backend.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
  }
}

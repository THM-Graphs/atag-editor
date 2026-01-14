import AppError from './app.error.js';

/**
 * Represents an error for database connection failures.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class DatabaseConnectionError extends AppError {
  constructor(message: string) {
    super(503, message);
  }
}

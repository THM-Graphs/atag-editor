import AppError from './app.error.js';

/**
 * Represents an error for resources that could not be found in the database.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

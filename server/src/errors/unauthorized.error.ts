import AppError from './app.error.js';

/**
 * Represents an error for unauthorized access for a specific resource/request/action.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}

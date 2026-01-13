import AppError from './app.error';

/**
 * Represents an API-related error. Extends the generic `AppError` class by adding an HTTP status code.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ApiError extends AppError {
  /**
   * The HTTP status code associated with the error.
   *
   * @type {number} - The HTTP status code.
   */
  statusCode: number;

  constructor(httpStatusCode: number, message: string) {
    super(message);
    this.statusCode = httpStatusCode;
  }
}

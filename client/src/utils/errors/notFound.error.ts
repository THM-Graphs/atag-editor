import ApiError from './api.error';

/**
 * Represents an error for resources that could not be found in the database.
 *
 * @extends {ApiError} - The base API error class.
 */
export default class NotFoundError extends ApiError {
  /**
   * Creates an instance of NotFoundError.
   *
   * @param {number} httpStatusCode - The HTTP status code of the error.
   * @param {string} message - The error message.
   */
  constructor(httpStatusCode: number, message: string) {
    super(httpStatusCode, message);
  }
}

/**
 * Represents an error for resources that could not be found in the database.
 *
 * @extends {Error}
 */
export default class NotFoundError extends Error {
  /**
   * The HTTP status code associated with the error.
   * @type {number}
   * @readonly
   */
  public code: number;

  /**
   * Creates an instance of NotFoundError.
   *
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.code = 404;
  }
}

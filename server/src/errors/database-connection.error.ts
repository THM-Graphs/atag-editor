/**
 * Represents an error for database connection failures.
 *
 * @extends {Error}
 */
export default class DatabaseConnectionError extends Error {
  /**
   * The HTTP status code associated with the error.
   * @type {number}
   * @readonly
   */
  public code: number;

  /**
   * Creates an instance of DatabaseConnectionError.
   *
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.code = 503;
  }
}

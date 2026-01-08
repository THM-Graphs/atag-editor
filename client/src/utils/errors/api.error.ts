/**
 * Represents an API-related error.
 *
 * @extends {Error}
 */
export default class ApiError extends Error {
  /**
   * The severity level of the error. 'error' by default.
   *
   * @type {'error' | 'warn'}
   */
  severity: 'error' | 'warn';

  /**
   * The HTTP status code associated with the error.
   *
   * @type {number} - The HTTP status code.
   */
  statusCode: number;

  /**
   * Creates an instance of ApiError.
   * @param {string} message - The error message.
   */
  constructor(httpStatusCode: number, message: string) {
    super(message);

    this.name = this.constructor.name;
    this.severity = 'error';
    this.statusCode = httpStatusCode;
  }
}

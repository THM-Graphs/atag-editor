/**
 * Generic error class for application-level errors.
 *
 * @extends {Error} - The base error class.
 */
export default class AppError extends Error {
  /**
   * The HTTP status code associated with the error.
   * @type {number}
   * @readonly
   */
  public code: number;

  /**
   * Creates an instance of `AppError`.
   *
   * @param {number} errorCode - The code associated with the error.
   * @param {string} message - The error message.
   */
  constructor(errorCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = errorCode;
  }
}

/**
 * Represents an error for database connection failures.
 *
 * @extends {Error}
 */
export default class DatabaseConnectionError extends Error {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  /**
   * Creates an instance of DatabaseConnectionError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.severity = 'error';
  }
}

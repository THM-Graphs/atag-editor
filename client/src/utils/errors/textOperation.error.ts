/**
 * Represents an Error related to text operations. Currently used for when a delete operation disrupts the two anchor characters
 * of a zero-point annotation and there is no previous/next character to be the new left/right anchor.
 *
 * @extends {Error}
 */
export default class TextOperationError extends Error {
  /**
   * The severity level of the error.
   * @type {'warn'}
   * @readonly
   */
  severity: 'warn';

  /**
   * Creates an instance of TextOperationError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'TextOperationError';
    this.severity = 'warn';
  }
}

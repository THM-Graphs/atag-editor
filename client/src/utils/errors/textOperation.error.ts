import AppError from './app.error';

/**
 * Represents an Error related to text operations. Currently used for when a delete operation disrupts the two anchor characters
 * of a zero-point annotation and there is no previous/next character to be the new left/right anchor.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class TextOperationError extends AppError {
  /**
   * The severity level of the error.
   * @type {'warn'}
   * @readonly
   */
  severity: 'warn';

  constructor(message: string) {
    super(message);
    this.severity = 'warn';
  }
}

import AppError from './app.error';

/**
 * Represents an error that occurs when the user tries to select an invalid collection as the new target
 * of a "move" or "copy" operation.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class InvalidCollectionTargetError extends AppError {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'warn';

  /**
   * Creates an instance of InvalidCollectionTargetError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.severity = 'warn';
  }
}

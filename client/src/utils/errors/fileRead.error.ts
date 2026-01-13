import AppError from './app.error';

/**
 * Represents an error when reading a provided file during import.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class FileReadingError extends AppError {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  constructor(message: string) {
    super(message);
    this.severity = 'error';
  }
}

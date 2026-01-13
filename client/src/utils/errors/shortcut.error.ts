import AppError from './app.error';

/**
 * Represents an error related to shortcuts. Currently used for when the user hits a shortcut
 * while the corresponding annotation type is filtered out. Not really an "error" in a technical sense,
 * yet feedback should be given to the user.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ShortcutError extends AppError {
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

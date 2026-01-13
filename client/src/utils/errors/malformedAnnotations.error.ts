import AppError from './app.error';

/**
 * Represents an error that occurs when there are malformed annotations during import. This can be because of
 * invalid start/end indices as well as unconfigured annotation types in the Standoff JSON that should be imported.
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class MalformedAnnotationsError extends AppError {
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

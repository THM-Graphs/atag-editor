/**
 * Represents an error that occurs when there are malformed annotations during import. This can be because of
 * invalid start/end indices as well as unconfigured annotation types in the Standoff JSON that should be imported.
 *
 * @extends Error
 */
export default class MalformedAnnotationsError extends Error {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  /**
   * Creates an instance of MalformedAnnotationsError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'MalformedAnnotationsError';
    this.severity = 'error';
  }
}

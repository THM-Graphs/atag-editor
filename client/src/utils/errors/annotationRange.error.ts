/**
 * Represents an error related to invalid ranges during annotating text. Currently used for when the text selection is invalid
 * when the user clicks on an annotation button.
 *
 * @extends {Error}
 */
export default class AnnotationRangeError extends Error {
  /**
   * The severity level of the error.
   * @type {'warn'}
   * @readonly
   */
  severity: 'warn';

  /**
   * Creates an instance of AnnotationRangeError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'AnnotationRangeError';
    this.severity = 'warn';
  }
}

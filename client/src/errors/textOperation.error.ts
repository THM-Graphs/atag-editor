/**
 * Error thrown when a text operation fails. Currently used when a delete operation disrupts the two anchor characters
 * of a zero-point annotation and there is no previous/next character to be the new left/right anchor.
 */
export default class TextOperationError extends Error {
  severity: 'warn';

  constructor(message: string) {
    super(message);
    this.name = 'TextOperationError';
    this.severity = 'warn';
  }
}

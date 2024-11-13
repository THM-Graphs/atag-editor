/**
Represents an error when reading a provided file during import.

@extends {Error}
*/
export default class FileReadingError extends Error {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  /**
   * Creates an instance of FileReadingError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'FileReadingError';
    this.severity = 'error';
  }
}

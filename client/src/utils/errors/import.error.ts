/**
Represents an error when importing json into the editor.

@extends {Error}
*/
export default class ImportError extends Error {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  /**
   * Creates an instance of ImportError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
    this.severity = 'error';
  }
}

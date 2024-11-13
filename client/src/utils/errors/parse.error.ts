/**
Represents an error when parsing JSON during import.

@extends {Error}
*/
export default class JsonParseError extends Error {
  /**
   * The severity level of the error.
   * @type {'error'}
   * @readonly
   */
  severity: 'error';

  /**
   * Creates an instance of JsonParseError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
    this.severity = 'error';
  }
}

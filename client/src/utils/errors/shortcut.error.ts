/**
Represents an error related to shortcuts. Currently used for when the user hits a shortcut
while the corresponding annotation type is filtered out. Not really an "error" in a technical sense,
yet feedback should be given to the user.

@extends {Error}
*/
export default class ShortcutError extends Error {
  /**
   * The severity level of the error.
   * @type {'warn'}
   * @readonly
   */
  severity: 'warn';

  /**
   * Creates an instance of ShortcutError.
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ShortcutError';
    this.severity = 'warn';
  }
}

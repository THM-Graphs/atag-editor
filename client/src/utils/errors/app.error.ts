/**
 * Generic error class for application-level errors.
 *
 * @extends {Error} - The base error class.
 */
export default class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

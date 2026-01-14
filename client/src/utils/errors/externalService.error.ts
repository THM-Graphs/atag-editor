import ApiError from './api.error.js';

/**
 * Represents an error for external service failures (currently, when fetching guidelines or styles fails).
 *
 * @extends {AppError} - The generic `AppError` class.
 */
export default class ExternalServiceError extends ApiError {
  constructor(httpStatusCode: number, message: string) {
    super(httpStatusCode, message);
  }
}

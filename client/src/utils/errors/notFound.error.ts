import ApiError from './api.error';

/**
 * Represents an error for resources that could not be found in the database.
 *
 * @extends {ApiError} - The base API error class.
 */
export default class NotFoundError extends ApiError {
  constructor(httpStatusCode: number, message: string) {
    super(httpStatusCode, message);
  }
}

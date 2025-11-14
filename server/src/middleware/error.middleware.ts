import { NextFunction, Request, Response } from 'express';
import NotFoundError from '../errors/not-found.error.js';
import logger from '../logger.js';

/**
 * Generic error handler.  Output error details as JSON.
 *
 * @param {any} error - The error object that was thrown or passed to the next function.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 * @returns {void} This function does not return any value.
 */
export default function errorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error('error: ', error);

  let statusCode: number = 500;
  let message: string = 'Internal Server Error';

  if (error instanceof NotFoundError) {
    statusCode = 404;
    message = error.message;
  }

  res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    message: message,
    // This would not be ideal for production environment, but since it's commented out, no problem
    // trace: error.trace,
    // details: error.details,
  });
}

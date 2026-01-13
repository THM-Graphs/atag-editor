import { NextFunction, Request, Response } from 'express';
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

  const message: string = error.message ?? 'Internal Server Error';
  const code: number = error.code ?? 500;

  res.status(error.code).json({
    status: 'error',
    code,
    message,
    // This would not be ideal for production environment, but since it's commented out, no problem
    // trace: error.trace,
    // details: error.details,
  });
}

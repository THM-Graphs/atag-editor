import { Request, Response } from 'express';
import morgan from 'morgan';
import logger from '../logger.js';

const loggerMiddleware = morgan(
  function (tokens, req: Request, res: Response) {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number.parseFloat(tokens.status(req, res) as string),
      content_length: tokens.res(req, res, 'content-length'),
      response_time: Number.parseFloat(tokens['response-time'](req, res) as string),
    });
  },
  {
    stream: {
      write: (message: string) => {
        const data = JSON.parse(message);

        logger.http(`Request`, data);
      },
    },
  },
);

export default loggerMiddleware;

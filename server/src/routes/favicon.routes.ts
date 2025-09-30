import express, { NextFunction, Request, Response, Router } from 'express';
import FaviconService from '../services/favicon.service.js';
import { FaviconResponse } from '../models/types.js';

const router: Router = express.Router();

const faviconService: FaviconService = new FaviconService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faviconResponse: FaviconResponse = await faviconService.getFavicon();

    const { data, contentType } = faviconResponse;

    // Cached for 7 days
    res
      .setHeader('Content-Type', contentType)
      .setHeader('Cache-Control', 'public, max-age=604800')
      .status(200)
      .send(data);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

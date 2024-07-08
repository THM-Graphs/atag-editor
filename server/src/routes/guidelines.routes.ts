import express, { NextFunction, Request, Response, Router } from 'express';
import GuidelinesService from '../services/guidelines.service.js';
import { IGuidelines } from '../models/IGuidelines.js';

const router: Router = express.Router();

const guidelineService: GuidelinesService = new GuidelinesService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    res.json(guidelines);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

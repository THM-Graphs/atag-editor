import express, { Request, Response, Router } from 'express';
import GuidelinesService from '../services/guidelines.service.js';
import { IGuidelines } from '../models/IGuidelines.js';

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const guidlineService: GuidelinesService = new GuidelinesService();
  const guidelines: IGuidelines = await guidlineService.getGuidelines();

  res.json(guidelines);
});

export default router;

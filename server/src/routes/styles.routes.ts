import express, { NextFunction, Request, Response, Router } from 'express';
import StylesService from '../services/styles.service.js';

const router: Router = express.Router();

const styleService: StylesService = new StylesService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const styles: string = await styleService.getStyles();

    res.setHeader('Content-Type', 'text/css').status(200).send(styles);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

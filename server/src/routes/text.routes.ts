import express, { Request, Response, Router, NextFunction } from 'express';
import characterRoutes from './characters.routes.js';
import annotationRoutes from './annotations.routes.js';
import TextService from '../services/text.service.js';
import { TextAccessObject } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const textService: TextService = new TextService();

router.get('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const text: TextAccessObject = await textService.getExtendedTextByUuid(uuid);

    res.status(200).json(text);
  } catch (error: unknown) {
    next(error);
  }
});

router.use('/:uuid/characters', characterRoutes);
router.use('/:uuid/annotations', annotationRoutes);

export default router;

import express, { Request, Response, Router, NextFunction } from 'express';
import characterRoutes from './characters.routes.js';
import annotationRoutes from './annotations.routes.js';
import TextService from '../services/text.service.js';
import { Text, TextAccessObject } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const textService: TextService = new TextService();

// GET /collections/:uuid/texts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const collectionUuid: string = req.params.uuid; // This is the collection UUID

  try {
    const texts: Text[] = await textService.getTexts(collectionUuid);

    res.status(200).json(texts);
  } catch (error: unknown) {
    next(error);
  }
});

// GET /collections/:uuid/texts/:textUuid
router.get('/:textUuid', async (req: Request, res: Response, next: NextFunction) => {
  const textUuid: string = req.params.textUuid; // This is the specific text UUID

  try {
    const text: TextAccessObject = await textService.getExtendedTextByUuid(textUuid);

    res.status(200).json(text);
  } catch (error: unknown) {
    next(error);
  }
});

router.use('/:textUuid/characters', characterRoutes);
router.use('/:textUuid/annotations', annotationRoutes);

export default router;

import express, { Request, Response, Router, NextFunction } from 'express';
import characterRoutes from './characters.routes.js';
import annotationRoutes from './annotations.routes.js';
import CollectionService from '../services/collection.service.js';
import GuidelinesService from '../services/guidelines.service.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import { Collection, CollectionAccessObject, CollectionPostData } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const collectionService: CollectionService = new CollectionService();
const guidelineService: GuidelinesService = new GuidelinesService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guidelines: IGuidelines = await guidelineService.getGuidelines();
    const additionalLabel = guidelines.collections['text'].additionalLabel;

    const collections: CollectionAccessObject[] =
      await collectionService.getCollectionsWithTexts(additionalLabel);

    res.status(200).json(collections);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const data: Record<string, string> = { ...req.body };

  try {
    const guidelines: IGuidelines = await guidelineService.getGuidelines();
    const additionalLabel = guidelines.collections['text'].additionalLabel;

    const newCollection: ICollection = await collectionService.createNewCollection(
      data,
      additionalLabel,
    );

    res.status(201).json(newCollection);
  } catch (error: unknown) {
    next(error);
  }
});

router.get('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const collection: CollectionAccessObject =
      await collectionService.getExtendedCollectionById(uuid);

    res.status(200).json(collection);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;
  const data: CollectionPostData = req.body;

  try {
    const collection: ICollection = await collectionService.updateCollection(uuid, data);

    res.status(200).json(collection);
  } catch (error: unknown) {
    next(error);
  }
});

router.delete('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const collection: ICollection = await collectionService.deleteCollection(uuid);

    res.status(200).json(collection);
  } catch (error: unknown) {
    next(error);
  }
});

router.use('/:uuid/characters', characterRoutes);
router.use('/:uuid/annotations', annotationRoutes);

export default router;

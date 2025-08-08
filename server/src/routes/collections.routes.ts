import express, { Request, Response, Router, NextFunction } from 'express';
import characterRoutes from './characters.routes.js';
import annotationRoutes from './annotations.routes.js';
import AnnotationService from '../services/annotation.service.js';
import CollectionService from '../services/collection.service.js';
import GuidelinesService from '../services/guidelines.service.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import IAnnotation from '../models/IAnnotation.js';
import {
  Annotation,
  AnnotationData,
  Collection,
  CollectionAccessObject,
  CollectionPostData,
  CollectionSubTree,
  PaginationResult,
} from '../models/types.js';
import { getPagination } from '../utils/helper.js';

const router: Router = express.Router({ mergeParams: true });

const collectionService: CollectionService = new CollectionService();
const annotationService: AnnotationService = new AnnotationService();
// const guidelineService: GuidelinesService = new GuidelinesService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Fix this
  const uuid: string | null = req.query.uuid ?? null;

  try {
    const subTree: CollectionSubTree = await collectionService.getCollectionSubTree(uuid);

    res.status(200).json(subTree);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const data: CollectionAccessObject = req.body;

  try {
    const newCollection: ICollection = await collectionService.createNewCollection(data);

    res.status(201).json(newCollection);
  } catch (error: unknown) {
    next(error);
  }
});

router.get('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const { collection, texts } = await collectionService.getExtendedCollectionById(uuid);
    const annotations: AnnotationData[] = await annotationService.getAnnotations(uuid);

    const collectionAccessObject: CollectionAccessObject = {
      collection,
      texts,
      annotations,
    };

    res.status(200).json(collectionAccessObject);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;
  const data: CollectionPostData = req.body;

  try {
    const collection: ICollection = await collectionService.updateCollection(uuid, data);

    const annotationObjects = annotationService.createAnnotationObjectsFromCollection(data);
    const updatedAnnotations: IAnnotation[] = await annotationService.saveAnnotations(
      uuid,
      'Collection',
      annotationObjects as Annotation[],
    );

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

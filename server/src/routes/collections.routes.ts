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
  PaginationResult,
} from '../models/types.js';
import { getPagination } from '../utils/helper.js';

const router: Router = express.Router({ mergeParams: true });

const collectionService: CollectionService = new CollectionService();
const annotationService: AnnotationService = new AnnotationService();
const guidelineService: GuidelinesService = new GuidelinesService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    // Get Collection type that is shown in the table and does not only exist as anchor to additional text
    // Needs to be overhauled anyway when whole hierarchies should be handled in the future
    // Careful, a collection with level "primary" MUST exist in the guidelines with this solution
    const primaryCollectionLabel = guidelines.collections.types.find(
      t => t.level === 'primary',
    )!.additionalLabel;

    const { sort, order, limit, skip, search } = getPagination(req);

    const collections: PaginationResult<CollectionAccessObject[]> =
      await collectionService.getCollections(
        primaryCollectionLabel,
        sort,
        order,
        limit,
        skip,
        search,
      );

    res.status(200).json(collections);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { data, nodeLabels }: Collection = req.body;

  try {
    const newCollection: ICollection = await collectionService.createNewCollection(
      data,
      nodeLabels,
    );

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

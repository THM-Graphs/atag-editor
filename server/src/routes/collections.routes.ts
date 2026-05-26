import express, { Request, Response, Router, NextFunction } from 'express';
import annotationRoutes from './annotations.routes.js';
import textRoutes from './text.routes.js';
import AnnotationService from '../services/annotation.service.js';
import CollectionService from '../services/collection.service.js';
import {
  CollectionNode,
  CollectionCreationData,
  NodeAncestry,
  PaginationResult,
  NodeDto,
  NodeStatusObject,
} from '../models/types.js';
import { getPagination } from '../utils/helper.js';

const router: Router = express.Router({ mergeParams: true });

const collectionService: CollectionService = new CollectionService();
const annotationService: AnnotationService = new AnnotationService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order, limit, search, cursor } = getPagination(req);
    const nodeLabels: string[] = (req.query.nodeLabels as string)
      .split(',')
      .filter(label => label.trim() !== '');

    const parentUuid: string | null = req.query.parentUuid as string | null;

    const collections: PaginationResult<NodeDto<CollectionNode>[]> =
      await collectionService.getCollections(nodeLabels, order, limit, search, parentUuid, cursor);

    res.status(200).json(collections);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const data: NodeStatusObject = req.body.data;
  const uuid: string = req.body.uuid;

  try {
    const newCollection: NodeDto<CollectionNode> = await collectionService.createOrAddCollection(
      uuid,
      data,
    );

    res.status(201).json(newCollection);
  } catch (error: unknown) {
    next(error);
  }
});

router.get('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const collection: NodeDto<CollectionNode> = await collectionService.getCollection(uuid);

    res.status(200).json(collection);
  } catch (error: unknown) {
    next(error);
  }
});

router.get('/:uuid/collections', async (req: Request, res: Response, next: NextFunction) => {
  const parentUuid: string = req.params.uuid;

  const { order, limit, search, cursor } = getPagination(req);
  const nodeLabels: string[] = ((req.query.nodeLabels as string) ?? '')
    .split(',')
    .filter(label => label.trim() !== '');

  try {
    const collections: PaginationResult<NodeDto<CollectionNode>[]> =
      await collectionService.getCollections(nodeLabels, order, limit, search, parentUuid, cursor);

    res.status(200).json(collections);
  } catch (error: unknown) {
    next(error);
  }
});

router.get('/:uuid/ancestry', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const ancestryPaths: NodeAncestry[] = await collectionService.getAncestry(uuid);

    res.status(200).json(ancestryPaths);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;
  const data: NodeStatusObject = req.body;

  try {
    const updatedCollection: NodeDto<CollectionNode> = await collectionService.updateCollection(
      uuid,
      data,
    );

    res.status(200).json(updatedCollection);
  } catch (error: unknown) {
    next(error);
  }
});

router.delete('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  const uuid: string = req.params.uuid;

  try {
    const collection: NodeDto<CollectionNode> = await collectionService.deleteCollection(uuid);

    res.status(200).json(collection);
  } catch (error: unknown) {
    next(error);
  }
});

router.use('/:collectionUuid/annotations', annotationRoutes);
router.use('/:collectionUuid/texts', textRoutes);

export default router;

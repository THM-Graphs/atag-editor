import express, { NextFunction, Request, Response, Router } from 'express';
import AnnotationService from '../services/annotation.service.js';
import IAnnotation from '../models/IAnnotation.js';
import { Annotation } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const annotationService: AnnotationService = new AnnotationService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const collectionUuid: string = req.params.uuid;

  try {
    const annotations: IAnnotation[] = await annotationService.getAnnotations(collectionUuid);

    res.status(200).json(annotations);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const collectionUuid: string = req.params.uuid;
  const annotations = req.body;

  try {
    const updatedAnnotations: IAnnotation[] = await annotationService.saveAnnotations(
      collectionUuid,
      annotations as Annotation[],
    );

    res.status(200).json(updatedAnnotations);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

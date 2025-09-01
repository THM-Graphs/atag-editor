import express, { NextFunction, Request, Response, Router } from 'express';
import AnnotationService from '../services/annotation.service.js';
import IAnnotation from '../models/IAnnotation.js';
import { Annotation, AnnotationData } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const annotationService: AnnotationService = new AnnotationService();

function getParentUuid(req: Request): string {
  if (req.params.textUuid) {
    return req.params.textUuid;
  }

  return req.params.collectionUuid;
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const parentUuid: string = getParentUuid(req);

  try {
    const annotations: AnnotationData[] = await annotationService.getAnnotations(parentUuid);

    res.status(200).json(annotations);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parentUuid: string = getParentUuid(req);
  const annotations = req.body;

  try {
    const updatedAnnotations: IAnnotation[] = await annotationService.saveAnnotations(
      parentUuid,
      'Text',
      annotations as Annotation[],
    );

    res.status(200).json(updatedAnnotations);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

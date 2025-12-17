import express, { NextFunction, Request, Response, Router } from 'express';
import EntityService from '../services/entity.service.js';
import { capitalize } from '../utils/helper.js';
import { Entity } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const entityService: EntityService = new EntityService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const nodeLabel: string = capitalize(req.query.node as string);
  const searchStr: string = (req.query.searchStr as string).toLowerCase();

  try {
    const entities: Entity[] = await entityService.searchByLabel(nodeLabel, searchStr);

    res.status(200).json(entities);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

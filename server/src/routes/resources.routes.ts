import express, { NextFunction, Request, Response, Router } from 'express';
import ResourceService from '../services/resource.service.js';
import { capitalize } from '../utils/helper.js';
import IEntity from '../models/IEntity.js';

const router: Router = express.Router({ mergeParams: true });

const resourceService: ResourceService = new ResourceService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const nodeLabel: string = capitalize(req.query.node as string);
  const searchStr: string = (req.query.searchStr as string).toLowerCase();

  try {
    const resources: IEntity[] = await resourceService.searchByLabel(nodeLabel, searchStr);

    res.status(200).json(resources);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

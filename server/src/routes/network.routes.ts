// routes/network.routes.js
import express, { Request, Response, Router, NextFunction } from 'express';
import NetworkService from '../services/network.service.js';
import { CollectionNetworkActionType, NetworkPostData } from '../models/types.js';
import NotFoundError from '../errors/not-found.error.js';

const router: Router = express.Router();
const networkService: NetworkService = new NetworkService();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const data: NetworkPostData = req.body;
  const actionType: CollectionNetworkActionType = data.type;

  try {
    let result;

    if (actionType === 'reference') {
      result = await networkService.referenceNodes(data);
    } else if (actionType === 'move') {
      result = await networkService.moveNodes(data);
    } else if (actionType === 'dereference') {
      result = await networkService.dereferenceNodes(data);
    } else if (actionType === 'delete') {
      // TODO: Not yet implemented
      throw new NotFoundError('You can not delete. Choose another action.');
    } else {
      throw new NotFoundError('An error in modifying the network occured. Please try again.');
    }

    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

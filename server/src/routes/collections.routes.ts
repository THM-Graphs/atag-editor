import express, { Request, Response, Router } from 'express';
import characterRoutes from './characters.routes.js';
import CollectionService from '../services/collection.service.js';
import ICollection from '../models/ICollection.js';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  try {
    const collectionService: CollectionService = new CollectionService();
    const collections: ICollection[] = await collectionService.getCollections('METADATA');

    res.json(collections);
  } catch (error: unknown) {
    console.log(error);
  }
});

router.get('/:uuid', async (req: Request, res: Response) => {
  const uuid: string = req.params.uuid;

  try {
    const collectionService: CollectionService = new CollectionService();
    const collection: ICollection | undefined = await collectionService.getCollectionById(uuid);

    res.json(collection ?? {});
  } catch (error: unknown) {
    console.log(error);
  }
});

router.use('/:uuid/characters', characterRoutes);

export default router;

import express, { Request, Response, Router } from 'express';
import characterRoutes from './characters.routes.js';
import CollectionService from '../services/collection.service.js';
import ICollection from '../models/ICollection.js';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  try {
    const collectionService: CollectionService = new CollectionService();
    const collections: ICollection[] = await collectionService.getCollections('Metadata');

    res.status(200).json(collections);
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ error: error }); // Handle error appropriately
  }
});

router.post('/', async (req: Request, res: Response) => {
  const data: Record<string, string> = { ...req.body, uuid: crypto.randomUUID() };

  try {
    const collectionService: CollectionService = new CollectionService();
    const newCollection: ICollection | undefined = await collectionService.createNewCollection(
      data,
      'Metadata',
    );

    res.status(201).json(newCollection);
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ error: error }); // Handle error appropriately
  }
});

router.get('/:uuid', async (req: Request, res: Response) => {
  const uuid: string = req.params.uuid;

  try {
    const collectionService: CollectionService = new CollectionService();
    const collection: ICollection | undefined = await collectionService.getCollectionById(uuid);

    res.status(200).json(collection ?? {});
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ error: error }); // Handle error appropriately
  }
});

router.post('/:uuid', async (req: Request, res: Response) => {
  const uuid: string = req.params.uuid;
  const label: string = req.body.label;

  try {
    const collectionService: CollectionService = new CollectionService();
    const collection: ICollection | undefined = await collectionService.updateCollection(
      uuid,
      label,
    );

    res.status(200).json(collection ?? {});
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ error: error }); // Handle error appropriately
  }
});

router.delete('/:uuid', async (req: Request, res: Response) => {
  const uuid: string = req.params.uuid;

  try {
    const collectionService: CollectionService = new CollectionService();
    const collection: ICollection | undefined = await collectionService.deleteCollection(uuid);

    res.status(200).json(collection ?? {});
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ error: error }); // Handle error appropriately
  }
});

router.use('/:uuid/characters', characterRoutes);

export default router;

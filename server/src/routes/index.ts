import express, { Router } from 'express';
import collectionRoutes from './collections.routes.js';

const router: Router = express.Router();

router.use('/collections', collectionRoutes);

export default router;

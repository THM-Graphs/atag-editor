import express, { Router } from 'express';
import collectionRoutes from './collections.routes.js';
import guideLinesRoutes from './guidelines.routes.js';

const router: Router = express.Router();

router.use('/collections', collectionRoutes);
router.use('/guidelines', guideLinesRoutes);

export default router;

import express, { Router } from 'express';
import collectionRoutes from './collections.routes.js';
import guideLinesRoutes from './guidelines.routes.js';
import entityRoutes from './entities.routes.js';
import stylesRoutes from './styles.routes.js';
import textRoutes from './text.routes.js';

const router: Router = express.Router();

router.use('/collections', collectionRoutes);
router.use('/guidelines', guideLinesRoutes);
router.use('/entities', entityRoutes);
router.use('/styles', stylesRoutes);
router.use('/texts', textRoutes);

export default router;

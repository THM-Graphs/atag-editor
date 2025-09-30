import express, { Router } from 'express';
import collectionRoutes from './collections.routes.js';
import faviconRoutes from './favicon.routes.js';
import guideLinesRoutes from './guidelines.routes.js';
import entityRoutes from './entities.routes.js';
import stylesRoutes from './styles.routes.js';
import textRoutes from './text.routes.js';
import networkRoutes from './network.routes.js';

const router: Router = express.Router();

router.use('/collections', collectionRoutes);
router.use('/guidelines', guideLinesRoutes);
router.use('/entities', entityRoutes);
router.use('/styles', stylesRoutes);
router.use('/favicon', faviconRoutes);
router.use('/texts', textRoutes);
router.use('/network', networkRoutes);

export default router;

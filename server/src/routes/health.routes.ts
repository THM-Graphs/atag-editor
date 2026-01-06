import express, { NextFunction, Request, Response, Router } from 'express';
import Neo4jDriver from '../database/neo4j.js';

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Neo4jDriver.checkDatabaseConnection();

    res.json({ status: 'ok' });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

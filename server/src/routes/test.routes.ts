import express, { NextFunction, Request, Response, Router } from 'express';
import TestService from '../services/test.service.js';
import { toNativeTypes } from '../utils/helper.js';

const router: Router = express.Router();

const testService: TestService = new TestService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testNode: any = await testService.getTestNode();

    res.json({ normal: testNode, native: toNativeTypes(testNode) });
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;

  // res.status(201).json(data);
  // return;

  try {
    const newTestNode: any = await testService.saveTestNode(data);

    res.status(201).json(newTestNode);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;

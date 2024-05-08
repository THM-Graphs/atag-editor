import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import Neo4jDriver from './database/neo4j.js';

const app: Application = express();

app.use(cors());

// TODO: This route will be handled by the frontend container
app.get('/', (req: Request, res: Response) => {
  console.log('Hit on server');
  res.send('Hello');
});

app.get('/api', (req: Request, res: Response) => {
  console.log('Hit on API route');
  res.send('I will provide the data later');
});

Neo4jDriver.createDatabaseConnection();

app.listen(process.env.APP_PORT, () =>
  console.log(
    `Running an Express API server at http://localhost:${process.env.APP_PORT}/api`,
  ),
);

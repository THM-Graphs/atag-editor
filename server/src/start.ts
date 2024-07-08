import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import Neo4jDriver from './database/neo4j.js';
import routes from './routes/index.js';
import errorMiddleware from './middleware/error.middleware.js';

const app: Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', routes);

// Error handling
app.use(errorMiddleware);

// TODO: This route will be handled by the frontend container
app.get('/', (req: Request, res: Response) => {
  res.send('Hello');
});

Neo4jDriver.createDatabaseConnection();

app.listen(process.env.APP_PORT, (): void =>
  console.log(`Running an Express API server at http://localhost:${process.env.APP_PORT}/api`),
);

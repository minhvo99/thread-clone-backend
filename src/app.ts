import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import appRouter from './routes/index';

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(appRouter);

export default app;

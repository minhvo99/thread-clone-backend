import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import appRouter from './routes/index.ts';
import { errorMiddleware } from './middleware/error.middleware.ts';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'http://localhost:8080',
    ],
    credentials: true,
  }),
);
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many request from this IP, please try again in an hour!',
});
app.use(limiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', appRouter);

app.get('/', (_req, res) => {
  res.send('Hello, World!');
});

app.use(errorMiddleware);

export default app;

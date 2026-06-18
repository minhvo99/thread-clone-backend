import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

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


export default app;

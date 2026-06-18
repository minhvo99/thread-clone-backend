import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { appConfig } from './config/app.config';
import appRouter from './routes/index';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/logger.middleware';

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: appConfig.allowedOrigins || true,
    }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use(appRouter);
app.use(errorHandler);

export default app;

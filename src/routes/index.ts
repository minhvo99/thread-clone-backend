import { Router } from 'express';
import { buildAuthRouter } from './auth.routes';

const appRouter = Router();

appRouter.use('/auth', buildAuthRouter());

export default appRouter;

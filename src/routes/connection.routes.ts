import { Router } from 'express';
import { ConnectionController } from '../controllers/connection.controller.ts';
import { asyncHandler } from '../lib/async-handler.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { ConnectionRepository } from '../repositories/connection.repository.ts';
import { ConnectionService } from '../services/connection.service.ts';

const connectionRouter = Router();

const connectionRepo = new ConnectionRepository();
const connectionService = new ConnectionService(connectionRepo);
const connectionController = new ConnectionController(connectionService);

connectionRouter.post(
    '/',
    requireAuth,
    asyncHandler((req, res) =>
        connectionController.requestConnection(req, res),
    ),
);
connectionRouter.patch(
    '/:connectionId',
    requireAuth,
    asyncHandler((req, res) =>
        connectionController.reviewConnectionRequest(req, res),
    ),
);

export default connectionRouter;

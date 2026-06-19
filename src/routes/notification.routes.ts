import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.ts';
import { asyncHandler } from '../lib/async-handler.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { NotificationRepository } from '../repositories/notification.repository.ts';
import { NotificationService } from '../services/notification.service.ts';

const notificationRouter = Router();

const notificationRepo = new NotificationRepository();
const notificationService = new NotificationService(notificationRepo);
const notificationController = new NotificationController(notificationService);

notificationRouter.get(
    '/',
    requireAuth,
    asyncHandler((req, res) =>
        notificationController.findNotifications(req, res),
    ),
);
notificationRouter.patch(
    '/:notificationId/read',
    requireAuth,
    asyncHandler((req, res) => notificationController.markAsRead(req, res)),
);

export default notificationRouter;

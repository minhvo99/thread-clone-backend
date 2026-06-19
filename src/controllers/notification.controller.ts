import type { Request, Response } from 'express';
import { findNotificationsSchema } from '../dtos/notification.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { NotificationService } from '../services/notification.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    async findNotifications(req: Request, res: Response): Promise<void> {
        const input = findNotificationsSchema.parse(req.query);
        const feed = await this.notificationService.findNotifications(
            req.authUser!.id,
            input,
        );

        res.json({ success: true, data: feed });
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        const notification = await this.notificationService.markAsRead(
            req.authUser!.id,
            getRouteParam(req, 'notificationId'),
        );

        res.json({ success: true, data: { notification } });
    }
}

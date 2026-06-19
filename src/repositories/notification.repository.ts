import type { Notification, PrismaClient } from '../generated/prisma/client.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateNotificationData = {
    recipientId: string;
    actorId: string;
    type: string;
    entityType: string;
    entityId: string;
    data: object;
};

export type FindNotificationsParams = {
    recipientId: string;
    limit: number;
    cursor?: string;
};

export class NotificationRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findMany(params: FindNotificationsParams): Promise<Notification[]> {
        return this.db.notification.findMany({
            where: { recipientId: params.recipientId },
            orderBy: { createdAt: 'desc' },
            take: params.limit + 1,
            cursor: params.cursor ? { id: params.cursor } : undefined,
            skip: params.cursor ? 1 : 0,
        });
    }

    async markAsRead(
        notificationId: string,
        recipientId: string,
    ): Promise<Notification> {
        return this.db.notification.update({
            where: { id: notificationId, recipientId },
            data: { readAt: new Date() },
        });
    }

    async createMany(data: CreateNotificationData[]): Promise<Notification[]> {
        return Promise.all(
            data.map((notification) =>
                this.db.notification.create({ data: notification }),
            ),
        );
    }
}

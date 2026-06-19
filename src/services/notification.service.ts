import type { Notification } from '../generated/prisma/client.ts';
import type { FindNotificationsInput } from '../dtos/notification.dto.ts';
import { notFound } from '../lib/api-error.ts';
import type { NotificationRepository } from '../repositories/notification.repository.ts';

export type CursorPage<T> = {
    items: T[];
    nextCursor: string | null;
};

export class NotificationService {
    constructor(private readonly notificationRepo: NotificationRepository) {}

    async findNotifications(
        userId: string,
        input: FindNotificationsInput,
    ): Promise<CursorPage<Notification>> {
        const rows = await this.notificationRepo.findMany({
            recipientId: userId,
            limit: input.limit,
            cursor: input.cursor,
        });

        const hasNextPage = rows.length > input.limit;
        const items = hasNextPage ? rows.slice(0, input.limit) : rows;
        const nextCursor =
            hasNextPage ? (items[items.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }

    async markAsRead(
        userId: string,
        notificationId: string,
    ): Promise<Notification> {
        try {
            return await this.notificationRepo.markAsRead(
                notificationId,
                userId,
            );
        } catch {
            throw notFound('Notification not found');
        }
    }
}

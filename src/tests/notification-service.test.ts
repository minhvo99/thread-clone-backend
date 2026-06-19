import { describe, expect, it, vi } from 'vitest';
import type { NotificationRepository } from '../repositories/notification.repository.ts';
import { NotificationService } from '../services/notification.service.ts';

function notification() {
    return {
        id: 'notification_1',
        recipientId: 'user_1',
        actorId: 'actor_1',
        type: 'CHAT_MESSAGE',
        entityType: 'chat_message',
        entityId: 'message_1',
        data: { chatGroupId: 'chat_group_1' },
        readAt: null,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

function createService() {
    const notificationRepo = {
        findMany: vi.fn().mockResolvedValue([notification()]),
        markAsRead: vi.fn().mockResolvedValue({
            ...notification(),
            readAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
    } as unknown as NotificationRepository;

    return {
        notificationRepo,
        service: new NotificationService(notificationRepo),
    };
}

describe('NotificationService', () => {
    it('reads notifications for the authenticated user', async () => {
        const { service, notificationRepo } = createService();

        const result = await service.findNotifications('user_1', { limit: 20 });

        expect(notificationRepo.findMany).toHaveBeenCalledWith({
            recipientId: 'user_1',
            limit: 20,
            cursor: undefined,
        });
        expect(result.items).toHaveLength(1);
        expect(result.nextCursor).toBeNull();
    });

    it('marks a notification as read for the authenticated user', async () => {
        const { service, notificationRepo } = createService();

        const result = await service.markAsRead('user_1', 'notification_1');

        expect(notificationRepo.markAsRead).toHaveBeenCalledWith(
            'notification_1',
            'user_1',
        );
        expect(result.readAt).toBeInstanceOf(Date);
    });
});

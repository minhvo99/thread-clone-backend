import { describe, expect, it, vi } from 'vitest';
import type { RealtimePublisher } from '../realtime/realtime.types.ts';
import type { ChatGroupRepository } from '../repositories/chat-group.repository.ts';
import type { ChatMessageRepository } from '../repositories/chat-message.repository.ts';
import type { NotificationRepository } from '../repositories/notification.repository.ts';
import { ChatMessageService } from '../services/chat-message.service.ts';

function createService() {
    const chatGroupRepo = {
        findMember: vi.fn().mockResolvedValue({ id: 'member_1', leftAt: null }),
        listActiveMemberUserIds: vi
            .fn()
            .mockResolvedValue(['user_1', 'user_2']),
    };
    const chatMessageRepo = {
        findMany: vi.fn().mockResolvedValue([
            {
                id: 'message_1',
                chatGroupId: 'chat_group_1',
                senderId: 'user_1',
                content: 'Hello',
                messageType: 'TEXT',
                deletedAt: null,
                createdAt: new Date('2026-06-19T00:00:00.000Z'),
                updatedAt: new Date('2026-06-19T00:00:00.000Z'),
            },
        ]),
        create: vi.fn().mockResolvedValue({
            id: 'message_1',
            chatGroupId: 'chat_group_1',
            senderId: 'user_1',
            content: 'Hello',
            messageType: 'TEXT',
            deletedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
            updatedAt: new Date('2026-06-19T00:00:00.000Z'),
        }),
    };
    const notificationRepo = {
        createMany: vi
            .fn()
            .mockResolvedValue([
                { id: 'notification_1', recipientId: 'user_2' },
            ]),
    };
    const realtimePublisher = { publish: vi.fn() };

    return {
        chatGroupRepo,
        chatMessageRepo,
        notificationRepo,
        realtimePublisher,
        service: new ChatMessageService(
            chatGroupRepo as unknown as ChatGroupRepository,
            chatMessageRepo as unknown as ChatMessageRepository,
            notificationRepo as unknown as NotificationRepository,
            realtimePublisher as RealtimePublisher,
        ),
    };
}

describe('ChatMessageService', () => {
    it('creates a chat message and publishes realtime events', async () => {
        const {
            service,
            chatGroupRepo,
            chatMessageRepo,
            notificationRepo,
            realtimePublisher,
        } = createService();

        const message = await service.sendMessage('user_1', 'chat_group_1', {
            content: 'Hello',
        });

        expect(chatGroupRepo.findMember).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
        });
        expect(chatMessageRepo.create).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            senderId: 'user_1',
            content: 'Hello',
        });
        expect(notificationRepo.createMany).toHaveBeenCalledWith([
            {
                recipientId: 'user_2',
                actorId: 'user_1',
                type: 'CHAT_MESSAGE',
                entityType: 'chat_message',
                entityId: 'message_1',
                data: { chatGroupId: 'chat_group_1' },
            },
        ]);
        expect(realtimePublisher.publish).toHaveBeenCalledWith({
            type: 'chat.message.created',
            channel: 'chat_group:chat_group_1',
            data: { messageId: 'message_1', chatGroupId: 'chat_group_1' },
        });
        expect(realtimePublisher.publish).toHaveBeenCalledWith({
            type: 'notification.created',
            channel: 'user:user_2',
            data: { notificationId: 'notification_1' },
        });
        expect(message.id).toBe('message_1');
    });

    it('rejects sending a message when actor is not an active chat member', async () => {
        const { service, chatGroupRepo, chatMessageRepo } = createService();
        vi.mocked(chatGroupRepo.findMember).mockResolvedValue(null);

        await expect(
            service.sendMessage('user_1', 'chat_group_1', { content: 'Hello' }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(chatMessageRepo.create).not.toHaveBeenCalled();
    });

    it('returns chat messages for active members', async () => {
        const { service, chatMessageRepo } = createService();

        const result = await service.findMessages('user_1', 'chat_group_1', {
            limit: 20,
        });

        expect(chatMessageRepo.findMany).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            limit: 20,
            cursor: undefined,
        });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('message_1');
        expect(result.nextCursor).toBeNull();
    });

    it('rejects reading messages when actor is not an active chat member', async () => {
        const { service, chatGroupRepo } = createService();
        vi.mocked(chatGroupRepo.findMember).mockResolvedValue(null);

        await expect(
            service.findMessages('user_1', 'chat_group_1', { limit: 20 }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

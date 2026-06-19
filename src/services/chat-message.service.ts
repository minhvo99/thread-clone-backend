import type { ChatMessage } from '../generated/prisma/client.ts';
import type {
    FindChatMessagesInput,
    SendChatMessageInput,
} from '../dtos/chat-message.dto.ts';
import { forbidden } from '../lib/api-error.ts';
import type { RealtimePublisher } from '../realtime/realtime.types.ts';
import type { ChatGroupRepository } from '../repositories/chat-group.repository.ts';
import type { ChatMessageRepository } from '../repositories/chat-message.repository.ts';
import type { NotificationRepository } from '../repositories/notification.repository.ts';

export type CursorPage<T> = {
    items: T[];
    nextCursor: string | null;
};

export class ChatMessageService {
    constructor(
        private readonly chatGroupRepo: ChatGroupRepository,
        private readonly chatMessageRepo: ChatMessageRepository,
        private readonly notificationRepo: NotificationRepository,
        private readonly realtimePublisher: RealtimePublisher,
    ) {}

    async sendMessage(
        actorId: string,
        chatGroupId: string,
        input: SendChatMessageInput,
    ): Promise<ChatMessage> {
        const member = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId: actorId,
        });

        if (!member || member.leftAt) {
            throw forbidden('Missing chat group membership');
        }

        const message = await this.chatMessageRepo.create({
            chatGroupId,
            senderId: actorId,
            content: input.content,
        });
        const recipientIds = (
            await this.chatGroupRepo.listActiveMemberUserIds(chatGroupId)
        ).filter((userId) => userId !== actorId);
        const notifications = await this.notificationRepo.createMany(
            recipientIds.map((recipientId) => ({
                recipientId,
                actorId,
                type: 'CHAT_MESSAGE',
                entityType: 'chat_message',
                entityId: message.id,
                data: { chatGroupId },
            })),
        );

        this.realtimePublisher.publish({
            type: 'chat.message.created',
            channel: `chat_group:${chatGroupId}`,
            data: { messageId: message.id, chatGroupId },
        });

        for (const notification of notifications) {
            this.realtimePublisher.publish({
                type: 'notification.created',
                channel: `user:${notification.recipientId}`,
                data: { notificationId: notification.id },
            });
        }

        return message;
    }

    async findMessages(
        userId: string,
        chatGroupId: string,
        input: FindChatMessagesInput,
    ): Promise<CursorPage<ChatMessage>> {
        const member = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId,
        });

        if (!member || member.leftAt) {
            throw forbidden('Missing chat group membership');
        }

        const rows = await this.chatMessageRepo.findMany({
            chatGroupId,
            limit: input.limit,
            cursor: input.cursor,
        });

        const hasNextPage = rows.length > input.limit;
        const items = hasNextPage ? rows.slice(0, input.limit) : rows;
        const nextCursor =
            hasNextPage ? (items[items.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }
}

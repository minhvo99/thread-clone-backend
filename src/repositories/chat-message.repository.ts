import type { ChatMessage, PrismaClient } from '../generated/prisma/client.ts';
import { ChatMessageType } from '../generated/prisma/enums.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateChatMessageData = {
    chatGroupId: string;
    senderId: string;
    content: string;
};

export type FindChatMessagesParams = {
    chatGroupId: string;
    limit: number;
    cursor?: string;
};

export class ChatMessageRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findMany(params: FindChatMessagesParams): Promise<ChatMessage[]> {
        return this.db.chatMessage.findMany({
            where: { chatGroupId: params.chatGroupId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: params.limit + 1,
            cursor: params.cursor ? { id: params.cursor } : undefined,
            skip: params.cursor ? 1 : 0,
        });
    }

    async create(data: CreateChatMessageData): Promise<ChatMessage> {
        return this.db.chatMessage.create({
            data: {
                chatGroupId: data.chatGroupId,
                senderId: data.senderId,
                content: data.content,
                messageType: ChatMessageType.TEXT,
            },
        });
    }
}

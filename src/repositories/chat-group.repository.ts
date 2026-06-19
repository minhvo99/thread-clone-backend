import type {
    ChatGroup,
    ChatGroupInvite,
    ChatGroupMember,
    Prisma,
    PrismaClient,
} from '../generated/prisma/client.ts';
import { ChatMemberRole } from '../generated/prisma/enums.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateChatGroupWithOwnerData = {
    ownerId: string;
    name: string;
};

export type CreateChatGroupResult = {
    chatGroup: ChatGroup;
    membership: ChatGroupMember;
};

export type FindChatGroupMemberParams = {
    chatGroupId: string;
    userId: string;
};

export type CreateChatGroupInviteData = {
    chatGroupId: string;
    createdById: string;
    inviteeId: string;
};

export type CreateInviteLinkData = {
    chatGroupId: string;
    createdById: string;
    tokenHash: string;
    expiresAt: Date;
};

export type FindValidInviteParams = {
    chatGroupId: string;
    tokenHash: string;
};

export type CreateChatGroupMemberData = {
    chatGroupId: string;
    userId: string;
    role: ChatMemberRole;
};

export class ChatGroupRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async createMember(
        data: CreateChatGroupMemberData,
    ): Promise<ChatGroupMember> {
        return this.db.chatGroupMember.create({
            data: {
                chatGroupId: data.chatGroupId,
                userId: data.userId,
                role: data.role,
            },
        });
    }

    async findMember(
        params: FindChatGroupMemberParams,
    ): Promise<ChatGroupMember | null> {
        return this.db.chatGroupMember.findUnique({
            where: {
                chatGroupId_userId: {
                    chatGroupId: params.chatGroupId,
                    userId: params.userId,
                },
            },
        });
    }

    async createInvite(
        data: CreateChatGroupInviteData,
    ): Promise<ChatGroupInvite> {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return this.db.chatGroupInvite.create({
            data: {
                chatGroupId: data.chatGroupId,
                createdById: data.createdById,
                inviteeId: data.inviteeId,
                expiresAt,
            },
        });
    }

    async listActiveMemberUserIds(chatGroupId: string): Promise<string[]> {
        const members = await this.db.chatGroupMember.findMany({
            where: { chatGroupId, leftAt: null },
            select: { userId: true },
        });

        return members.map((member) => member.userId);
    }

    async createInviteLink(
        data: CreateInviteLinkData,
    ): Promise<ChatGroupInvite> {
        return this.db.chatGroupInvite.create({
            data: {
                chatGroupId: data.chatGroupId,
                createdById: data.createdById,
                tokenHash: data.tokenHash,
                expiresAt: data.expiresAt,
            },
        });
    }

    async findValidInvite(
        params: FindValidInviteParams,
    ): Promise<ChatGroupInvite | null> {
        return this.db.chatGroupInvite.findFirst({
            where: {
                chatGroupId: params.chatGroupId,
                tokenHash: params.tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    async createWithOwner(
        data: CreateChatGroupWithOwnerData,
    ): Promise<CreateChatGroupResult> {
        return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
            const chatGroup = await tx.chatGroup.create({
                data: {
                    ownerId: data.ownerId,
                    name: data.name,
                },
            });
            const membership = await tx.chatGroupMember.create({
                data: {
                    chatGroupId: chatGroup.id,
                    userId: data.ownerId,
                    role: ChatMemberRole.OWNER,
                },
            });

            return { chatGroup, membership };
        });
    }
}

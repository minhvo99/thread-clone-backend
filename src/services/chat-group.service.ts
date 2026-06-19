import type {
    ChatGroup,
    ChatGroupInvite,
    ChatGroupMember,
} from '../generated/prisma/client.ts';
import { ChatMemberRole } from '../generated/prisma/enums.ts';
import type {
    CreateChatGroupInput,
    InviteChatMemberInput,
    JoinByInviteInput,
} from '../dtos/chat-group.dto.ts';
import { conflict, forbidden, notFound } from '../lib/api-error.ts';
import { hashToken } from '../lib/crypto.ts';
import type { ChatGroupRepository } from '../repositories/chat-group.repository.ts';

export type CreateChatGroupResult = {
    chatGroup: ChatGroup;
    membership: ChatGroupMember;
};

export class ChatGroupService {
    constructor(private readonly chatGroupRepo: ChatGroupRepository) {}

    async createChatGroup(
        ownerId: string,
        input: CreateChatGroupInput,
    ): Promise<CreateChatGroupResult> {
        return this.chatGroupRepo.createWithOwner({
            ownerId,
            name: input.name,
        });
    }

    async inviteMember(
        actorId: string,
        chatGroupId: string,
        input: InviteChatMemberInput,
    ): Promise<ChatGroupInvite> {
        const member = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId: actorId,
        });

        if (!member || member.role !== ChatMemberRole.OWNER || member.leftAt) {
            throw forbidden('Only chat group owner can invite members');
        }

        return this.chatGroupRepo.createInvite({
            chatGroupId,
            createdById: actorId,
            inviteeId: input.inviteeId,
        });
    }

    async createInviteLink(
        actorId: string,
        chatGroupId: string,
    ): Promise<{ invite: ChatGroupInvite; rawToken: string }> {
        const member = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId: actorId,
        });

        if (!member || member.role !== ChatMemberRole.OWNER || member.leftAt) {
            throw forbidden('Only chat group owner can create invite links');
        }

        const rawToken = crypto.randomUUID().replace(/-/g, '');
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await this.chatGroupRepo.createInviteLink({
            chatGroupId,
            createdById: actorId,
            tokenHash,
            expiresAt,
        });

        return { invite, rawToken };
    }

    async joinByInvite(
        actorId: string,
        chatGroupId: string,
        input: JoinByInviteInput,
    ): Promise<ChatGroupMember> {
        const invite = await this.chatGroupRepo.findValidInvite({
            chatGroupId,
            tokenHash: hashToken(input.token),
        });

        if (!invite) {
            throw notFound('Invalid or expired invite');
        }

        const existing = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId: actorId,
        });

        if (existing && existing.leftAt) {
            return this.chatGroupRepo.createMember({
                chatGroupId,
                userId: actorId,
                role: ChatMemberRole.MEMBER,
            });
        }

        if (existing) {
            throw conflict('Already a member of this chat group');
        }

        return this.chatGroupRepo.createMember({
            chatGroupId,
            userId: actorId,
            role: ChatMemberRole.MEMBER,
        });
    }
}

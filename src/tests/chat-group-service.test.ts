import { describe, expect, it, vi } from 'vitest';
import type { ChatGroupRepository } from '../repositories/chat-group.repository.ts';
import { ChatGroupService } from '../services/chat-group.service.ts';

function createResult() {
    return {
        chatGroup: {
            id: 'chat_group_1',
            ownerId: 'user_1',
            name: 'Friends',
            avatarUrl: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
            updatedAt: new Date('2026-06-19T00:00:00.000Z'),
        },
        membership: {
            id: 'member_1',
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
            role: 'OWNER',
            joinedAt: new Date('2026-06-19T00:00:00.000Z'),
            leftAt: null,
        },
    };
}

function createService() {
    const chatGroupRepo = {
        createWithOwner: vi.fn().mockResolvedValue(createResult()),
        findMember: vi.fn().mockResolvedValue({
            id: 'member_1',
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
            role: 'OWNER',
            joinedAt: new Date('2026-06-19T00:00:00.000Z'),
            leftAt: null,
        }),
        createInvite: vi.fn().mockResolvedValue({
            id: 'invite_1',
            chatGroupId: 'chat_group_1',
            createdById: 'user_1',
            inviteeId: 'user_2',
            tokenHash: null,
            expiresAt: new Date('2026-06-26T00:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
        }),
    } as unknown as ChatGroupRepository;

    return {
        chatGroupRepo,
        service: new ChatGroupService(chatGroupRepo),
    };
}

describe('ChatGroupService', () => {
    it('creates a chat group with owner membership', async () => {
        const { service, chatGroupRepo } = createService();

        const result = await service.createChatGroup('user_1', {
            name: 'Friends',
        });

        expect(chatGroupRepo.createWithOwner).toHaveBeenCalledWith({
            ownerId: 'user_1',
            name: 'Friends',
        });
        expect(result.chatGroup.name).toBe('Friends');
        expect(result.membership.role).toBe('OWNER');
    });

    it('allows the chat owner to invite a user', async () => {
        const { service, chatGroupRepo } = createService();

        const invite = await service.inviteMember('user_1', 'chat_group_1', {
            inviteeId: 'user_2',
        });

        expect(chatGroupRepo.findMember).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
        });
        expect(chatGroupRepo.createInvite).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            createdById: 'user_1',
            inviteeId: 'user_2',
        });
        expect(invite.inviteeId).toBe('user_2');
    });

    it('rejects invites from non-owner chat members', async () => {
        const { service, chatGroupRepo } = createService();
        vi.mocked(chatGroupRepo.findMember).mockResolvedValue({
            id: 'member_1',
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
            role: 'MEMBER',
            joinedAt: new Date('2026-06-19T00:00:00.000Z'),
            leftAt: null,
        });

        await expect(
            service.inviteMember('user_1', 'chat_group_1', {
                inviteeId: 'user_2',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(chatGroupRepo.createInvite).not.toHaveBeenCalled();
    });

    it('creates an invite link for the chat owner', async () => {
        const { service, chatGroupRepo } = createService();
        const createInviteLink = vi.fn().mockResolvedValue({
            id: 'invite_link_1',
            chatGroupId: 'chat_group_1',
            createdById: 'user_1',
            tokenHash: 'hash_abc',
            expiresAt: new Date('2026-06-26T00:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
        });
        vi.mocked(chatGroupRepo).createInviteLink = createInviteLink;

        const result = await service.createInviteLink('user_1', 'chat_group_1');

        expect(chatGroupRepo.findMember).toHaveBeenCalledWith({
            chatGroupId: 'chat_group_1',
            userId: 'user_1',
        });
        expect(createInviteLink).toHaveBeenCalled();
        expect(result.invite.id).toBe('invite_link_1');
        expect(typeof result.rawToken).toBe('string');
        expect(result.rawToken.length).toBeGreaterThan(0);
    });

    it('allows joining by valid invite token', async () => {
        const { service, chatGroupRepo } = createService();
        const findValidInvite = vi.fn().mockResolvedValue({
            id: 'invite_link_1',
            chatGroupId: 'chat_group_1',
            createdById: 'user_1',
            tokenHash: 'hash_abc',
            expiresAt: new Date('2026-06-26T00:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
        });
        vi.mocked(chatGroupRepo).findValidInvite = findValidInvite;
        vi.mocked(chatGroupRepo.findMember).mockResolvedValue(null);
        const createMember = vi.fn().mockResolvedValue({
            id: 'member_2',
            chatGroupId: 'chat_group_1',
            userId: 'user_2',
            role: 'MEMBER',
            joinedAt: new Date('2026-06-19T00:00:00.000Z'),
            leftAt: null,
        });
        vi.mocked(chatGroupRepo).createMember = createMember;

        const result = await service.joinByInvite('user_2', 'chat_group_1', {
            token: 'abc123',
        });

        expect(findValidInvite).toHaveBeenCalled();
        expect(createMember).toHaveBeenCalled();
        expect(result.userId).toBe('user_2');
    });
});

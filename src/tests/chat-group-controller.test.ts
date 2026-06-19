import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ChatGroupController } from '../controllers/chat-group.controller.ts';
import type { ChatGroupService } from '../services/chat-group.service.ts';

function createResponse() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
}

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

describe('ChatGroupController', () => {
    it('creates a chat group for the authenticated owner', async () => {
        const result = createResult();
        const service = {
            createChatGroup: vi.fn().mockResolvedValue(result),
        } as unknown as ChatGroupService;
        const controller = new ChatGroupController(service);
        const req = {
            authUser: { id: 'user_1', role: 'USER' },
            body: { name: 'Friends' },
        } as unknown as Request;
        const res = createResponse();

        await controller.createChatGroup(req, res);

        expect(service.createChatGroup).toHaveBeenCalledWith('user_1', {
            name: 'Friends',
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: result,
        });
    });

    it('invites a chat member for the authenticated owner', async () => {
        const invite = {
            id: 'invite_1',
            chatGroupId: 'chat_group_1',
            createdById: 'user_1',
            inviteeId: 'user_2',
            tokenHash: null,
            expiresAt: new Date('2026-06-26T00:00:00.000Z'),
            usedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
        };
        const service = {
            inviteMember: vi.fn().mockResolvedValue(invite),
        } as unknown as ChatGroupService;
        const controller = new ChatGroupController(service);
        const req = {
            authUser: { id: 'user_1', role: 'USER' },
            params: { chatGroupId: 'chat_group_1' },
            body: { inviteeId: 'user_2' },
        } as unknown as Request;
        const res = createResponse();

        await controller.inviteMember(req, res);

        expect(service.inviteMember).toHaveBeenCalledWith(
            'user_1',
            'chat_group_1',
            { inviteeId: 'user_2' },
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { invite },
        });
    });
});

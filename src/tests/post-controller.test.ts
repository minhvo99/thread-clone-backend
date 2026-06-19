import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { PostController } from '../controllers/post.controller.ts';
import type { PostService } from '../services/post.service.ts';

function createResponse() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
}

function post() {
    return {
        id: 'post_1',
        authorId: 'user_1',
        content: 'hello',
        imageUrl: null,
        publishedAt: null,
        communityGroupId: null,
        globalTopicId: null,
        groupTopicId: null,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

describe('PostController', () => {
    it('creates a global post from the authenticated user', async () => {
        const service = {
            createGlobalPost: vi.fn().mockResolvedValue(post()),
        } as unknown as PostService;
        const controller = new PostController(service);
        const req = {
            authUser: { id: 'user_1', role: 'USER' },
            body: { content: 'hello' },
        } as unknown as Request;
        const res = createResponse();

        await controller.createGlobalPost(req, res);

        expect(service.createGlobalPost).toHaveBeenCalledWith('user_1', {
            content: 'hello',
            globalTopicId: undefined,
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { post: post() },
        });
    });

    it('reads the authenticated user feed', async () => {
        const service = {
            findGlobalFeed: vi
                .fn()
                .mockResolvedValue({ items: [post()], nextCursor: null }),
        } as unknown as PostService;
        const controller = new PostController(service);
        const req = {
            authUser: { id: 'user_1', role: 'USER' },
            query: { limit: '10' },
        } as unknown as Request;
        const res = createResponse();

        await controller.findGlobalFeed(req, res);

        expect(service.findGlobalFeed).toHaveBeenCalledWith('user_1', {
            limit: 10,
            cursor: undefined,
            globalTopicId: undefined,
        });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { items: [post()], nextCursor: null },
        });
    });

    describe('Group Posts Endpoints', () => {
        it('creates a group post', async () => {
            const groupPost = {
                ...post(),
                communityGroupId: 'group_1',
                content: 'group content',
            };
            const service = {
                createGroupPost: vi.fn().mockResolvedValue(groupPost),
            } as unknown as PostService;
            const controller = new PostController(service);
            const req = {
                authUser: { id: 'user_1', role: 'USER' },
                params: { groupId: 'group_1' },
                body: { content: 'group content' },
            } as unknown as Request;
            const res = createResponse();

            await controller.createGroupPost(req, res);

            expect(service.createGroupPost).toHaveBeenCalledWith(
                'user_1',
                'group_1',
                { content: 'group content', groupTopicId: undefined },
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { post: groupPost },
            });
        });

        it('reads group posts', async () => {
            const groupPost = { ...post(), communityGroupId: 'group_1' };
            const service = {
                findGroupPosts: vi.fn().mockResolvedValue({
                    items: [groupPost],
                    nextCursor: null,
                }),
            } as unknown as PostService;
            const controller = new PostController(service);
            const req = {
                authUser: { id: 'user_1', role: 'USER' },
                params: { groupId: 'group_1' },
                query: { limit: '15' },
            } as unknown as Request;
            const res = createResponse();

            await controller.findGroupPosts(req, res);

            expect(service.findGroupPosts).toHaveBeenCalledWith(
                'user_1',
                'group_1',
                { limit: 15, cursor: undefined },
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { items: [groupPost], nextCursor: null },
            });
        });
    });

    describe('Post Comments and Reactions Endpoints', () => {
        it('creates a post comment', async () => {
            const comment = {
                id: 'comment_1',
                postId: 'post_1',
                authorId: 'user_1',
                content: 'Nice post',
                createdAt: new Date('2026-06-19T00:00:00.000Z'),
                updatedAt: new Date('2026-06-19T00:00:00.000Z'),
            };
            const service = {
                createComment: vi.fn().mockResolvedValue(comment),
            } as unknown as PostService;
            const controller = new PostController(service);
            const req = {
                authUser: { id: 'user_1', role: 'USER' },
                params: { postId: 'post_1' },
                body: { content: 'Nice post' },
            } as unknown as Request;
            const res = createResponse();

            await controller.createComment(req, res);

            expect(service.createComment).toHaveBeenCalledWith(
                'user_1',
                'post_1',
                { content: 'Nice post' },
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { comment },
            });
        });

        it('creates or updates a post reaction', async () => {
            const reaction = {
                id: 'reaction_1',
                userId: 'user_1',
                targetType: 'POST',
                targetId: 'post_1',
                type: 'LOVE',
                createdAt: new Date('2026-06-19T00:00:00.000Z'),
                updatedAt: new Date('2026-06-19T00:00:00.000Z'),
            };
            const service = {
                upsertReaction: vi.fn().mockResolvedValue(reaction),
            } as unknown as PostService;
            const controller = new PostController(service);
            const req = {
                authUser: { id: 'user_1', role: 'USER' },
                params: { postId: 'post_1' },
                body: { type: 'LOVE' },
            } as unknown as Request;
            const res = createResponse();

            await controller.upsertReaction(req, res);

            expect(service.upsertReaction).toHaveBeenCalledWith(
                'user_1',
                'post_1',
                { type: 'LOVE' },
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { reaction },
            });
        });
    });
});

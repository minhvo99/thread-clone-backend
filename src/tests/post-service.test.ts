import { describe, expect, it, vi } from 'vitest';
import type { ConnectionService } from '../services/connection.service.ts';
import type { PostRepository } from '../repositories/post.repository.ts';
import type { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import type { PermissionService } from '../services/permission.service.ts';
import { PostService } from '../services/post.service.ts';
import { GroupVisibility } from '../generated/prisma/enums.ts';

function post(params: {
    id?: string;
    authorId: string;
    content?: string;
    communityGroupId?: string | null;
    groupTopicId?: string | null;
}) {
    return {
        id: params.id ?? 'post_1',
        authorId: params.authorId,
        content: params.content ?? 'hello',
        imageUrl: null,
        publishedAt: null,
        communityGroupId: params.communityGroupId ?? null,
        globalTopicId: null,
        groupTopicId: params.groupTopicId ?? null,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

function createService() {
    const postRepo = {
        createGlobalPost: vi
            .fn()
            .mockImplementation(async (data) =>
                post({ authorId: data.authorId, content: data.content }),
            ),
        createGroupPost: vi.fn().mockImplementation(async (data) =>
            post({
                authorId: data.authorId,
                content: data.content,
                communityGroupId: data.communityGroupId,
                groupTopicId: data.groupTopicId,
            }),
        ),
        findGlobalFeedByAuthorIds: vi
            .fn()
            .mockResolvedValue([
                post({ id: 'post_2', authorId: 'friend_1' }),
                post({ id: 'post_3', authorId: 'friend_2' }),
            ]),
        findGroupPosts: vi.fn().mockResolvedValue([
            post({
                id: 'post_group_1',
                authorId: 'member_1',
                communityGroupId: 'group_1',
            }),
        ]),
        findById: vi
            .fn()
            .mockResolvedValue(post({ id: 'post_1', authorId: 'author_1' })),
        createComment: vi.fn().mockImplementation(async (data) => ({
            id: 'comment_1',
            postId: data.postId,
            authorId: data.authorId,
            content: data.content,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
            updatedAt: new Date('2026-06-19T00:00:00.000Z'),
        })),
        upsertReaction: vi.fn().mockImplementation(async (data) => ({
            id: 'reaction_1',
            userId: data.userId,
            targetType: data.targetType,
            targetId: data.targetId,
            type: data.type,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
            updatedAt: new Date('2026-06-19T00:00:00.000Z'),
        })),
        globalTopicExists: vi.fn().mockResolvedValue(true),
        groupTopicBelongsToGroup: vi.fn().mockResolvedValue(true),
    } as unknown as PostRepository;

    const connectionService = {
        listAcceptedConnectionUserIds: vi
            .fn()
            .mockResolvedValue(['friend_1', 'friend_2']),
    } as unknown as ConnectionService;

    const groupRepo = {
        findById: vi.fn().mockResolvedValue({
            id: 'group_1',
            ownerId: 'owner_1',
            name: 'Group 1',
            slug: 'group-1',
            visibility: GroupVisibility.PUBLIC,
        }),
        findMember: vi.fn().mockResolvedValue({
            id: 'membership_1',
            groupId: 'group_1',
            userId: 'user_1',
            status: 'ACTIVE',
        }),
    } as unknown as CommunityGroupRepository;

    const permissionService = {
        can: vi.fn().mockResolvedValue({ allowed: true }),
    } as unknown as PermissionService;
    const realtimePublisher = {
        publish: vi.fn(),
    };

    return {
        postRepo,
        connectionService,
        groupRepo,
        permissionService,
        realtimePublisher,
        service: new PostService(
            postRepo,
            connectionService,
            groupRepo,
            permissionService,
            realtimePublisher,
        ),
    };
}

describe('PostService', () => {
    it('creates a global post for an authenticated user', async () => {
        const { service, postRepo } = createService();

        const result = await service.createGlobalPost('user_1', {
            content: 'My first post',
        });

        expect(result.authorId).toBe('user_1');
        expect(result.content).toBe('My first post');
        expect(postRepo.createGlobalPost).toHaveBeenCalledWith({
            authorId: 'user_1',
            content: 'My first post',
            globalTopicId: undefined,
        });
    });

    it('rejects a global post when the global topic does not exist', async () => {
        const { service, postRepo } = createService();
        vi.mocked(postRepo.globalTopicExists).mockResolvedValue(false);

        await expect(
            service.createGlobalPost('user_1', {
                content: 'Topic post',
                globalTopicId: 'topic_1',
            }),
        ).rejects.toMatchObject({ statusCode: 422 });
        expect(postRepo.createGlobalPost).not.toHaveBeenCalled();
    });

    it('reads global feed from accepted connections only', async () => {
        const { service, postRepo, connectionService } = createService();

        const result = await service.findGlobalFeed('user_1', { limit: 20 });

        expect(
            connectionService.listAcceptedConnectionUserIds,
        ).toHaveBeenCalledWith('user_1');
        expect(postRepo.findGlobalFeedByAuthorIds).toHaveBeenCalledWith({
            authorIds: ['friend_1', 'friend_2'],
            limit: 20,
            cursor: undefined,
            globalTopicId: undefined,
        });
        expect(result.items).toHaveLength(2);
        expect(result.nextCursor).toBeNull();
    });

    it('returns an empty feed when the user has no accepted connections', async () => {
        const { service, postRepo, connectionService } = createService();
        vi.mocked(
            connectionService.listAcceptedConnectionUserIds,
        ).mockResolvedValue([]);

        const result = await service.findGlobalFeed('user_1', { limit: 20 });

        expect(postRepo.findGlobalFeedByAuthorIds).not.toHaveBeenCalled();
        expect(result).toEqual({ items: [], nextCursor: null });
    });

    describe('Group Posts', () => {
        it('creates a group post when actor has permission', async () => {
            const { service, postRepo, permissionService } = createService();

            const result = await service.createGroupPost('user_1', 'group_1', {
                content: 'Hello group',
            });

            expect(permissionService.can).toHaveBeenCalledWith(
                'user_1',
                'group.post.create',
                { resourceType: 'community_group', resourceId: 'group_1' },
            );
            expect(postRepo.createGroupPost).toHaveBeenCalledWith({
                authorId: 'user_1',
                communityGroupId: 'group_1',
                content: 'Hello group',
                groupTopicId: undefined,
            });
            expect(result.content).toBe('Hello group');
            expect(result.communityGroupId).toBe('group_1');
        });

        it('rejects group post creation if actor lacks permission', async () => {
            const { service, postRepo, permissionService } = createService();
            vi.mocked(permissionService.can).mockResolvedValue({
                allowed: false,
                reason: 'MISSING_PERMISSION',
            });

            await expect(
                service.createGroupPost('user_1', 'group_1', {
                    content: 'No permission',
                }),
            ).rejects.toMatchObject({ statusCode: 403 });
            expect(postRepo.createGroupPost).not.toHaveBeenCalled();
        });

        it('rejects group post creation if topic belongs to another group', async () => {
            const { service, postRepo } = createService();
            vi.mocked(postRepo.groupTopicBelongsToGroup).mockResolvedValue(
                false,
            );

            await expect(
                service.createGroupPost('user_1', 'group_1', {
                    content: 'Bad topic',
                    groupTopicId: 'topic_2',
                }),
            ).rejects.toMatchObject({ statusCode: 422 });
            expect(postRepo.createGroupPost).not.toHaveBeenCalled();
        });

        it('allows reading posts in a public group', async () => {
            const { service, postRepo, groupRepo } = createService();

            const result = await service.findGroupPosts('user_1', 'group_1', {
                limit: 10,
            });

            expect(groupRepo.findById).toHaveBeenCalledWith('group_1');
            expect(postRepo.findGroupPosts).toHaveBeenCalledWith({
                communityGroupId: 'group_1',
                limit: 10,
                cursor: undefined,
            });
            expect(result.items).toHaveLength(1);
        });

        it('allows reading posts in a private group if user is active member', async () => {
            const { service, groupRepo } = createService();
            vi.mocked(groupRepo.findById).mockResolvedValue({
                id: 'group_1',
                ownerId: 'owner_1',
                name: 'Group 1',
                slug: 'group-1',
                description: null,
                visibility: GroupVisibility.PRIVATE,
                avatarUrl: null,
                coverUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await service.findGroupPosts('user_1', 'group_1', {
                limit: 10,
            });

            expect(groupRepo.findMember).toHaveBeenCalledWith({
                groupId: 'group_1',
                userId: 'user_1',
            });
            expect(result.items).toHaveLength(1);
        });

        it('rejects reading posts in private group if user is not active member', async () => {
            const { service, groupRepo } = createService();
            vi.mocked(groupRepo.findById).mockResolvedValue({
                id: 'group_1',
                ownerId: 'owner_1',
                name: 'Group 1',
                slug: 'group-1',
                description: null,
                visibility: GroupVisibility.PRIVATE,
                avatarUrl: null,
                coverUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            vi.mocked(groupRepo.findMember).mockResolvedValue(null);

            await expect(
                service.findGroupPosts('user_1', 'group_1', { limit: 10 }),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('Post Comments and Reactions', () => {
        it('creates a comment on a global post for an authenticated user', async () => {
            const { service, postRepo } = createService();

            const result = await service.createComment('user_1', 'post_1', {
                content: 'Nice post',
            });

            expect(postRepo.findById).toHaveBeenCalledWith('post_1');
            expect(postRepo.createComment).toHaveBeenCalledWith({
                postId: 'post_1',
                authorId: 'user_1',
                content: 'Nice post',
            });
            expect(result.content).toBe('Nice post');
        });

        it('publishes realtime event after creating a comment', async () => {
            const { service, realtimePublisher } = createService();

            await service.createComment('user_1', 'post_1', {
                content: 'Nice post',
            });

            expect(realtimePublisher.publish).toHaveBeenCalledWith({
                type: 'post.comment.created',
                channel: 'post:post_1',
                data: { commentId: 'comment_1', postId: 'post_1' },
            });
        });

        it('requires group comment permission for group posts', async () => {
            const { service, postRepo, permissionService } = createService();
            vi.mocked(postRepo.findById).mockResolvedValue(
                post({
                    id: 'post_group_1',
                    authorId: 'member_1',
                    communityGroupId: 'group_1',
                }),
            );

            await service.createComment('user_1', 'post_group_1', {
                content: 'Group comment',
            });

            expect(permissionService.can).toHaveBeenCalledWith(
                'user_1',
                'group.comment.create',
                { resourceType: 'community_group', resourceId: 'group_1' },
            );
        });

        it('rejects a group post comment if actor lacks permission', async () => {
            const { service, postRepo, permissionService } = createService();
            vi.mocked(postRepo.findById).mockResolvedValue(
                post({
                    id: 'post_group_1',
                    authorId: 'member_1',
                    communityGroupId: 'group_1',
                }),
            );
            vi.mocked(permissionService.can).mockResolvedValue({
                allowed: false,
                reason: 'MISSING_PERMISSION',
            });

            await expect(
                service.createComment('user_1', 'post_group_1', {
                    content: 'No permission',
                }),
            ).rejects.toMatchObject({ statusCode: 403 });
            expect(postRepo.createComment).not.toHaveBeenCalled();
        });

        it('creates a reaction on a global post for an authenticated user', async () => {
            const { service, postRepo } = createService();

            const result = await service.upsertReaction('user_1', 'post_1', {
                type: 'LOVE',
            });

            expect(postRepo.upsertReaction).toHaveBeenCalledWith({
                userId: 'user_1',
                targetType: 'POST',
                targetId: 'post_1',
                type: 'LOVE',
            });
            expect(result.type).toBe('LOVE');
        });

        it('publishes realtime event after upserting a reaction', async () => {
            const { service, realtimePublisher } = createService();

            await service.upsertReaction('user_1', 'post_1', {
                type: 'LOVE',
            });

            expect(realtimePublisher.publish).toHaveBeenCalledWith({
                type: 'post.reaction.upserted',
                channel: 'post:post_1',
                data: { reactionId: 'reaction_1', postId: 'post_1' },
            });
        });

        it('requires group reaction permission for group posts', async () => {
            const { service, postRepo, permissionService } = createService();
            vi.mocked(postRepo.findById).mockResolvedValue(
                post({
                    id: 'post_group_1',
                    authorId: 'member_1',
                    communityGroupId: 'group_1',
                }),
            );

            await service.upsertReaction('user_1', 'post_group_1', {
                type: 'LIKE',
            });

            expect(permissionService.can).toHaveBeenCalledWith(
                'user_1',
                'group.reaction.create',
                { resourceType: 'community_group', resourceId: 'group_1' },
            );
        });

        it('rejects comment creation when post does not exist', async () => {
            const { service, postRepo } = createService();
            vi.mocked(postRepo.findById).mockResolvedValue(null);

            await expect(
                service.createComment('user_1', 'missing_post', {
                    content: 'Missing',
                }),
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});

import type { Comment, Post, Reaction } from '../generated/prisma/client.ts';
import {
    GroupMemberStatus,
    GroupVisibility,
    ReactionTargetType,
    type ReactionType,
} from '../generated/prisma/enums.ts';
import { forbidden, notFound, unprocessable } from '../lib/api-error.ts';
import { GroupPermissionKey } from '../models/permission.model.ts';
import type { RealtimePublisher } from '../realtime/realtime.types.ts';
import type { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import type { PostRepository } from '../repositories/post.repository.ts';
import type { ConnectionService } from './connection.service.ts';
import type { PermissionService } from './permission.service.ts';

export type CreateGlobalPostInput = {
    content: string;
    globalTopicId?: string;
};

export type FindGlobalFeedInput = {
    limit: number;
    cursor?: string;
    globalTopicId?: string;
};

export type CursorPage<T> = {
    items: T[];
    nextCursor: string | null;
};

export type CreateGroupPostInput = {
    content: string;
    groupTopicId?: string;
};

export type FindGroupPostsInput = {
    limit: number;
    cursor?: string;
};

export type CreateCommentInput = {
    content: string;
};

export type UpsertReactionInput = {
    type: ReactionType;
};

export class PostService {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly connectionService: ConnectionService,
        private readonly groupRepo: CommunityGroupRepository,
        private readonly permissionService: PermissionService,
        private readonly realtimePublisher: RealtimePublisher,
    ) {}

    async createComment(
        actorId: string,
        postId: string,
        input: CreateCommentInput,
    ): Promise<Comment> {
        const post = await this.postRepo.findById(postId);

        if (!post) {
            throw notFound('Post not found');
        }

        if (post.communityGroupId) {
            await this.requireGroupPermission(
                actorId,
                post.communityGroupId,
                GroupPermissionKey.GROUP_COMMENT_CREATE,
                'Missing permission to comment in this group',
            );
        }

        const comment = await this.postRepo.createComment({
            postId,
            authorId: actorId,
            content: input.content,
        });

        this.realtimePublisher.publish({
            type: 'post.comment.created',
            channel: `post:${postId}`,
            data: { commentId: comment.id, postId },
        });

        return comment;
    }

    async upsertReaction(
        actorId: string,
        postId: string,
        input: UpsertReactionInput,
    ): Promise<Reaction> {
        const post = await this.postRepo.findById(postId);

        if (!post) {
            throw notFound('Post not found');
        }

        if (post.communityGroupId) {
            await this.requireGroupPermission(
                actorId,
                post.communityGroupId,
                GroupPermissionKey.GROUP_REACTION_CREATE,
                'Missing permission to react in this group',
            );
        }

        const reaction = await this.postRepo.upsertReaction({
            userId: actorId,
            targetType: ReactionTargetType.POST,
            targetId: postId,
            type: input.type,
        });

        this.realtimePublisher.publish({
            type: 'post.reaction.upserted',
            channel: `post:${postId}`,
            data: { reactionId: reaction.id, postId },
        });

        return reaction;
    }

    async createGroupPost(
        actorId: string,
        groupId: string,
        input: CreateGroupPostInput,
    ): Promise<Post> {
        const decision = await this.permissionService.can(
            actorId,
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: groupId },
        );

        if (!decision.allowed) {
            throw forbidden('Missing permission to create post in this group');
        }

        if (input.groupTopicId) {
            const belongs = await this.postRepo.groupTopicBelongsToGroup(
                input.groupTopicId,
                groupId,
            );

            if (!belongs) {
                throw unprocessable(
                    'Group topic does not belong to this group',
                );
            }
        }

        return this.postRepo.createGroupPost({
            authorId: actorId,
            communityGroupId: groupId,
            content: input.content,
            groupTopicId: input.groupTopicId,
        });
    }

    async findGroupPosts(
        userId: string,
        groupId: string,
        input: FindGroupPostsInput,
    ): Promise<CursorPage<Post>> {
        const group = await this.groupRepo.findById(groupId);

        if (!group) {
            throw notFound('Community group not found');
        }

        if (group.visibility === GroupVisibility.PRIVATE) {
            const member = await this.groupRepo.findMember({ groupId, userId });

            if (!member || member.status !== GroupMemberStatus.ACTIVE) {
                throw notFound('Community group not found');
            }
        }

        const rows = await this.postRepo.findGroupPosts({
            communityGroupId: groupId,
            limit: input.limit,
            cursor: input.cursor,
        });

        const hasNextPage = rows.length > input.limit;
        const items = hasNextPage ? rows.slice(0, input.limit) : rows;
        const nextCursor =
            hasNextPage ? (items[items.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }

    async createGlobalPost(
        authorId: string,
        input: CreateGlobalPostInput,
    ): Promise<Post> {
        if (input.globalTopicId) {
            const topicExists = await this.postRepo.globalTopicExists(
                input.globalTopicId,
            );

            if (!topicExists) {
                throw unprocessable('Global topic does not exist');
            }
        }

        return this.postRepo.createGlobalPost({
            authorId,
            content: input.content,
            globalTopicId: input.globalTopicId,
        });
    }

    private async requireGroupPermission(
        actorId: string,
        groupId: string,
        action: GroupPermissionKey,
        message: string,
    ): Promise<void> {
        const decision = await this.permissionService.can(actorId, action, {
            resourceType: 'community_group',
            resourceId: groupId,
        });

        if (!decision.allowed) {
            throw forbidden(message);
        }
    }

    async findGlobalFeed(
        userId: string,
        input: FindGlobalFeedInput,
    ): Promise<CursorPage<Post>> {
        const connectionUserIds =
            await this.connectionService.listAcceptedConnectionUserIds(userId);

        if (connectionUserIds.length === 0) {
            return { items: [], nextCursor: null };
        }

        const rows = await this.postRepo.findGlobalFeedByAuthorIds({
            authorIds: connectionUserIds,
            limit: input.limit,
            cursor: input.cursor,
            globalTopicId: input.globalTopicId,
        });

        const hasNextPage = rows.length > input.limit;
        const items = hasNextPage ? rows.slice(0, input.limit) : rows;
        const nextCursor =
            hasNextPage ? (items[items.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }
}

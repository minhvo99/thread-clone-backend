import type {
    Comment,
    Post,
    PrismaClient,
    Reaction,
} from '../generated/prisma/client.ts';
import type {
    ReactionTargetType,
    ReactionType,
} from '../generated/prisma/enums.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateGlobalPostData = {
    authorId: string;
    content: string;
    globalTopicId?: string;
};

export type FindGlobalFeedParams = {
    authorIds: string[];
    limit: number;
    cursor?: string;
    globalTopicId?: string;
};

export type CreateGroupPostData = {
    authorId: string;
    communityGroupId: string;
    content: string;
    groupTopicId?: string;
};

export type FindGroupPostsParams = {
    communityGroupId: string;
    limit: number;
    cursor?: string;
};

export type CreateCommentData = {
    postId: string;
    authorId: string;
    content: string;
};

export type UpsertReactionData = {
    userId: string;
    targetType: ReactionTargetType;
    targetId: string;
    type: ReactionType;
};

export class PostRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findById(postId: string): Promise<Post | null> {
        return this.db.post.findUnique({ where: { id: postId } });
    }

    async createComment(data: CreateCommentData): Promise<Comment> {
        return this.db.comment.create({
            data: {
                postId: data.postId,
                authorId: data.authorId,
                content: data.content,
            },
        });
    }

    async upsertReaction(data: UpsertReactionData): Promise<Reaction> {
        return this.db.reaction.upsert({
            where: {
                userId_targetType_targetId: {
                    userId: data.userId,
                    targetType: data.targetType,
                    targetId: data.targetId,
                },
            },
            create: {
                userId: data.userId,
                targetType: data.targetType,
                targetId: data.targetId,
                type: data.type,
            },
            update: { type: data.type },
        });
    }

    async createGroupPost(data: CreateGroupPostData): Promise<Post> {
        return this.db.post.create({
            data: {
                authorId: data.authorId,
                communityGroupId: data.communityGroupId,
                content: data.content,
                groupTopicId: data.groupTopicId,
            },
        });
    }

    async groupTopicBelongsToGroup(
        topicId: string,
        groupId: string,
    ): Promise<boolean> {
        const topic = await this.db.communityTopic.findUnique({
            where: { id: topicId },
            select: { groupId: true },
        });

        return topic?.groupId === groupId;
    }

    async findGroupPosts(params: FindGroupPostsParams): Promise<Post[]> {
        return this.db.post.findMany({
            where: {
                communityGroupId: params.communityGroupId,
            },
            orderBy: { createdAt: 'desc' },
            take: params.limit + 1,
            cursor: params.cursor ? { id: params.cursor } : undefined,
            skip: params.cursor ? 1 : 0,
        });
    }

    async createGlobalPost(data: CreateGlobalPostData): Promise<Post> {
        return this.db.post.create({
            data: {
                authorId: data.authorId,
                content: data.content,
                globalTopicId: data.globalTopicId,
            },
        });
    }

    async globalTopicExists(topicId: string): Promise<boolean> {
        const topic = await this.db.globalTopic.findUnique({
            where: { id: topicId },
            select: { id: true },
        });

        return topic !== null;
    }

    async findGlobalFeedByAuthorIds(
        params: FindGlobalFeedParams,
    ): Promise<Post[]> {
        return this.db.post.findMany({
            where: {
                authorId: { in: params.authorIds },
                communityGroupId: null,
                globalTopicId: params.globalTopicId,
            },
            orderBy: { createdAt: 'desc' },
            take: params.limit + 1,
            cursor: params.cursor ? { id: params.cursor } : undefined,
            skip: params.cursor ? 1 : 0,
        });
    }
}

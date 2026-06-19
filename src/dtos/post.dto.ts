import { z } from 'zod';
import { ReactionType } from '../generated/prisma/enums.ts';

export const createGlobalPostSchema = z.object({
    content: z.string().trim().min(1).max(2_000),
    globalTopicId: z.string().trim().min(1).optional(),
});

export type CreateGlobalPostInput = z.infer<typeof createGlobalPostSchema>;

export const findGlobalFeedSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).optional(),
    globalTopicId: z.string().trim().min(1).optional(),
});

export type FindGlobalFeedInput = z.infer<typeof findGlobalFeedSchema>;

export const createGroupPostSchema = z.object({
    content: z.string().trim().min(1).max(2_000),
    groupTopicId: z.string().trim().min(1).optional(),
});

export type CreateGroupPostInput = z.infer<typeof createGroupPostSchema>;

export const findGroupPostsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).optional(),
});

export type FindGroupPostsInput = z.infer<typeof findGroupPostsSchema>;

export const createCommentSchema = z.object({
    content: z.string().trim().min(1).max(2_000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const upsertReactionSchema = z.object({
    type: z.enum(ReactionType),
});

export type UpsertReactionInput = z.infer<typeof upsertReactionSchema>;

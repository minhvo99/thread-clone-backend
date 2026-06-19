import { z } from 'zod';

export const sendChatMessageSchema = z.object({
    content: z.string().trim().min(1).max(4_000),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const findChatMessagesSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).optional(),
});

export type FindChatMessagesInput = z.infer<typeof findChatMessagesSchema>;

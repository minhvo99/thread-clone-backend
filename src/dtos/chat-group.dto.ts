import { z } from 'zod';

export const createChatGroupSchema = z.object({
    name: z.string().trim().min(1).max(120),
});

export type CreateChatGroupInput = z.infer<typeof createChatGroupSchema>;

export const inviteChatMemberSchema = z.object({
    inviteeId: z.string().trim().min(1),
});

export type InviteChatMemberInput = z.infer<typeof inviteChatMemberSchema>;

export const joinByInviteSchema = z.object({
    token: z.string().trim().min(1),
});

export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>;

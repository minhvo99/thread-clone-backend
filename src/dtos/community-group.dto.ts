import { z } from 'zod';

export const createCommunityGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

export type CreateCommunityGroupInput = z.infer<
  typeof createCommunityGroupSchema
>;

export const reviewJoinRequestSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
});

export type ReviewJoinRequestInput = z.infer<typeof reviewJoinRequestSchema>;

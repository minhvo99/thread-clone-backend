import { z } from 'zod';

export const requestConnectionSchema = z.object({
  addresseeId: z.string().trim().min(1),
});

export type RequestConnectionInput = z.infer<typeof requestConnectionSchema>;

export const reviewConnectionRequestSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
});

export type ReviewConnectionRequestInput = z.infer<
  typeof reviewConnectionRequestSchema
>;

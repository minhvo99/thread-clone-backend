import { z } from 'zod';

export const findNotificationsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).optional(),
});

export type FindNotificationsInput = z.infer<typeof findNotificationsSchema>;

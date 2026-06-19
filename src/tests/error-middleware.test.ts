import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorMiddleware } from '../middleware/error.middleware.ts';
import { forbidden } from '../lib/api-error.ts';

function createResponse() {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };

    return res;
}

describe('errorMiddleware', () => {
    it('serializes ApiError instances', () => {
        const res = createResponse();

        errorMiddleware(
            forbidden('Missing permission'),
            {} as never,
            res as never,
            vi.fn(),
        );

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Missing permission',
            },
        });
    });

    it('serializes Zod validation errors', () => {
        const res = createResponse();
        const schema = z.object({ visibility: z.enum(['PUBLIC', 'PRIVATE']) });
        const result = schema.safeParse({ visibility: 'SECRET' });

        expect(result.success).toBe(false);
        if (result.success) {
            throw new Error('Expected validation failure');
        }

        errorMiddleware(result.error, {} as never, res as never, vi.fn());

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request input',
                details: [
                    {
                        path: 'visibility',
                        message: expect.any(String),
                    },
                ],
            },
        });
    });

    it('hides unknown error details', () => {
        const res = createResponse();

        errorMiddleware(
            new Error('database password leaked'),
            {} as never,
            res as never,
            vi.fn(),
        );

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
            },
        });
    });
});

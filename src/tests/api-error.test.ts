import { describe, expect, it } from 'vitest';
import {
    ApiError,
    conflict,
    forbidden,
    notFound,
    payloadTooLarge,
    unauthorized,
    unprocessable,
} from '../lib/api-error.ts';

describe('ApiError helpers', () => {
    it('creates unauthorized errors', () => {
        const error = unauthorized();

        expect(error).toBeInstanceOf(ApiError);
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('Unauthorized');
    });

    it('creates domain errors with expected status codes', () => {
        expect(forbidden().statusCode).toBe(403);
        expect(notFound().statusCode).toBe(404);
        expect(conflict().statusCode).toBe(409);
        expect(payloadTooLarge().statusCode).toBe(413);
        expect(unprocessable().statusCode).toBe(422);
    });
});

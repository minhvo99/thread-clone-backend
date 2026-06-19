import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '../middleware/auth.middleware.ts';

function createRequest(authorization?: string): Request {
    return {
        headers: { authorization },
    } as Request;
}

function createNext() {
    const calls: unknown[] = [];
    const mock = vi.fn((deferToNext?: unknown) => {
        calls.push(deferToNext);
    });

    return {
        next: mock as NextFunction,
        mock,
        calls,
    };
}

describe('requireAuth', () => {
    afterEach(() => {
        delete process.env.JWT_ACCESS_SECRET;
    });

    it('rejects requests without a bearer token', () => {
        process.env.JWT_ACCESS_SECRET = 'test-secret';
        const req = createRequest();
        const { next, mock, calls } = createNext();

        requireAuth(req, {} as Response, next);

        expect(mock).toHaveBeenCalledOnce();
        expect(calls[0]).toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED',
        });
    });

    it('rejects invalid access tokens', () => {
        process.env.JWT_ACCESS_SECRET = 'test-secret';
        const req = createRequest('Bearer invalid-token');
        const { next, mock, calls } = createNext();

        requireAuth(req, {} as Response, next);

        expect(mock).toHaveBeenCalledOnce();
        expect(calls[0]).toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED',
            message: 'Invalid access token',
        });
    });

    it('attaches the authenticated user from a valid token', () => {
        process.env.JWT_ACCESS_SECRET = 'test-secret';
        const token = jwt.sign({ role: 'ADMIN' }, 'test-secret', {
            subject: 'user_123',
        });
        const req = createRequest(`Bearer ${token}`);
        const { next, mock, calls } = createNext();

        requireAuth(req, {} as Response, next);

        expect(req.authUser).toEqual({ id: 'user_123', role: 'ADMIN' });
        expect(mock).toHaveBeenCalledOnce();
        expect(calls[0]).toBeUndefined();
    });
});

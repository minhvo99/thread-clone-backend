import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/auth';
import { UnauthorizedError } from './errors';

export function getCurrentUser(req: Request): AuthenticatedUser {
    if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
    }

    return req.user;
}

export function getOptionalCurrentUser(
    req: Request,
): AuthenticatedUser | undefined {
    return req.user;
}

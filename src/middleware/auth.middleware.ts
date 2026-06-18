import { type NextFunction, type Request, type Response } from 'express';
import { container } from '../services/container.service';
import { AuthRepository } from '../repositories/auth.repository';
import type { AuthenticatedUser, UserRole } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

const authRepository = container.resolve<AuthRepository>('authRepository');

export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();

        if (!token) {
            throw new UnauthorizedError('No access token provided');
        }

        const payload = verifyAccessToken(token);

        if (payload.tokenType !== 'access') {
            throw new UnauthorizedError('Invalid access token');
        }

        const user = await authRepository.findUserById(payload.userId);

        if (!user || !user.isActive) {
            throw new UnauthorizedError('User is not authorized');
        }

        req.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            email: payload.email,
            role: payload.role,
        };

        next();
    } catch (error) {
        next(
            error instanceof UnauthorizedError ? error : (
                new UnauthorizedError('Invalid access token')
            ),
        );
    }
};

export const authorize = (...roles: UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError('Not authenticated'));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new ForbiddenError('Insufficient permissions'));
            return;
        }

        next();
    };
};

import type { User } from '../generated/prisma/client';
import { authConfig } from '../config/auth.config';
import type { AuthResponse, AuthTokens, PublicUser } from '../types/auth';
import { signAccessToken, signRefreshToken } from './jwt';

export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
    };
}

export function buildAuthTokens(user: User, sessionId: string): AuthTokens {
    const payload = {
        userId: user.id,
        sessionId,
        email: user.email,
        role: user.role,
    };

    return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        accessTokenExpiresInMinutes: authConfig.accessTtlMinutes,
        refreshTokenExpiresInDays: authConfig.refreshTtlDays,
    };
}

export function buildAuthResponse(user: User, sessionId: string): AuthResponse {
    return {
        user: toPublicUser(user),
        tokens: buildAuthTokens(user, sessionId),
    };
}

export function getAccessTokenExpiryDate(): Date {
    return new Date(Date.now() + authConfig.accessTtlMinutes * 60 * 1000);
}

export function getRefreshTokenExpiryDate(): Date {
    return new Date(
        Date.now() + authConfig.refreshTtlDays * 24 * 60 * 60 * 1000,
    );
}

export function getPasswordResetExpiryDate(): Date {
    return new Date(
        Date.now() + authConfig.passwordResetTtlMinutes * 60 * 1000,
    );
}

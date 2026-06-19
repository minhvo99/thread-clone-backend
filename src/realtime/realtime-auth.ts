import jwt from 'jsonwebtoken';
import type { UserRole } from '../generated/prisma/enums.ts';
import { unauthorized } from '../lib/api-error.ts';
import type { AuthUser } from '../types/express.ts';

type AccessTokenPayload = jwt.JwtPayload & {
    sub: string;
    role?: UserRole;
};

function getAccessTokenSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();

    if (!secret) {
        throw new Error('Missing auth config: JWT_ACCESS_SECRET');
    }

    return secret;
}

export function extractRealtimeToken(url: string | undefined): string | null {
    if (!url) return null;

    const parsedUrl = new URL(url, 'http://localhost');
    return parsedUrl.searchParams.get('token');
}

export function verifyRealtimeAccessToken(token: string): AuthUser {
    const payload = jwt.verify(
        token,
        getAccessTokenSecret(),
    ) as AccessTokenPayload;

    if (!payload.sub) {
        throw unauthorized('Invalid access token');
    }

    return {
        id: payload.sub,
        role: payload.role ?? 'USER',
    };
}

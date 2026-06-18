import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.config';
import type { JwtPayload } from '../types/auth';

export function signAccessToken(
    payload: Omit<JwtPayload, 'tokenType'>,
): string {
    return jwt.sign(
        { ...payload, tokenType: 'access' satisfies JwtPayload['tokenType'] },
        authConfig.accessSecret,
        {
            expiresIn: `${authConfig.accessTtlMinutes}m`,
            subject: payload.userId,
        },
    );
}

export function signRefreshToken(
    payload: Omit<JwtPayload, 'tokenType'>,
): string {
    return jwt.sign(
        { ...payload, tokenType: 'refresh' satisfies JwtPayload['tokenType'] },
        authConfig.refreshSecret,
        {
            expiresIn: `${authConfig.refreshTtlDays}d`,
            subject: payload.userId,
        },
    );
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, authConfig.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, authConfig.refreshSecret) as JwtPayload;
}

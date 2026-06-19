import type { NextFunction, Request, Response } from 'express';
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

function readBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, getAccessTokenSecret()) as AccessTokenPayload;

  if (!payload.sub) {
    throw unauthorized('Invalid access token');
  }

  return {
    id: payload.sub,
    role: payload.role ?? 'USER',
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = readBearerToken(req.headers.authorization);

    if (!token) {
      throw unauthorized();
    }

    req.authUser = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(unauthorized('Invalid access token'));
      return;
    }

    next(err);
  }
}

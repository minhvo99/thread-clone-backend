import type { User } from '../generated/prisma/client.js'
import {
  authConfig,
  accessTokenExpiresIn,
  refreshTokenExpiresIn,
} from '../config/auth.js'
import type { AuthResponse, AuthTokens, PublicUser } from '../types/auth.js'
import { signAccessToken, signRefreshToken } from './jwt.js'

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
  }
}

export function buildAuthTokens(
  user: User,
  sessionId: string,
): AuthTokens {
  const payload = {
    userId: user.id,
    sessionId,
    email: user.email,
    role: user.role,
  }

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    accessTokenExpiresInMinutes: authConfig.accessTokenTtlMinutes,
    refreshTokenExpiresInDays: authConfig.refreshTokenTtlDays,
  }
}

export function buildAuthResponse(user: User, sessionId: string): AuthResponse {
  return {
    user: toPublicUser(user),
    tokens: buildAuthTokens(user, sessionId),
  }
}

export function getAccessTokenExpiryDate(): Date {
  return new Date(Date.now() + authConfig.accessTokenTtlMinutes * 60 * 1000)
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + authConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000)
}

export function getPasswordResetExpiryDate(): Date {
  return new Date(Date.now() + authConfig.passwordResetTtlMinutes * 60 * 1000)
}

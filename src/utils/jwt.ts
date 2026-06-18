import jwt from 'jsonwebtoken'
import {
  accessTokenExpiresIn,
  authConfig,
  refreshTokenExpiresIn,
} from '../config/auth.js'
import type { JwtPayload } from '../types/auth.js'

export function signAccessToken(payload: Omit<JwtPayload, 'tokenType'>): string {
  return jwt.sign(
    { ...payload, tokenType: 'access' satisfies JwtPayload['tokenType'] },
    authConfig.jwtAccessSecret,
    {
      expiresIn: accessTokenExpiresIn,
      subject: payload.userId,
    },
  )
}

export function signRefreshToken(payload: Omit<JwtPayload, 'tokenType'>): string {
  return jwt.sign(
    { ...payload, tokenType: 'refresh' satisfies JwtPayload['tokenType'] },
    authConfig.jwtRefreshSecret,
    {
      expiresIn: refreshTokenExpiresIn,
      subject: payload.userId,
    },
  )
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, authConfig.jwtAccessSecret) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, authConfig.jwtRefreshSecret) as JwtPayload
}

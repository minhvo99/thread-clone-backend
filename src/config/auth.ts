import type { SignOptions } from 'jsonwebtoken'

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing auth config: ${name}`)
  }

  return value
}

function getNumberEnv(name: string, defaultValue: number): number {
  const value = process.env[name]?.trim()

  if (!value) {
    return defaultValue
  }

  const parsed = Number(value)

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric auth config: ${name}`)
  }

  return parsed
}

export const authConfig = {
  jwtAccessSecret: getRequiredEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  accessTokenTtlMinutes: getNumberEnv('ACCESS_TOKEN_TTL_MINUTES', 15),
  refreshTokenTtlDays: getNumberEnv('REFRESH_TOKEN_TTL_DAYS', 7),
  passwordResetTtlMinutes: getNumberEnv('PASSWORD_RESET_TOKEN_TTL_MINUTES', 60),
  appUrl: process.env.APP_URL?.trim() || 'http://localhost:3000',
  smtpHost: process.env.SMTP_HOST?.trim(),
  smtpPort: getNumberEnv('SMTP_PORT', 587),
  smtpSecure: process.env.SMTP_SECURE?.trim() === 'true',
  smtpUser: process.env.SMTP_USER?.trim(),
  smtpPass: process.env.SMTP_PASS?.trim(),
  emailFrom: process.env.EMAIL_FROM?.trim(),
}

export const accessTokenExpiresIn = `${authConfig.accessTokenTtlMinutes}m` as SignOptions['expiresIn']
export const refreshTokenExpiresIn = `${authConfig.refreshTokenTtlDays}d` as SignOptions['expiresIn']

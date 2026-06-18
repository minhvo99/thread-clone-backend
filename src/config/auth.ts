const env = process.env

if (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) {
  throw new Error('Missing auth config')
}

export const authConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessTtlMinutes: Number(env.ACCESS_TOKEN_TTL_MINUTES || 15),
  refreshTtlDays: Number(env.REFRESH_TOKEN_TTL_DAYS || 7),
  resetTtlMinutes: Number(env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60),
  appUrl: env.APP_URL || 'http://localhost:3000',
  smtpHost: env.SMTP_HOST,
  smtpPort: Number(env.SMTP_PORT || 587),
  smtpSecure: env.SMTP_SECURE === 'true',
  smtpUser: env.SMTP_USER,
  smtpPass: env.SMTP_PASS,
  emailFrom: env.EMAIL_FROM,
} as const

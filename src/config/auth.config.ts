export const authConfig = {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
    passwordResetTtlMinutes: Number(
        process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60,
    ),
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    emailFrom: process.env.EMAIL_FROM,
} as const;

export const appConfig = {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map((value) =>
        value.trim(),
    ),
} as const;

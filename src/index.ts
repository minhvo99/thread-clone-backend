import 'dotenv/config';
import app from './app';
import { appConfig } from './config/app.config';
import { closeDatabase } from './config/database';

const PORT = appConfig.port;

const server = app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});

const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully`);
    server.close();
    await closeDatabase();
    process.exit(0);
};

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

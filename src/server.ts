import { createServer as createHttpServer, type Server } from 'node:http';
import app from './app.ts';
import { realtimeHub } from './realtime/realtime-hub-singleton.ts';
import { createRealtimeServer } from './realtime/realtime-server.ts';
import { verifyRealtimeAccessToken } from './realtime/realtime-auth.ts';

export function createServer(): Server {
    const server = createHttpServer(app);

    createRealtimeServer({
        server,
        hub: realtimeHub,
        authenticateToken: async (token) => verifyRealtimeAccessToken(token),
    });

    return server;
}

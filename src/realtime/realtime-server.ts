import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type {
    RealtimeChannel,
    RealtimeClientMessage,
} from '../realtime/realtime.types.ts';
import type { AuthUser } from '../types/express.ts';
import { extractRealtimeToken } from './realtime-auth.ts';
import type { RealtimeHub } from './realtime-hub.ts';

export type CreateRealtimeServerParams = {
    server: Server;
    hub: RealtimeHub;
    authenticateToken(token: string): Promise<AuthUser>;
    canSubscribe?(params: {
        userId: string;
        channel: RealtimeChannel;
    }): Promise<boolean>;
};

export function createRealtimeServer(
    params: CreateRealtimeServerParams,
): WebSocketServer {
    const wss = new WebSocketServer({
        server: params.server,
        path: '/realtime',
    });

    wss.on('connection', async (socket, request) => {
        const token = extractRealtimeToken(request.url);

        if (!token) {
            socket.close(1008, 'Missing token');
            return;
        }

        let user: AuthUser;

        try {
            user = await params.authenticateToken(token);
        } catch {
            socket.close(1008, 'Invalid token');
            return;
        }

        socket.on('message', async (raw) => {
            try {
                const message = JSON.parse(
                    raw.toString(),
                ) as RealtimeClientMessage;

                if (message.type === 'subscribe') {
                    if (params.canSubscribe) {
                        const allowed = await params.canSubscribe({
                            userId: user.id,
                            channel: message.channel,
                        });
                        if (allowed)
                            params.hub.subscribe(socket, message.channel);
                    } else {
                        params.hub.subscribe(socket, message.channel);
                    }
                    return;
                }

                if (message.type === 'unsubscribe') {
                    params.hub.unsubscribe(socket, message.channel);
                }
            } catch {
                // ignore invalid messages
            }
        });

        socket.on('close', () => params.hub.remove(socket));
    });

    return wss;
}

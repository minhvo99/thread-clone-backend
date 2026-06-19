import type {
    RealtimeChannel,
    RealtimeEvent,
    RealtimePublisher,
} from './realtime.types.ts';

type SendableSocket = {
    readyState: number;
    send(data: string): void;
};

const OPEN = 1;

export class RealtimeHub implements RealtimePublisher {
    private readonly subscribers = new Map<
        RealtimeChannel,
        Set<SendableSocket>
    >();

    subscribe(socket: SendableSocket, channel: RealtimeChannel): void {
        const sockets =
            this.subscribers.get(channel) ?? new Set<SendableSocket>();
        sockets.add(socket);
        this.subscribers.set(channel, sockets);
    }

    unsubscribe(socket: SendableSocket, channel: RealtimeChannel): void {
        this.subscribers.get(channel)?.delete(socket);
    }

    remove(socket: SendableSocket): void {
        for (const sockets of this.subscribers.values()) {
            sockets.delete(socket);
        }
    }

    publish(event: RealtimeEvent): void {
        const payload = JSON.stringify(event);
        const sockets =
            this.subscribers.get(event.channel) ?? new Set<SendableSocket>();

        for (const socket of sockets) {
            if (socket.readyState === OPEN) {
                socket.send(payload);
            }
        }
    }
}

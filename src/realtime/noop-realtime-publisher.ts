import type { RealtimeEvent, RealtimePublisher } from './realtime.types.ts';

export class NoopRealtimePublisher implements RealtimePublisher {
    publish(_event: RealtimeEvent): void {}
}

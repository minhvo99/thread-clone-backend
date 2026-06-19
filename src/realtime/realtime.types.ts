export type RealtimeChannel =
    | `user:${string}`
    | `chat_group:${string}`
    | `post:${string}`
    | `community_group:${string}`;

export type RealtimeEventType =
    | 'chat.message.created'
    | 'notification.created'
    | 'post.comment.created'
    | 'post.reaction.upserted';

export type RealtimeEvent = {
    type: RealtimeEventType;
    channel: RealtimeChannel;
    data: Record<string, unknown>;
};

export type RealtimePublisher = {
    publish(event: RealtimeEvent): void;
};

export type RealtimeClientMessage =
    | { type: 'subscribe'; channel: RealtimeChannel }
    | { type: 'unsubscribe'; channel: RealtimeChannel };

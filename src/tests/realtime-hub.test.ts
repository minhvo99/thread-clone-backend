import { describe, expect, it, vi } from 'vitest';
import { RealtimeHub } from '../realtime/realtime-hub.ts';

function socket() {
    return {
        readyState: 1,
        send: vi.fn(),
    };
}

describe('RealtimeHub', () => {
    it('publishes events to sockets subscribed to a channel', () => {
        const hub = new RealtimeHub();
        const client = socket();

        hub.subscribe(client, 'post:post_1');
        hub.publish({
            type: 'post.comment.created',
            channel: 'post:post_1',
            data: { commentId: 'comment_1' },
        });

        expect(client.send).toHaveBeenCalledWith(
            JSON.stringify({
                type: 'post.comment.created',
                channel: 'post:post_1',
                data: { commentId: 'comment_1' },
            }),
        );
    });
});

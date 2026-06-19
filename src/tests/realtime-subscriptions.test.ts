import { describe, expect, it, vi } from 'vitest';
import {
    canSubscribe,
    parseChannel,
} from '../realtime/realtime-subscriptions.ts';

describe('realtime subscriptions', () => {
    it('parses supported channels', () => {
        expect(parseChannel('user:user_1')).toEqual({
            kind: 'user',
            id: 'user_1',
        });
        expect(parseChannel('chat_group:chat_1')).toEqual({
            kind: 'chat_group',
            id: 'chat_1',
        });
        expect(parseChannel('post:post_1')).toEqual({
            kind: 'post',
            id: 'post_1',
        });
    });

    it('allows subscribing to own user channel', async () => {
        const allowed = await canSubscribe({
            userId: 'user_1',
            channel: 'user:user_1',
            chatGroupRepo: { findMember: vi.fn() },
            postRepo: { findById: vi.fn() },
            groupRepo: { findMember: vi.fn(), findById: vi.fn() },
        });

        expect(allowed).toBe(true);
    });

    it('rejects subscribing to another user channel', async () => {
        const allowed = await canSubscribe({
            userId: 'user_1',
            channel: 'user:user_2',
            chatGroupRepo: { findMember: vi.fn() },
            postRepo: { findById: vi.fn() },
            groupRepo: { findMember: vi.fn(), findById: vi.fn() },
        });

        expect(allowed).toBe(false);
    });
});

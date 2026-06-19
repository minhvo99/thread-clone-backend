import { describe, expect, it } from 'vitest';
import { extractRealtimeToken } from '../realtime/realtime-auth.ts';

describe('realtime auth', () => {
    it('extracts token from the websocket request URL', () => {
        const token = extractRealtimeToken('/realtime?token=abc123');

        expect(token).toBe('abc123');
    });

    it('returns null when token is missing', () => {
        expect(extractRealtimeToken('/realtime')).toBeNull();
    });
});

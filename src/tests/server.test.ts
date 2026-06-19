process.env.DATABASE_URL ??= 'file:./dev.db';
process.env.JWT_ACCESS_SECRET ??= 'test-secret';

import { describe, expect, it } from 'vitest';

const { createServer } = await import('../server.ts');

describe('server bootstrap', () => {
    it('creates an HTTP server that can be closed', () => {
        const server = createServer();

        expect(server).toBeDefined();
        expect(typeof server.listen).toBe('function');

        server.close();
    });
});

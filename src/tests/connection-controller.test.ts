import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionStatus } from '../generated/prisma/enums.ts';
import { ConnectionController } from '../controllers/connection.controller.ts';
import type { ConnectionService } from '../services/connection.service.ts';

function createResponse() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
}

function connection(status: ConnectionStatus = ConnectionStatus.PENDING) {
    return {
        id: 'connection_1',
        requesterId: 'user_1',
        addresseeId: 'user_2',
        status,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

describe('ConnectionController', () => {
    it('creates a connection request from the authenticated user', async () => {
        const service = {
            requestConnection: vi.fn().mockResolvedValue(connection()),
        } as unknown as ConnectionService;
        const controller = new ConnectionController(service);
        const req = {
            authUser: { id: 'user_1', role: 'USER' },
            body: { addresseeId: 'user_2' },
        } as unknown as Request;
        const res = createResponse();

        await controller.requestConnection(req, res);

        expect(service.requestConnection).toHaveBeenCalledWith(
            'user_1',
            'user_2',
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { connection: connection() },
        });
    });

    it('reviews a connection request from the authenticated user', async () => {
        const service = {
            reviewConnectionRequest: vi
                .fn()
                .mockResolvedValue(connection(ConnectionStatus.ACCEPTED)),
        } as unknown as ConnectionService;
        const controller = new ConnectionController(service);
        const req = {
            authUser: { id: 'user_2', role: 'USER' },
            params: { connectionId: 'connection_1' },
            body: { decision: 'ACCEPT' },
        } as unknown as Request;
        const res = createResponse();

        await controller.reviewConnectionRequest(req, res);

        expect(service.reviewConnectionRequest).toHaveBeenCalledWith(
            'user_2',
            'connection_1',
            'ACCEPT',
        );
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { connection: connection(ConnectionStatus.ACCEPTED) },
        });
    });
});

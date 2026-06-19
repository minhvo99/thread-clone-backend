import { describe, expect, it, vi } from 'vitest';
import { ConnectionStatus } from '../generated/prisma/enums.ts';
import type { ConnectionRepository } from '../repositories/connection.repository.ts';
import { ConnectionService } from '../services/connection.service.ts';

function connection(params: {
    id?: string;
    requesterId?: string;
    addresseeId?: string;
    status?: ConnectionStatus;
}) {
    return {
        id: params.id ?? 'connection_1',
        requesterId: params.requesterId ?? 'user_1',
        addresseeId: params.addresseeId ?? 'user_2',
        status: params.status ?? ConnectionStatus.PENDING,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

function createRepositoryMock(params?: {
    existingConnection?: ReturnType<typeof connection> | null;
}) {
    return {
        findBetweenUsers: vi
            .fn()
            .mockResolvedValue(params?.existingConnection ?? null),
        findById: vi.fn().mockResolvedValue(params?.existingConnection ?? null),
        create: vi.fn().mockImplementation(async (data) => connection(data)),
        updateStatus: vi
            .fn()
            .mockImplementation(async ({ connectionId, status }) =>
                connection({ id: connectionId, status }),
            ),
        findAcceptedConnectionUserIds: vi
            .fn()
            .mockResolvedValue(['user_2', 'user_3']),
    } as unknown as ConnectionRepository;
}

describe('ConnectionService', () => {
    it('creates a pending connection request between two different users', async () => {
        const repo = createRepositoryMock();
        const service = new ConnectionService(repo);

        const result = await service.requestConnection('user_1', 'user_2');

        expect(result.status).toBe(ConnectionStatus.PENDING);
        expect(repo.create).toHaveBeenCalledWith({
            requesterId: 'user_1',
            addresseeId: 'user_2',
            status: ConnectionStatus.PENDING,
        });
    });

    it('rejects connection requests to self', async () => {
        const repo = createRepositoryMock();
        const service = new ConnectionService(repo);

        await expect(
            service.requestConnection('user_1', 'user_1'),
        ).rejects.toMatchObject({
            statusCode: 422,
            code: 'UNPROCESSABLE_ENTITY',
        });
    });

    it('rejects duplicate pending or accepted connection requests', async () => {
        const repo = createRepositoryMock({
            existingConnection: connection({
                status: ConnectionStatus.PENDING,
            }),
        });
        const service = new ConnectionService(repo);

        await expect(
            service.requestConnection('user_1', 'user_2'),
        ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });

    it('allows the addressee to accept a pending connection request', async () => {
        const existingConnection = connection({
            id: 'connection_1',
            requesterId: 'user_1',
            addresseeId: 'user_2',
            status: ConnectionStatus.PENDING,
        });
        const repo = createRepositoryMock({ existingConnection });
        const service = new ConnectionService(repo);

        const result = await service.reviewConnectionRequest(
            'user_2',
            'connection_1',
            'ACCEPT',
        );

        expect(result.status).toBe(ConnectionStatus.ACCEPTED);
        expect(repo.updateStatus).toHaveBeenCalledWith({
            connectionId: 'connection_1',
            status: ConnectionStatus.ACCEPTED,
        });
    });

    it('rejects review by anyone except the addressee', async () => {
        const existingConnection = connection({ addresseeId: 'user_2' });
        const repo = createRepositoryMock({ existingConnection });
        const service = new ConnectionService(repo);

        await expect(
            service.reviewConnectionRequest('user_3', 'connection_1', 'ACCEPT'),
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('returns accepted connection user ids for feed filtering', async () => {
        const repo = createRepositoryMock();
        const service = new ConnectionService(repo);

        const result = await service.listAcceptedConnectionUserIds('user_1');

        expect(result).toEqual(['user_2', 'user_3']);
        expect(repo.findAcceptedConnectionUserIds).toHaveBeenCalledWith(
            'user_1',
        );
    });
});

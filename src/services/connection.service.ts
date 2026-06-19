import { ConnectionStatus } from '../generated/prisma/enums.ts';
import type { Connection } from '../generated/prisma/client.ts';
import {
    conflict,
    forbidden,
    notFound,
    unprocessable,
} from '../lib/api-error.ts';
import type { ConnectionRepository } from '../repositories/connection.repository.ts';

export type ConnectionReviewDecision = 'ACCEPT' | 'REJECT';

export class ConnectionService {
    constructor(private readonly connectionRepo: ConnectionRepository) {}

    async requestConnection(
        requesterId: string,
        addresseeId: string,
    ): Promise<Connection> {
        if (requesterId === addresseeId) {
            throw unprocessable('Cannot connect with yourself');
        }

        const existingConnection = await this.connectionRepo.findBetweenUsers({
            userAId: requesterId,
            userBId: addresseeId,
        });

        if (
            existingConnection
            && (existingConnection.status === ConnectionStatus.PENDING
                || existingConnection.status === ConnectionStatus.ACCEPTED)
        ) {
            throw conflict('Connection request already exists');
        }

        if (existingConnection?.status === ConnectionStatus.BLOCKED) {
            throw forbidden('Connection is blocked');
        }

        if (existingConnection?.status === ConnectionStatus.REJECTED) {
            return this.connectionRepo.updateStatus({
                connectionId: existingConnection.id,
                status: ConnectionStatus.PENDING,
            });
        }

        return this.connectionRepo.create({
            requesterId,
            addresseeId,
            status: ConnectionStatus.PENDING,
        });
    }

    async reviewConnectionRequest(
        actorId: string,
        connectionId: string,
        decision: ConnectionReviewDecision,
    ): Promise<Connection> {
        const connection = await this.connectionRepo.findById(connectionId);

        if (!connection) {
            throw notFound('Connection request not found');
        }

        if (connection.addresseeId !== actorId) {
            throw forbidden('Only the addressee can review this request');
        }

        if (connection.status !== ConnectionStatus.PENDING) {
            throw unprocessable('Connection request is not pending');
        }

        return this.connectionRepo.updateStatus({
            connectionId,
            status:
                decision === 'ACCEPT' ?
                    ConnectionStatus.ACCEPTED
                :   ConnectionStatus.REJECTED,
        });
    }

    async listAcceptedConnectionUserIds(userId: string): Promise<string[]> {
        return this.connectionRepo.findAcceptedConnectionUserIds(userId);
    }
}

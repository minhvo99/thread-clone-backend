import { ConnectionStatus } from '../generated/prisma/enums.ts';
import type { Connection, PrismaClient } from '../generated/prisma/client.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateConnectionData = {
    requesterId: string;
    addresseeId: string;
    status: ConnectionStatus;
};

export class ConnectionRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findBetweenUsers(params: {
        userAId: string;
        userBId: string;
    }): Promise<Connection | null> {
        return this.db.connection.findFirst({
            where: {
                OR: [
                    {
                        requesterId: params.userAId,
                        addresseeId: params.userBId,
                    },
                    {
                        requesterId: params.userBId,
                        addresseeId: params.userAId,
                    },
                ],
            },
        });
    }

    async findById(connectionId: string): Promise<Connection | null> {
        return this.db.connection.findUnique({ where: { id: connectionId } });
    }

    async create(data: CreateConnectionData): Promise<Connection> {
        return this.db.connection.create({ data });
    }

    async updateStatus(params: {
        connectionId: string;
        status: ConnectionStatus;
    }): Promise<Connection> {
        return this.db.connection.update({
            where: { id: params.connectionId },
            data: { status: params.status },
        });
    }

    async findAcceptedConnectionUserIds(userId: string): Promise<string[]> {
        const connections = await this.db.connection.findMany({
            where: {
                status: ConnectionStatus.ACCEPTED,
                OR: [{ requesterId: userId }, { addresseeId: userId }],
            },
            select: {
                requesterId: true,
                addresseeId: true,
            },
        });

        return connections.map((connection) =>
            connection.requesterId === userId ?
                connection.addresseeId
            :   connection.requesterId,
        );
    }
}

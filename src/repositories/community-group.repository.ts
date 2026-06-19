import type {
    GroupMemberStatus,
    GroupVisibility,
} from '../generated/prisma/enums.ts';
import type {
    CommunityGroup,
    CommunityGroupMember,
    Prisma,
    PrismaClient,
} from '../generated/prisma/client.ts';
import { prisma } from '../lib/prisma.ts';

export type CreateCommunityGroupData = {
    ownerId: string;
    name: string;
    slug: string;
    description?: string;
    visibility: GroupVisibility;
};

export type CreateGroupMemberData = {
    groupId: string;
    userId: string;
    status: GroupMemberStatus;
};

export class CommunityGroupRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async transaction<T>(
        callback: (tx: Prisma.TransactionClient) => Promise<T>,
    ): Promise<T> {
        return this.db.$transaction(callback);
    }

    async create(
        data: CreateCommunityGroupData,
        tx?: Prisma.TransactionClient,
    ): Promise<CommunityGroup> {
        const client = tx ?? this.db;

        return client.communityGroup.create({ data });
    }

    async findById(groupId: string): Promise<CommunityGroup | null> {
        return this.db.communityGroup.findUnique({ where: { id: groupId } });
    }

    async findMember(params: {
        groupId: string;
        userId: string;
    }): Promise<CommunityGroupMember | null> {
        return this.db.communityGroupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId: params.groupId,
                    userId: params.userId,
                },
            },
        });
    }

    async createMember(
        data: CreateGroupMemberData,
        tx?: Prisma.TransactionClient,
    ): Promise<CommunityGroupMember> {
        const client = tx ?? this.db;

        return client.communityGroupMember.create({ data });
    }

    async updateMemberStatus(
        params: {
            memberId: string;
            status: GroupMemberStatus;
        },
        tx?: Prisma.TransactionClient,
    ): Promise<CommunityGroupMember> {
        const client = tx ?? this.db;

        return client.communityGroupMember.update({
            where: { id: params.memberId },
            data: { status: params.status },
        });
    }
}

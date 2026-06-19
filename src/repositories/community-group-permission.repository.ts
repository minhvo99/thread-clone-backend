import type { GroupMemberStatus } from '../generated/prisma/enums.ts';
import type { Prisma, PrismaClient } from '../generated/prisma/client.ts';
import { prisma } from '../lib/prisma.ts';
import type { GroupPermissionKey } from '../models/permission.model.ts';

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

export type GroupPermissionMember = {
    id: string;
    status: GroupMemberStatus;
    permissionKeys: string[];
};

export type GroupPermissionContext = {
    groupExists: boolean;
    member: GroupPermissionMember | null;
};

export type SeedGroupRolesParams = {
    groupId: string;
    roles: readonly {
        name: string;
        permissions: readonly GroupPermissionKey[];
    }[];
};

export type AssignRoleParams = {
    memberId: string;
    groupId: string;
    roleName: string;
};

export class CommunityGroupPermissionRepository {
    constructor(private readonly db: PrismaLikeClient = prisma) {}

    async findPermissionContext(params: {
        groupId: string;
        userId: string;
    }): Promise<GroupPermissionContext> {
        const group = await this.db.communityGroup.findUnique({
            where: { id: params.groupId },
            select: {
                id: true,
                members: {
                    where: { userId: params.userId },
                    select: {
                        id: true,
                        status: true,
                        roles: {
                            select: {
                                role: {
                                    select: {
                                        permissions: {
                                            select: {
                                                permission: {
                                                    select: { key: true },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    take: 1,
                },
            },
        });

        if (!group) {
            return { groupExists: false, member: null };
        }

        const member = group.members[0];

        if (!member) {
            return { groupExists: true, member: null };
        }

        const permissionKeys = member.roles.flatMap((memberRole) =>
            memberRole.role.permissions.map(
                (rolePermission) => rolePermission.permission.key,
            ),
        );

        return {
            groupExists: true,
            member: {
                id: member.id,
                status: member.status,
                permissionKeys,
            },
        };
    }

    async seedGroupRoles(
        params: SeedGroupRolesParams,
        tx?: Prisma.TransactionClient,
    ): Promise<void> {
        const client = tx ?? this.db;

        for (const roleSeed of params.roles) {
            const role = await client.groupRole.upsert({
                where: {
                    groupId_name: {
                        groupId: params.groupId,
                        name: roleSeed.name,
                    },
                },
                update: { isSystem: true },
                create: {
                    groupId: params.groupId,
                    name: roleSeed.name,
                    isSystem: true,
                },
            });

            for (const permissionKey of roleSeed.permissions) {
                const permission = await client.groupPermission.upsert({
                    where: { key: permissionKey },
                    update: {},
                    create: { key: permissionKey },
                });

                await client.groupRolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }

    async assignRole(
        params: AssignRoleParams,
        tx?: Prisma.TransactionClient,
    ): Promise<void> {
        const client = tx ?? this.db;
        const role = await client.groupRole.findUnique({
            where: {
                groupId_name: {
                    groupId: params.groupId,
                    name: params.roleName,
                },
            },
            select: { id: true },
        });

        if (!role) {
            throw new Error(`Missing group role: ${params.roleName}`);
        }

        await client.groupMemberRole.upsert({
            where: {
                memberId_roleId: {
                    memberId: params.memberId,
                    roleId: role.id,
                },
            },
            update: {},
            create: {
                memberId: params.memberId,
                roleId: role.id,
            },
        });
    }
}

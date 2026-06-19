import { describe, expect, it, vi } from 'vitest';
import {
    GroupMemberStatus,
    GroupVisibility,
} from '../generated/prisma/enums.ts';
import type {
    CommunityGroup,
    CommunityGroupMember,
} from '../generated/prisma/client.ts';
import { GroupPermissionKey } from '../models/permission.model.ts';
import type { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import type { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import { CommunityGroupService } from '../services/community-group.service.ts';
import type { PermissionService } from '../services/permission.service.ts';

const group = {
    id: 'group_1',
    ownerId: 'owner_1',
    name: 'TCB Group',
    slug: 'tcb-group',
    description: null,
    avatarUrl: null,
    coverUrl: null,
    visibility: GroupVisibility.PUBLIC,
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
} satisfies CommunityGroup;

function member(params: {
    id?: string;
    userId?: string;
    status: GroupMemberStatus;
}): CommunityGroupMember {
    return {
        id: params.id ?? 'member_1',
        groupId: 'group_1',
        userId: params.userId ?? 'user_1',
        status: params.status,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    };
}

function createService(params?: {
    existingGroup?: CommunityGroup | null;
    existingMember?: CommunityGroupMember | null;
    permissionAllowed?: boolean;
}) {
    const groupRepo = {
        transaction: vi.fn(async (callback) => callback({} as never)),
        create: vi.fn().mockResolvedValue(group),
        findById: vi.fn().mockResolvedValue(params?.existingGroup ?? group),
        findMember: vi.fn().mockResolvedValue(params?.existingMember ?? null),
        createMember: vi
            .fn()
            .mockImplementation(async (data) =>
                member({ userId: data.userId, status: data.status }),
            ),
        updateMemberStatus: vi
            .fn()
            .mockImplementation(async ({ memberId, status }) =>
                member({ id: memberId, status }),
            ),
    } as unknown as CommunityGroupRepository;

    const permissionRepo = {
        seedGroupRoles: vi.fn().mockResolvedValue(undefined),
        assignRole: vi.fn().mockResolvedValue(undefined),
    } as unknown as CommunityGroupPermissionRepository;

    const permissionService = {
        can: vi
            .fn()
            .mockResolvedValue(
                params?.permissionAllowed === false ?
                    { allowed: false, reason: 'MISSING_PERMISSION' }
                :   { allowed: true },
            ),
    } as unknown as PermissionService;

    return {
        groupRepo,
        permissionRepo,
        permissionService,
        service: new CommunityGroupService(
            groupRepo,
            permissionRepo,
            permissionService,
        ),
    };
}

describe('CommunityGroupService', () => {
    it('creates a group, active owner membership, seeded roles, and owner role in a transaction', async () => {
        const { service, groupRepo, permissionRepo } = createService();

        const result = await service.createGroup('owner_1', {
            name: 'TCB Group',
            slug: 'tcb-group',
            visibility: 'PUBLIC',
        });

        expect(result.group.id).toBe('group_1');
        expect(groupRepo.transaction).toHaveBeenCalledOnce();
        expect(groupRepo.create).toHaveBeenCalledWith(
            {
                ownerId: 'owner_1',
                name: 'TCB Group',
                slug: 'tcb-group',
                description: undefined,
                visibility: 'PUBLIC',
            },
            {},
        );
        expect(groupRepo.createMember).toHaveBeenCalledWith(
            {
                groupId: 'group_1',
                userId: 'owner_1',
                status: GroupMemberStatus.ACTIVE,
            },
            {},
        );
        expect(permissionRepo.seedGroupRoles).toHaveBeenCalledOnce();
        expect(permissionRepo.assignRole).toHaveBeenCalledWith(
            { groupId: 'group_1', memberId: 'member_1', roleName: 'owner' },
            {},
        );
    });

    it('creates a pending join request for a new member', async () => {
        const { service, groupRepo } = createService();

        const result = await service.requestJoin('user_1', 'group_1');

        expect(result.status).toBe(GroupMemberStatus.PENDING);
        expect(groupRepo.createMember).toHaveBeenCalledWith({
            groupId: 'group_1',
            userId: 'user_1',
            status: GroupMemberStatus.PENDING,
        });
    });

    it('rejects duplicate pending join requests', async () => {
        const { service } = createService({
            existingMember: member({ status: GroupMemberStatus.PENDING }),
        });

        await expect(
            service.requestJoin('user_1', 'group_1'),
        ).rejects.toMatchObject({
            statusCode: 409,
            code: 'CONFLICT',
        });
    });

    it('rejects banned members requesting to join', async () => {
        const { service } = createService({
            existingMember: member({ status: GroupMemberStatus.BANNED }),
        });

        await expect(
            service.requestJoin('user_1', 'group_1'),
        ).rejects.toMatchObject({
            statusCode: 403,
            code: 'FORBIDDEN',
        });
    });

    it('allows rejected members to request again', async () => {
        const existingMember = member({ status: GroupMemberStatus.REJECTED });
        const { service, groupRepo } = createService({ existingMember });

        const result = await service.requestJoin('user_1', 'group_1');

        expect(result.status).toBe(GroupMemberStatus.PENDING);
        expect(groupRepo.updateMemberStatus).toHaveBeenCalledWith({
            memberId: existingMember.id,
            status: GroupMemberStatus.PENDING,
        });
    });

    it('approves pending join requests and assigns member role', async () => {
        const pendingMember = member({
            id: 'member_2',
            status: GroupMemberStatus.PENDING,
        });
        const { service, permissionService, permissionRepo } = createService({
            existingMember: pendingMember,
        });

        const result = await service.reviewJoinRequest(
            'owner_1',
            'group_1',
            'user_1',
            {
                decision: 'APPROVE',
            },
        );

        expect(permissionService.can).toHaveBeenCalledWith(
            'owner_1',
            GroupPermissionKey.GROUP_MEMBER_APPROVE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );
        expect(result.status).toBe(GroupMemberStatus.ACTIVE);
        expect(permissionRepo.assignRole).toHaveBeenCalledWith(
            { groupId: 'group_1', memberId: 'member_2', roleName: 'member' },
            {},
        );
    });

    it('rejects review without permission', async () => {
        const { service } = createService({ permissionAllowed: false });

        await expect(
            service.reviewJoinRequest('user_2', 'group_1', 'user_1', {
                decision: 'APPROVE',
            }),
        ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('rejects review for non-pending memberships', async () => {
        const { service } = createService({
            existingMember: member({ status: GroupMemberStatus.ACTIVE }),
        });

        await expect(
            service.reviewJoinRequest('owner_1', 'group_1', 'user_1', {
                decision: 'REJECT',
            }),
        ).rejects.toMatchObject({
            statusCode: 422,
            code: 'UNPROCESSABLE_ENTITY',
        });
    });
});

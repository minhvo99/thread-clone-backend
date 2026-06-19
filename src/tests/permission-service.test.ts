import { describe, expect, it, vi } from 'vitest';
import { GroupMemberStatus } from '../generated/prisma/enums.ts';
import {
    GROUP_ROLE_SEEDS,
    GroupPermissionKey,
} from '../models/permission.model.ts';
import type { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import {
    PermissionService,
    seedDefaultGroupRoles,
} from '../services/permission.service.ts';

function createRepositoryMock(
    context: Awaited<
        ReturnType<CommunityGroupPermissionRepository['findPermissionContext']>
    >,
): CommunityGroupPermissionRepository {
    return {
        findPermissionContext: vi.fn().mockResolvedValue(context),
        seedGroupRoles: vi.fn(),
        assignRole: vi.fn(),
    } as unknown as CommunityGroupPermissionRepository;
}

describe('PermissionService', () => {
    it('denies missing authenticated users', async () => {
        const repo = createRepositoryMock({ groupExists: true, member: null });
        const service = new PermissionService(repo);

        const decision = await service.can(
            null,
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({
            allowed: false,
            reason: 'NOT_AUTHENTICATED',
        });
    });

    it('denies when the group does not exist', async () => {
        const repo = createRepositoryMock({ groupExists: false, member: null });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({
            allowed: false,
            reason: 'RESOURCE_NOT_FOUND',
        });
    });

    it('denies non-members', async () => {
        const repo = createRepositoryMock({ groupExists: true, member: null });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({ allowed: false, reason: 'NOT_MEMBER' });
    });

    it('denies pending members', async () => {
        const repo = createRepositoryMock({
            groupExists: true,
            member: {
                id: 'member_1',
                status: GroupMemberStatus.PENDING,
                permissionKeys: [GroupPermissionKey.GROUP_POST_CREATE],
            },
        });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({
            allowed: false,
            reason: 'MEMBERSHIP_PENDING',
        });
    });

    it('denies banned members', async () => {
        const repo = createRepositoryMock({
            groupExists: true,
            member: {
                id: 'member_1',
                status: GroupMemberStatus.BANNED,
                permissionKeys: [GroupPermissionKey.GROUP_POST_CREATE],
            },
        });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_POST_CREATE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({ allowed: false, reason: 'BANNED' });
    });

    it('denies active members missing the requested permission', async () => {
        const repo = createRepositoryMock({
            groupExists: true,
            member: {
                id: 'member_1',
                status: GroupMemberStatus.ACTIVE,
                permissionKeys: [GroupPermissionKey.GROUP_COMMENT_CREATE],
            },
        });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_MEMBER_APPROVE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({
            allowed: false,
            reason: 'MISSING_PERMISSION',
        });
    });

    it('allows active members with the requested permission', async () => {
        const repo = createRepositoryMock({
            groupExists: true,
            member: {
                id: 'member_1',
                status: GroupMemberStatus.ACTIVE,
                permissionKeys: [GroupPermissionKey.GROUP_MEMBER_APPROVE],
            },
        });
        const service = new PermissionService(repo);

        const decision = await service.can(
            'user_1',
            GroupPermissionKey.GROUP_MEMBER_APPROVE,
            { resourceType: 'community_group', resourceId: 'group_1' },
        );

        expect(decision).toEqual({ allowed: true });
    });

    it('seeds the expected default role permissions', async () => {
        const repo = createRepositoryMock({ groupExists: true, member: null });

        await seedDefaultGroupRoles({ groupId: 'group_1', repository: repo });

        expect(repo.seedGroupRoles).toHaveBeenCalledWith({
            groupId: 'group_1',
            roles: GROUP_ROLE_SEEDS,
        });
        expect(
            GROUP_ROLE_SEEDS.find((role) => role.name === 'owner')?.permissions,
        ).toEqual(Object.values(GroupPermissionKey));
        expect(
            GROUP_ROLE_SEEDS.find((role) => role.name === 'member')
                ?.permissions,
        ).toEqual([
            GroupPermissionKey.GROUP_POST_CREATE,
            GroupPermissionKey.GROUP_COMMENT_CREATE,
            GroupPermissionKey.GROUP_REACTION_CREATE,
        ]);
    });
});

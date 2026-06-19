import { GroupMemberStatus } from '../generated/prisma/enums.ts';
import type { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import {
    GROUP_ROLE_SEEDS,
    type GroupPermissionKey,
    type PermissionDecision,
    type PermissionResource,
} from '../models/permission.model.ts';

export class PermissionService {
    constructor(
        private readonly groupPermissionRepo: CommunityGroupPermissionRepository,
    ) {}

    async can(
        userId: string | null | undefined,
        action: GroupPermissionKey,
        resource: PermissionResource,
    ): Promise<PermissionDecision> {
        if (!userId) {
            return { allowed: false, reason: 'NOT_AUTHENTICATED' };
        }

        if (resource.resourceType !== 'community_group') {
            return { allowed: false, reason: 'RESOURCE_NOT_FOUND' };
        }

        const context = await this.groupPermissionRepo.findPermissionContext({
            groupId: resource.resourceId,
            userId,
        });

        if (!context.groupExists) {
            return { allowed: false, reason: 'RESOURCE_NOT_FOUND' };
        }

        if (!context.member) {
            return { allowed: false, reason: 'NOT_MEMBER' };
        }

        if (context.member.status === GroupMemberStatus.PENDING) {
            return { allowed: false, reason: 'MEMBERSHIP_PENDING' };
        }

        if (context.member.status === GroupMemberStatus.BANNED) {
            return { allowed: false, reason: 'BANNED' };
        }

        if (context.member.status !== GroupMemberStatus.ACTIVE) {
            return { allowed: false, reason: 'NOT_MEMBER' };
        }

        if (!context.member.permissionKeys.includes(action)) {
            return { allowed: false, reason: 'MISSING_PERMISSION' };
        }

        return { allowed: true };
    }
}

export async function seedDefaultGroupRoles(params: {
    groupId: string;
    repository: CommunityGroupPermissionRepository;
}): Promise<void> {
    await params.repository.seedGroupRoles({
        groupId: params.groupId,
        roles: GROUP_ROLE_SEEDS,
    });
}

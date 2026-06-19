import { GroupMemberStatus } from '../generated/prisma/enums.ts';
import type {
    CommunityGroup,
    CommunityGroupMember,
    Prisma,
} from '../generated/prisma/client.ts';
import type {
    CreateCommunityGroupInput,
    ReviewJoinRequestInput,
} from '../dtos/community-group.dto.ts';
import {
    conflict,
    forbidden,
    notFound,
    unprocessable,
} from '../lib/api-error.ts';
import {
    GROUP_ROLE_SEEDS,
    GroupPermissionKey,
} from '../models/permission.model.ts';
import type { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import type { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import type { PermissionService } from './permission.service.ts';

export type CreateCommunityGroupResult = {
    group: CommunityGroup;
    membership: CommunityGroupMember;
};

export class CommunityGroupService {
    constructor(
        private readonly groupRepo: CommunityGroupRepository,
        private readonly permissionRepo: CommunityGroupPermissionRepository,
        private readonly permissionService: PermissionService,
    ) {}

    async createGroup(
        actorId: string,
        input: CreateCommunityGroupInput,
    ): Promise<CreateCommunityGroupResult> {
        return this.groupRepo.transaction(async (tx) => {
            const group = await this.groupRepo.create(
                {
                    ownerId: actorId,
                    name: input.name,
                    slug: input.slug,
                    description: input.description,
                    visibility: input.visibility,
                },
                tx,
            );

            const membership = await this.groupRepo.createMember(
                {
                    groupId: group.id,
                    userId: actorId,
                    status: GroupMemberStatus.ACTIVE,
                },
                tx,
            );

            await this.permissionRepo.seedGroupRoles(
                { groupId: group.id, roles: GROUP_ROLE_SEEDS },
                tx,
            );
            await this.permissionRepo.assignRole(
                {
                    groupId: group.id,
                    memberId: membership.id,
                    roleName: 'owner',
                },
                tx,
            );

            return { group, membership };
        });
    }

    async requestJoin(
        actorId: string,
        groupId: string,
    ): Promise<CommunityGroupMember> {
        const group = await this.groupRepo.findById(groupId);

        if (!group) {
            throw notFound('Community group not found');
        }

        const existingMember = await this.groupRepo.findMember({
            groupId,
            userId: actorId,
        });

        if (!existingMember) {
            return this.groupRepo.createMember({
                groupId,
                userId: actorId,
                status: GroupMemberStatus.PENDING,
            });
        }

        if (existingMember.status === GroupMemberStatus.BANNED) {
            throw forbidden('You cannot request to join this group');
        }

        if (existingMember.status === GroupMemberStatus.ACTIVE) {
            throw conflict('You are already a group member');
        }

        if (existingMember.status === GroupMemberStatus.PENDING) {
            throw conflict('Join request already exists');
        }

        return this.groupRepo.updateMemberStatus({
            memberId: existingMember.id,
            status: GroupMemberStatus.PENDING,
        });
    }

    async reviewJoinRequest(
        actorId: string,
        groupId: string,
        targetUserId: string,
        input: ReviewJoinRequestInput,
    ): Promise<CommunityGroupMember> {
        const decision = await this.permissionService.can(
            actorId,
            GroupPermissionKey.GROUP_MEMBER_APPROVE,
            { resourceType: 'community_group', resourceId: groupId },
        );

        if (!decision.allowed) {
            if (decision.reason === 'RESOURCE_NOT_FOUND') {
                throw notFound('Community group not found');
            }

            throw forbidden('Missing permission to review join requests');
        }

        const member = await this.groupRepo.findMember({
            groupId,
            userId: targetUserId,
        });

        if (!member) {
            throw notFound('Join request not found');
        }

        if (member.status !== GroupMemberStatus.PENDING) {
            throw unprocessable('Join request is not pending');
        }

        return this.groupRepo.transaction(
            async (tx: Prisma.TransactionClient) => {
                const nextStatus =
                    input.decision === 'APPROVE' ?
                        GroupMemberStatus.ACTIVE
                    :   GroupMemberStatus.REJECTED;
                const updatedMember = await this.groupRepo.updateMemberStatus(
                    { memberId: member.id, status: nextStatus },
                    tx,
                );

                if (input.decision === 'APPROVE') {
                    await this.permissionRepo.assignRole(
                        { groupId, memberId: member.id, roleName: 'member' },
                        tx,
                    );
                }

                return updatedMember;
            },
        );
    }
}

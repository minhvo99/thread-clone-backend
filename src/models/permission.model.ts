export const GroupPermissionKey = {
  GROUP_UPDATE: 'group.update',
  GROUP_DELETE: 'group.delete',
  GROUP_MEMBER_INVITE: 'group.member.invite',
  GROUP_MEMBER_APPROVE: 'group.member.approve',
  GROUP_MEMBER_REMOVE: 'group.member.remove',
  GROUP_ROLE_ASSIGN: 'group.role.assign',
  GROUP_TOPIC_CREATE: 'group.topic.create',
  GROUP_TOPIC_UPDATE: 'group.topic.update',
  GROUP_POST_CREATE: 'group.post.create',
  GROUP_POST_DELETE: 'group.post.delete',
  GROUP_COMMENT_CREATE: 'group.comment.create',
  GROUP_REACTION_CREATE: 'group.reaction.create',
} as const;

export type GroupPermissionKey =
  (typeof GroupPermissionKey)[keyof typeof GroupPermissionKey];

export const GROUP_PERMISSION_KEYS = Object.values(GroupPermissionKey);

export type PermissionDenyReason =
  | 'NOT_AUTHENTICATED'
  | 'RESOURCE_NOT_FOUND'
  | 'NOT_MEMBER'
  | 'MEMBERSHIP_PENDING'
  | 'BANNED'
  | 'MISSING_PERMISSION'
  | 'PRIVATE_RESOURCE';

export type PermissionDecision = {
  allowed: boolean;
  reason?: PermissionDenyReason;
};

export type PermissionResource = {
  resourceType: 'community_group';
  resourceId: string;
};

export type GroupRoleName = 'owner' | 'admin' | 'moderator' | 'member';

export type GroupRoleSeed = {
  name: GroupRoleName;
  permissions: readonly GroupPermissionKey[];
};

export const GROUP_ROLE_SEEDS: readonly GroupRoleSeed[] = [
  {
    name: 'owner',
    permissions: GROUP_PERMISSION_KEYS,
  },
  {
    name: 'admin',
    permissions: [
      GroupPermissionKey.GROUP_UPDATE,
      GroupPermissionKey.GROUP_MEMBER_INVITE,
      GroupPermissionKey.GROUP_MEMBER_APPROVE,
      GroupPermissionKey.GROUP_MEMBER_REMOVE,
      GroupPermissionKey.GROUP_TOPIC_CREATE,
      GroupPermissionKey.GROUP_TOPIC_UPDATE,
      GroupPermissionKey.GROUP_POST_CREATE,
      GroupPermissionKey.GROUP_POST_DELETE,
      GroupPermissionKey.GROUP_COMMENT_CREATE,
      GroupPermissionKey.GROUP_REACTION_CREATE,
    ],
  },
  {
    name: 'moderator',
    permissions: [
      GroupPermissionKey.GROUP_MEMBER_APPROVE,
      GroupPermissionKey.GROUP_TOPIC_CREATE,
      GroupPermissionKey.GROUP_POST_CREATE,
      GroupPermissionKey.GROUP_POST_DELETE,
      GroupPermissionKey.GROUP_COMMENT_CREATE,
      GroupPermissionKey.GROUP_REACTION_CREATE,
    ],
  },
  {
    name: 'member',
    permissions: [
      GroupPermissionKey.GROUP_POST_CREATE,
      GroupPermissionKey.GROUP_COMMENT_CREATE,
      GroupPermissionKey.GROUP_REACTION_CREATE,
    ],
  },
];

-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GroupMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "ReactionTargetType" AS ENUM ('POST', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('SUPABASE');

-- CreateEnum
CREATE TYPE "ChatMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'MEDIA', 'SYSTEM');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "communityGroupId" TEXT,
ADD COLUMN     "globalTopicId" TEXT,
ADD COLUMN     "groupTopicId" TEXT;

-- CreateTable
CREATE TABLE "global_topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_groups" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "visibility" "GroupVisibility" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GroupMemberStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_topics" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_roles" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "group_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_member_roles" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "group_member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "ReactionTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "messageId" TEXT,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'SUPABASE',
    "bucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_members" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "chat_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_invites" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "inviteeId" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "messageType" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_reads" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_topics_slug_key" ON "global_topics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "community_groups_slug_key" ON "community_groups"("slug");

-- CreateIndex
CREATE INDEX "community_groups_ownerId_createdAt_idx" ON "community_groups"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "community_group_members_userId_status_idx" ON "community_group_members"("userId", "status");

-- CreateIndex
CREATE INDEX "community_group_members_groupId_status_idx" ON "community_group_members"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_group_members_groupId_userId_key" ON "community_group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "community_topics_groupId_createdAt_idx" ON "community_topics"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_topics_groupId_slug_key" ON "community_topics"("groupId", "slug");

-- CreateIndex
CREATE INDEX "group_roles_groupId_idx" ON "group_roles"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "group_roles_groupId_name_key" ON "group_roles"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "group_permissions_key_key" ON "group_permissions"("key");

-- CreateIndex
CREATE INDEX "group_role_permissions_permissionId_idx" ON "group_role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "group_role_permissions_roleId_permissionId_key" ON "group_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "group_member_roles_roleId_idx" ON "group_member_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "group_member_roles_memberId_roleId_key" ON "group_member_roles"("memberId", "roleId");

-- CreateIndex
CREATE INDEX "reactions_targetType_targetId_idx" ON "reactions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reactions_userId_createdAt_idx" ON "reactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reactions_userId_targetType_targetId_key" ON "reactions"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "media_ownerId_createdAt_idx" ON "media"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "media_postId_idx" ON "media"("postId");

-- CreateIndex
CREATE INDEX "media_commentId_idx" ON "media"("commentId");

-- CreateIndex
CREATE INDEX "media_messageId_idx" ON "media"("messageId");

-- CreateIndex
CREATE INDEX "chat_groups_ownerId_createdAt_idx" ON "chat_groups"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_group_members_userId_joinedAt_idx" ON "chat_group_members"("userId", "joinedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_members_chatGroupId_userId_key" ON "chat_group_members"("chatGroupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_invites_tokenHash_key" ON "chat_group_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "chat_group_invites_chatGroupId_revokedAt_expiresAt_idx" ON "chat_group_invites"("chatGroupId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "chat_group_invites_inviteeId_revokedAt_expiresAt_idx" ON "chat_group_invites"("inviteeId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatGroupId_createdAt_idx" ON "chat_messages"("chatGroupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_senderId_createdAt_idx" ON "chat_messages"("senderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_message_reads_lastReadMessageId_idx" ON "chat_message_reads"("lastReadMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_reads_chatGroupId_userId_key" ON "chat_message_reads"("chatGroupId", "userId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_createdAt_idx" ON "notifications"("recipientId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_actorId_createdAt_idx" ON "notifications"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_communityGroupId_createdAt_idx" ON "posts"("communityGroupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_globalTopicId_createdAt_idx" ON "posts"("globalTopicId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_groupTopicId_createdAt_idx" ON "posts"("groupTopicId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topics" ADD CONSTRAINT "community_topics_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_roles" ADD CONSTRAINT "group_roles_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_role_permissions" ADD CONSTRAINT "group_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_role_permissions" ADD CONSTRAINT "group_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "group_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member_roles" ADD CONSTRAINT "group_member_roles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "community_group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member_roles" ADD CONSTRAINT "group_member_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_communityGroupId_fkey" FOREIGN KEY ("communityGroupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_globalTopicId_fkey" FOREIGN KEY ("globalTopicId") REFERENCES "global_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_groupTopicId_fkey" FOREIGN KEY ("groupTopicId") REFERENCES "community_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_invites" ADD CONSTRAINT "chat_group_invites_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_invites" ADD CONSTRAINT "chat_group_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_invites" ADD CONSTRAINT "chat_group_invites_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

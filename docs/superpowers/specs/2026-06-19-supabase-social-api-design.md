# TCB Supabase Social API Design

Date: 2026-06-19

## Decision

TCB will use **Supabase PostgreSQL** as the primary database, with **Prisma** as the schema, migration, and query layer. The Express backend remains the only API surface for the frontend. Supabase is used as managed infrastructure: PostgreSQL first, Storage for MVP media, and optionally Realtime later for chat and notifications.

MongoDB Atlas is not selected for the MVP because the project already uses Prisma with PostgreSQL, and the product domain has many relational edges: users, follows, posts, comments, reactions, group membership, roles, permissions, chat membership, invites, and notifications.

## Product scope covered by this design

The MVP social API supports:

- global posts with text and media
- post topics at global and group level
- community groups with `PUBLIC` and `PRIVATE` visibility
- group join requests for public and private groups
- group posts, comments, reactions, and media
- detailed permission policy for community group actions
- chat groups separate from community groups
- chat group owner-only member invites
- chat group invite by user search or invite URL
- notifications stored in PostgreSQL
- media stored in Supabase Storage with metadata in PostgreSQL

## Architecture

All frontend requests go through the Express API. The frontend does not access the database directly.

```text
Client
  -> Express API
    -> Controller: request/response boundary
    -> DTO/Zod: input validation
    -> Service: business logic and permission checks
    -> Repository: Prisma queries
    -> Supabase PostgreSQL
```

Responsibilities:

- controllers parse requests and return responses
- DTOs validate input
- services enforce business rules and permissions
- repositories own database access
- Prisma owns schema, migrations, and generated types
- Supabase PostgreSQL stores relational data
- Supabase Storage stores media files

Supabase Auth is not used in the MVP because the project already has JWT/session-based authentication. Realtime delivery for chat messages, notifications, comments, and reactions is part of the MVP and uses the Node.js backend with the `ws` package. Supabase Realtime is not used for the MVP realtime layer; Supabase remains the managed PostgreSQL and Storage provider.

## Core database model

Existing models remain part of the system:

- `User`
- `AuthSession`
- `PasswordResetToken`
- `Post`
- `Comment`
- `Like` initially, later generalized to `Reaction`
- `Follow`

### Users and auth

`UserRole` remains global and simple:

- `USER`
- `ADMIN`

Global roles are used for app-level administration only. MVP group permissions are not modeled as global roles.

### Posts, comments, reactions, and media

`Post` supports both global posts and group posts.

Recommended fields:

- `authorId`
- `content`
- `communityGroupId?`
- `globalTopicId?`
- `groupTopicId?`
- timestamps

Rules:

- a global post has no `communityGroupId`
- a group post has `communityGroupId`
- a group post may have `groupTopicId`
- a global post may have `globalTopicId`
- MVP should avoid cross-posting a single post into both global and group topic contexts

`Comment` belongs to a post and author.

`Like` should evolve into `Reaction` to support multiple emotion types.

Recommended `Reaction` fields:

- `targetType`: `POST` or `COMMENT`
- `targetId`
- `userId`
- `type`: `LIKE`, `LOVE`, `HAHA`, `SAD`, `ANGRY`, etc.
- timestamps

`Media` stores metadata only. The actual file is stored in Supabase Storage.

Recommended `Media` fields:

- `ownerId`
- `postId?`
- `commentId?`
- `messageId?`
- `storageProvider`: `SUPABASE`
- `bucket`
- `storagePath`
- `mimeType`
- `sizeBytes`
- `width?`
- `height?`
- `durationMs?`
- timestamps

The canonical file reference is `bucket + storagePath`, not a public URL.

### Topics

TCB has both global topics and group topics.

`GlobalTopic`:

- used by global posts and discovery feeds
- has unique slug/name
- managed by global admins

`CommunityTopic`:

- belongs to one community group
- used by posts inside that group
- has unique `(groupId, slug)`

If a post has `groupTopicId`, that topic must belong to the post's `communityGroupId`.

### Community groups

Community groups are separate from chat groups.

`CommunityGroup` fields:

- `ownerId`
- `name`
- `slug`
- `description`
- `avatarUrl?`
- `coverUrl?`
- `visibility`: `PUBLIC` or `PRIVATE`
- timestamps

`CommunityGroupMember` fields:

- `groupId`
- `userId`
- `status`: `PENDING`, `ACTIVE`, `REJECTED`, `BANNED`, `LEFT`
- timestamps
- unique `(groupId, userId)`

Visibility rules:

- `PUBLIC`: non-members can view group profile, read posts, and view public group media. Non-members cannot create posts, comment, react, or perform administrative actions.
- `PRIVATE`: non-members can view only minimal group profile data and can request to join. Non-members cannot read posts, view post media, comment, react, or perform administrative actions.

Both public and private groups allow join requests.

A join request can be represented by `CommunityGroupMember.status = PENDING`.

### Community group permissions

Community groups use detailed permission policy.

Recommended tables:

- `GroupRole`
- `GroupPermission`
- `GroupRolePermission`
- `GroupMemberRole`

`GroupRole` fields:

- `groupId`
- `name`
- `isSystem`
- timestamps

`GroupPermission` fields:

- `key`
- `description`

`GroupRolePermission` links roles to permissions.

`GroupMemberRole` links an active group member to one or more roles.

Seeded roles:

- `owner`
- `admin`
- `moderator`
- `member`

Initial permission keys:

- `group.update`
- `group.delete`
- `group.member.invite`
- `group.member.approve`
- `group.member.remove`
- `group.role.assign`
- `group.topic.create`
- `group.topic.update`
- `group.post.create`
- `group.post.delete`
- `group.comment.create`
- `group.reaction.create`

`CommunityGroupMember.status` must be `ACTIVE` before role permissions have effect.

### Chat groups

Chat groups are separate from community groups.

`ChatGroup` fields:

- `ownerId`
- `name`
- `avatarUrl?`
- timestamps

`ChatGroupMember` fields:

- `chatGroupId`
- `userId`
- `role`: `OWNER` or `MEMBER`
- `joinedAt`
- `leftAt?`
- unique `(chatGroupId, userId)`

`ChatGroupInvite` fields:

- `chatGroupId`
- `createdById`
- `inviteeId?`
- `tokenHash?`
- `expiresAt`
- `usedAt?`
- `revokedAt?`
- timestamps

`ChatMessage` fields:

- `chatGroupId`
- `senderId`
- `content?`
- `messageType`: `TEXT`, `MEDIA`, or `SYSTEM`
- `deletedAt?`
- timestamps

`ChatMessageRead` can store a last-read pointer per user and chat group.

Recommended fields:

- `chatGroupId`
- `userId`
- `lastReadMessageId`
- `readAt`
- unique `(chatGroupId, userId)`

Chat group MVP rules:

- only owner can invite members
- owner can invite by user search or invite URL
- owner can revoke invite URLs
- member can read and send messages
- non-member cannot see the chat group or messages

Invite URLs should store `tokenHash`, not the raw token. The raw token is returned only once when the URL is created.

### Notifications

Notifications are stored in PostgreSQL first. Realtime delivery can be added later.

Recommended `Notification` fields:

- `recipientId`
- `actorId?`
- `type`
- `entityType`
- `entityId`
- `data` JSONB
- `readAt?`
- `createdAt`

Notification events include:

- group join request created
- group join request approved or rejected
- comment on post
- reaction on post or comment
- chat group invite
- chat message notification if needed

## Permission rules

### Global app permissions

Global app permissions stay simple:

- authenticated users can create global posts
- authenticated users can comment/react to global posts
- authors can edit/delete their own content where supported
- `ADMIN` can be used for app-wide moderation later

### Community group permissions

Community group services call a dedicated permission service:

```ts
PermissionService.can(userId, action, {
  resourceType: 'community_group',
  resourceId: groupId,
})
```

Before checking a permission key, the service checks:

- user exists and is active
- group exists
- member exists
- membership status is `ACTIVE`
- user is not banned
- member has a role containing the requested permission

Permission decisions should return a reason, not only a boolean.

Recommended deny reasons:

- `NOT_AUTHENTICATED`
- `RESOURCE_NOT_FOUND`
- `NOT_MEMBER`
- `MEMBERSHIP_PENDING`
- `BANNED`
- `MISSING_PERMISSION`
- `PRIVATE_RESOURCE`

### Public group rules

Non-members can:

- view group profile
- read group posts
- view media attached to visible posts
- request to join

Non-members cannot:

- create group posts
- comment
- react
- upload media into the group
- perform administrative actions

### Private group rules

Non-members can:

- view minimal group profile
- request to join

Non-members cannot:

- read posts
- view post media
- comment
- react
- upload media into the group
- perform administrative actions

Private group content should return `404` to unauthorized users where hiding existence is safer.

### Join request rules

Both public and private groups support join requests.

Flow:

1. user requests to join
2. if no membership exists, create `PENDING`
3. if previous status is `LEFT` or `REJECTED`, change to `PENDING`
4. if status is `BANNED`, deny
5. a user with `group.member.approve` approves or rejects
6. approve changes status to `ACTIVE`
7. reject changes status to `REJECTED`
8. approved members receive the default `member` role if they do not already have a role

### Suggested role permissions

`owner` has all initial permissions.

`admin` should have:

- `group.update`
- `group.member.invite`
- `group.member.approve`
- `group.member.remove`
- `group.topic.create`
- `group.topic.update`
- `group.post.create`
- `group.post.delete`
- `group.comment.create`
- `group.reaction.create`

`admin` should not have by default:

- `group.delete`
- `group.role.assign`

`moderator` should have:

- `group.member.approve`
- `group.topic.create`
- `group.post.create`
- `group.post.delete`
- `group.comment.create`
- `group.reaction.create`

`member` should have:

- `group.post.create`
- `group.comment.create`
- `group.reaction.create`

### Chat group rules

Chat groups use fixed MVP rules rather than the detailed community group permission policy.

Owner can:

- invite user by search
- create invite URL
- revoke invite URL
- remove members
- change chat group name/avatar
- read and send messages

Member can:

- read messages
- send messages
- leave the chat group

Member cannot:

- invite users
- create invite URL
- remove members
- change chat group settings

Non-member cannot:

- view chat group
- view messages
- send messages
- view member list

## Data flows

### Create community group

```text
POST /community-groups
  -> validate name, slug, visibility
  -> create CommunityGroup
  -> create ACTIVE CommunityGroupMember for creator
  -> seed group roles and role permissions
  -> assign owner role to creator
```

This must run in a transaction.

### Request to join group

```text
POST /community-groups/:groupId/join-requests
  -> load group
  -> deny if banned
  -> return conflict if already active or already pending
  -> create or update membership to PENDING
  -> notify users who can approve
```

### Approve or reject join request

```text
PATCH /community-groups/:groupId/join-requests/:userId
  -> check group.member.approve
  -> update membership status
  -> assign default member role on approve
  -> notify requester
```

This should run in a transaction.

### Create group post

```text
POST /community-groups/:groupId/posts
  -> validate content, media, topic
  -> check group.post.create
  -> verify groupTopicId belongs to group if provided
  -> create Post with communityGroupId
  -> attach Media records if provided
```

### Read group posts

```text
GET /community-groups/:groupId/posts
  -> load group visibility
  -> if PUBLIC, allow read
  -> if PRIVATE, require ACTIVE membership
  -> cursor paginate by createdAt desc
```

### Comment or react to a post

For group posts:

```text
POST /posts/:postId/comments
  -> load post and group
  -> check group.comment.create
  -> create comment
  -> notify post author
```

For global posts, authenticated user is enough.

Reactions follow the same pattern with `group.reaction.create` for group posts.

### Create global post

```text
POST /posts
  -> require authentication
  -> validate content, media, globalTopicId
  -> verify globalTopicId exists if provided
  -> create Post without communityGroupId
  -> attach Media records if provided
```

### Read global feed

```text
GET /posts/feed
  -> require authentication
  -> optional filter by globalTopicId
  -> cursor paginate by createdAt desc
```

Guests cannot view app content.

### Create chat group

```text
POST /chat-groups
  -> validate name
  -> create ChatGroup with ownerId
  -> create ChatGroupMember role OWNER
```

### Invite chat member by search

```text
POST /chat-groups/:id/invites
  -> require actor is chat owner
  -> find invitee by username/display name/email according to API design
  -> create ChatGroupInvite with inviteeId
  -> notify invitee
```

### Create chat invite URL

```text
POST /chat-groups/:id/invite-links
  -> require actor is chat owner
  -> generate raw token
  -> save tokenHash and expiresAt
  -> return URL containing raw token once
```

MVP should use multi-use invite links with expiry and revoke support unless the product later requires single-use links.

### Join chat group by invite URL

```text
POST /chat-groups/join-by-invite
  -> hash token
  -> find valid non-revoked invite
  -> if already member, return current membership
  -> create ChatGroupMember role MEMBER
```

### Send chat message

```text
POST /chat-groups/:id/messages
  -> require active chat membership
  -> validate content/media
  -> create ChatMessage
  -> attach Media records if provided
  -> create notifications for other members if needed
  -> publish `chat.message.created` to `chat_group:{chatGroupId}` over WebSocket
  -> publish `notification.created` to `user:{recipientId}` over WebSocket for affected recipients
```

The HTTP API remains the source of truth for message creation and persistence. WebSocket delivery is a realtime fan-out after the database write succeeds. If WebSocket delivery fails, clients recover by reading message history and notifications over HTTP.

### Read chat messages

```text
GET /chat-groups/:id/messages
  -> require chat membership
  -> cursor paginate by createdAt/id
```

### Mark chat read

```text
PATCH /chat-groups/:id/read
  -> require chat membership
  -> update ChatMessageRead lastReadMessageId/readAt
```

### Notifications

Notifications are created in the service layer, not controllers.

MVP notification persistence and recovery use HTTP:

```text
GET /notifications?cursor=...
PATCH /notifications/:id/read
```

MVP realtime notification delivery uses WebSocket with the `ws` package. After a notification row is created successfully, the service publishes `notification.created` to `user:{recipientId}`. WebSocket delivery is best-effort; the database row is authoritative and clients can recover missed events by polling `GET /notifications?cursor=...`.

## Realtime WebSocket layer

The MVP realtime layer uses the `ws` package in the Node.js 22 backend. The Express API remains responsible for validation, authorization, persistence, and response formatting. WebSocket connections are used for server-to-client delivery of events after successful database writes.

Connection flow:

```text
Client opens WebSocket /realtime with auth token
  -> server verifies the same JWT/session identity used by HTTP auth middleware
  -> server attaches userId to the socket
  -> client subscribes to allowed channels
  -> server publishes events to subscribed sockets after service-layer writes commit
```

Initial channel names:

- `user:{userId}` for notifications and user-scoped events
- `chat_group:{chatGroupId}` for chat group messages
- `post:{postId}` for post comments and reactions
- `community_group:{groupId}` for group-level events if later needed

Initial event types:

- `chat.message.created`
- `notification.created`
- `post.comment.created`
- `post.reaction.upserted`

Subscription rules:

- a user can subscribe to `user:{userId}` only for their own user id
- a user can subscribe to `chat_group:{chatGroupId}` only when they are an active chat group member
- a user can subscribe to `post:{postId}` only if they can read the post; public group posts are readable by non-members, private group posts require active membership
- invalid subscription requests are rejected without closing the socket unless the token is invalid

Write path rules:

- HTTP handlers remain the command path for comments, reactions, notifications, and chat messages
- service methods publish realtime events only after the database write succeeds
- failed WebSocket delivery must not roll back the database write
- event payloads should include stable IDs and minimal metadata, not full private message bodies unless the recipient is authorized for that channel

## Media storage

MVP media files are uploaded to **Supabase Storage**.

Use a private bucket named `media`.

Recommended paths:

```text
users/{userId}/avatar/{fileId}.jpg
posts/{postId}/{fileId}.jpg
comments/{commentId}/{fileId}.jpg
chat-groups/{chatGroupId}/messages/{messageId}/{fileId}.jpg
temp/{userId}/{uploadId}/{fileName}
```

The bucket should not be public because private groups and chat messages must not expose files to anyone with a URL.

The backend checks permission before returning a signed URL.

Recommended MVP upload flow:

```text
Client multipart upload -> Express API
  -> authenticate user
  -> validate context permission
  -> validate file type and size
  -> upload to Supabase Storage
  -> save Media metadata in PostgreSQL
```

If the database save fails after storage upload succeeds, the backend should attempt to delete the uploaded object. If cleanup fails, log it for later cleanup.

Initial media limits for free tier should be conservative:

- images: max 5 MB per file
- video: max 50 MB per file or lower
- media per post: 4 images or 1 video
- allow only explicit MIME types

Later, the system can switch to signed upload URLs or move storage to Cloudflare R2, S3, or Cloudinary without changing the core `Media` metadata model.

## Error handling

Use a consistent error response:

```json
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group not found"
  }
}
```

Validation errors include details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request input",
    "details": [
      {
        "path": "visibility",
        "message": "Invalid option"
      }
    ]
  }
}
```

HTTP status mapping:

- `401 Unauthorized`: missing or invalid authentication
- `403 Forbidden`: authenticated but lacks permission
- `404 Not Found`: resource does not exist or should be hidden from unauthorized users
- `409 Conflict`: duplicate or incompatible state
- `413 Payload Too Large`: media file too large
- `422 Unprocessable Entity`: valid format but invalid domain logic
- `500 Internal Server Error`: unexpected server error
- `502 Bad Gateway`: external storage/provider failure when appropriate

Examples:

- non-member comment in public group -> `403`
- non-member read private group post -> `404`
- normal member invite chat user -> `403`
- duplicate join request -> `409`
- group topic from another group -> `422`
- file too large -> `413`

Do not return stack traces to clients.

Do not log passwords, JWTs, refresh tokens, raw invite tokens, signed URLs, or private message content unless explicitly needed for debugging and scrubbed.

## Testing strategy

### Schema and migration tests

Verify constraints and relationships:

- unique group slug
- unique membership `(groupId, userId)`
- unique chat membership `(chatGroupId, userId)`
- unique group topic `(groupId, slug)`
- reaction uniqueness if implemented
- cascade behavior for group, post, comment, media, and chat entities

Integration tests should use a test PostgreSQL database, not production Supabase.

### PermissionService tests

Community group cases:

- public group non-member can read posts
- public group non-member cannot comment/react/post
- private group non-member cannot read posts
- pending member cannot interact
- banned member cannot request join
- member with `group.post.create` can create post
- member without permission is denied
- user with `group.member.approve` can approve request
- user without `group.member.approve` cannot approve request

Chat group cases:

- owner can invite
- member cannot invite
- non-member cannot read messages
- member can read and send messages

### Service integration tests

Group workflow:

1. create group
2. assign owner role
3. another user requests join
4. permitted user approves request
5. approved user creates post/comment/reaction

Visibility workflow:

- public group non-member reads posts
- private group non-member cannot read posts
- public group non-member comment returns `403`
- private group non-member post read returns `404`

Topic workflow:

- global post with global topic succeeds
- group post with group topic succeeds
- group post using a topic from another group returns `422`

Chat workflow:

- owner creates chat group
- owner invites user
- user accepts invite
- member sends message
- non-member reading message returns `404`

Media workflow:

- upload media to allowed post succeeds
- upload to private group post without permission fails
- unsupported MIME type fails
- oversized file fails
- signed URL is returned only when user has read permission

### API route tests

Verify route-level behavior:

- missing auth returns `401`
- invalid body returns validation error
- duplicate join request returns `409`
- missing permission returns `403`
- hidden private resource returns `404`
- success response shape is consistent

### Manual smoke tests

Before shipping MVP:

- register/login
- create public group
- create private group
- request join public/private group
- approve request
- create post with image
- public group non-member can read but cannot comment/react
- private group non-member cannot read
- create chat group
- owner invites by username
- owner creates invite URL
- member sends message
- notification appears

### CI quality gates

Before merge:

```bash
npm run lint
npm run prettier
npm run build
npm test
```

For schema changes:

```bash
npm run prisma:migrate:dev
npm run prisma:generate
```

## Implementation order recommendation

1. add schema for topics, community groups, group memberships, roles, permissions, and media
2. implement PermissionService and group permission seed logic
3. implement community group create/join/approve flows
4. implement group post read/create/comment/reaction flows
5. implement media upload to private Supabase Storage bucket
6. implement global topics and global feed filters
7. implement chat group create/invite/join/message flows
8. implement notifications and polling APIs
9. add realtime delivery later if needed

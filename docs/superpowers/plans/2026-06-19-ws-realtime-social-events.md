# WS Realtime Social Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ws`-based realtime layer for chat messages, notifications, comments, and reactions while keeping HTTP APIs as the persistence/source-of-truth path.

**Architecture:** Express HTTP controllers continue to validate requests, call services, persist through Prisma repositories, and return responses. A new WebSocket runtime authenticates sockets, authorizes channel subscriptions, tracks in-memory channel membership, and publishes compact events after service-layer writes succeed. WebSocket delivery is best-effort; PostgreSQL remains authoritative and HTTP history/polling APIs recover missed events.

**Tech Stack:** Node.js 22, Express 5, TypeScript strict mode, Prisma/PostgreSQL, `ws`, Vitest, Zod.

## Global Constraints

- Use the `ws` package for MVP realtime WebSocket delivery.
- Do not use Supabase Realtime for the MVP realtime layer.
- HTTP remains the command/write path for chat messages, comments, reactions, notifications, and invite management.
- WebSocket publishes only after a database write succeeds.
- WebSocket delivery failure must not roll back a successful database write.
- Channel names are exactly `user:{userId}`, `chat_group:{chatGroupId}`, `post:{postId}`, and optionally `community_group:{groupId}`.
- Initial event types are exactly `chat.message.created`, `notification.created`, `post.comment.created`, and `post.reaction.upserted`.
- Use constructor injection for services and realtime publisher dependencies.
- Use `pnpm` and scripts that exist in `package.json`: `pnpm run lint`, `pnpm run build`, `pnpm test -- run`.

---

## File Structure

- Modify `package.json` and `pnpm-lock.yaml`: add `ws` runtime dependency and `@types/ws` dev dependency.
- Create `src/realtime/realtime.types.ts`: event, channel, client message, and publisher interfaces.
- Create `src/realtime/realtime-hub.ts`: in-memory channel membership and best-effort publish operations.
- Create `src/realtime/realtime-auth.ts`: WebSocket token parsing and JWT verification using the same JWT secret and payload shape as HTTP auth middleware.
- Create `src/realtime/realtime-subscriptions.ts`: channel parsing and subscription authorization.
- Create `src/realtime/realtime-server.ts`: attach `ws` server to the Node HTTP server and route socket messages.
- Modify `src/index.ts`: create HTTP server explicitly and attach realtime server before listening.
- Modify service files that create realtime events: `src/services/post.service.ts`, later `src/services/chat-group.service.ts`, and notification service when added.
- Add tests under `src/tests/realtime-*.test.ts` and update existing service tests to assert publisher calls.

---

### Task 1: Add `ws` dependency and realtime types

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/realtime/realtime.types.ts`
- Test: `src/tests/realtime-hub.test.ts`

**Interfaces:**
- Produces: `RealtimeChannel`, `RealtimeEvent`, `RealtimePublisher`, `RealtimeClientMessage`.

- [ ] **Step 1: Install dependencies**

Run:

```bash
pnpm add ws
pnpm add -D @types/ws
```

Expected: `package.json` contains `"ws"` in dependencies and `"@types/ws"` in devDependencies.

- [ ] **Step 2: Write the failing type/hub test**

Create `src/tests/realtime-hub.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { RealtimeHub } from '../realtime/realtime-hub.js';

function socket() {
    return {
        readyState: 1,
        send: vi.fn(),
    };
}

describe('RealtimeHub', () => {
    it('publishes events to sockets subscribed to a channel', () => {
        const hub = new RealtimeHub();
        const client = socket();

        hub.subscribe(client, 'post:post_1');
        hub.publish({
            type: 'post.comment.created',
            channel: 'post:post_1',
            data: { commentId: 'comment_1' },
        });

        expect(client.send).toHaveBeenCalledWith(
            JSON.stringify({
                type: 'post.comment.created',
                channel: 'post:post_1',
                data: { commentId: 'comment_1' },
            }),
        );
    });
});
```

- [ ] **Step 3: Run test to verify RED**

Run:

```bash
pnpm test -- run src/tests/realtime-hub.test.ts
```

Expected: FAIL because `../realtime/realtime-hub.js` does not exist.

- [ ] **Step 4: Create realtime types**

Create `src/realtime/realtime.types.ts`:

```ts
export type RealtimeChannel =
    | `user:${string}`
    | `chat_group:${string}`
    | `post:${string}`
    | `community_group:${string}`;

export type RealtimeEventType =
    | 'chat.message.created'
    | 'notification.created'
    | 'post.comment.created'
    | 'post.reaction.upserted';

export type RealtimeEvent = {
    type: RealtimeEventType;
    channel: RealtimeChannel;
    data: Record<string, unknown>;
};

export type RealtimePublisher = {
    publish(event: RealtimeEvent): void;
};

export type RealtimeClientMessage =
    | { type: 'subscribe'; channel: RealtimeChannel }
    | { type: 'unsubscribe'; channel: RealtimeChannel };
```

- [ ] **Step 5: Create minimal hub implementation**

Create `src/realtime/realtime-hub.ts`:

```ts
import type { RealtimeChannel, RealtimeEvent, RealtimePublisher } from './realtime.types.js';

type SendableSocket = {
    readyState: number;
    send(data: string): void;
};

const OPEN = 1;

export class RealtimeHub implements RealtimePublisher {
    private readonly subscribers = new Map<RealtimeChannel, Set<SendableSocket>>();

    subscribe(socket: SendableSocket, channel: RealtimeChannel): void {
        const sockets = this.subscribers.get(channel) ?? new Set<SendableSocket>();
        sockets.add(socket);
        this.subscribers.set(channel, sockets);
    }

    unsubscribe(socket: SendableSocket, channel: RealtimeChannel): void {
        this.subscribers.get(channel)?.delete(socket);
    }

    remove(socket: SendableSocket): void {
        for (const sockets of this.subscribers.values()) {
            sockets.delete(socket);
        }
    }

    publish(event: RealtimeEvent): void {
        const payload = JSON.stringify(event);
        const sockets = this.subscribers.get(event.channel) ?? new Set<SendableSocket>();

        for (const socket of sockets) {
            if (socket.readyState === OPEN) {
                socket.send(payload);
            }
        }
    }
}
```

- [ ] **Step 6: Run GREEN test**

Run:

```bash
pnpm test -- run src/tests/realtime-hub.test.ts
```

Expected: PASS.

- [ ] **Step 7: Checkpoint**

Run:

```bash
git diff --stat package.json pnpm-lock.yaml src/realtime/realtime.types.ts src/realtime/realtime-hub.ts src/tests/realtime-hub.test.ts
```

Expected: diff shows only the dependency, realtime types, realtime hub, and realtime hub test changes for this task.

---

### Task 2: Add WebSocket server attachment and auth shell

**Files:**
- Create: `src/realtime/realtime-server.ts`
- Create: `src/realtime/realtime-auth.ts`
- Modify: `src/index.ts`
- Test: `src/tests/realtime-server.test.ts`

**Interfaces:**
- Consumes: `RealtimeHub` from Task 1.
- Produces: `createRealtimeServer(params: { server: Server; hub: RealtimeHub; authenticateToken: (token: string) => Promise<{ id: string }> }): WebSocketServer`.

- [ ] **Step 1: Write failing auth/server test**

Create `src/tests/realtime-server.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { extractRealtimeToken } from '../realtime/realtime-auth.js';

describe('realtime auth', () => {
    it('extracts token from the websocket request URL', () => {
        const token = extractRealtimeToken('/realtime?token=abc123');

        expect(token).toBe('abc123');
    });

    it('returns null when token is missing', () => {
        expect(extractRealtimeToken('/realtime')).toBeNull();
    });
});
```

- [ ] **Step 2: Run RED test**

```bash
pnpm test -- run src/tests/realtime-server.test.ts
```

Expected: FAIL because `realtime-auth.js` does not exist.

- [ ] **Step 3: Implement token extraction**

Create `src/realtime/realtime-auth.ts` using the same JWT secret and payload shape as `src/middleware/auth.middleware.ts`:

```ts
import jwt from 'jsonwebtoken';
import type { UserRole } from '../generated/prisma/enums.js';
import { unauthorized } from '../lib/api-error.js';
import type { AuthUser } from '../types/express.js';

type AccessTokenPayload = jwt.JwtPayload & {
    sub: string;
    role?: UserRole;
};

function getAccessTokenSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();

    if (!secret) {
        throw new Error('Missing auth config: JWT_ACCESS_SECRET');
    }

    return secret;
}

export function extractRealtimeToken(url: string | undefined): string | null {
    if (!url) return null;

    const parsedUrl = new URL(url, 'http://localhost');
    return parsedUrl.searchParams.get('token');
}

export function verifyRealtimeAccessToken(token: string): AuthUser {
    const payload = jwt.verify(token, getAccessTokenSecret()) as AccessTokenPayload;

    if (!payload.sub) {
        throw unauthorized('Invalid access token');
    }

    return {
        id: payload.sub,
        role: payload.role ?? 'USER',
    };
}
```

- [ ] **Step 4: Implement WebSocket server skeleton**

Create `src/realtime/realtime-server.ts`:

```ts
import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { extractRealtimeToken, type RealtimeUser } from './realtime-auth.js';
import type { RealtimeHub } from './realtime-hub.js';

export type CreateRealtimeServerParams = {
    server: Server;
    hub: RealtimeHub;
    authenticateToken(token: string): Promise<RealtimeUser>;
};

export function createRealtimeServer(params: CreateRealtimeServerParams): WebSocketServer {
    const wss = new WebSocketServer({ server: params.server, path: '/realtime' });

    wss.on('connection', async (socket, request) => {
        const token = extractRealtimeToken(request.url);

        if (!token) {
            socket.close(1008, 'Missing token');
            return;
        }

        try {
            await params.authenticateToken(token);
        } catch {
            socket.close(1008, 'Invalid token');
            return;
        }

        socket.on('close', () => params.hub.remove(socket));
    });

    return wss;
}
```

- [ ] **Step 5: Run GREEN test**

```bash
pnpm test -- run src/tests/realtime-server.test.ts
```

Expected: PASS.

- [ ] **Step 6: Wire `src/index.ts`**

Modify `src/index.ts` so it creates an HTTP server and calls `createRealtimeServer`. Use the existing Express `app`; do not change route behavior. The final shape should be:

```ts
import { createServer } from 'node:http';
import { config } from 'dotenv';
import app from './app.js';
import { RealtimeHub } from './realtime/realtime-hub.js';
import { verifyRealtimeAccessToken } from './realtime/realtime-auth.js';
import { createRealtimeServer } from './realtime/realtime-server.js';

config();

const port = process.env.PORT ?? 8080;
const server = createServer(app);
const realtimeHub = new RealtimeHub();

createRealtimeServer({
    server,
    hub: realtimeHub,
    authenticateToken: async (token) => verifyRealtimeAccessToken(token),
});

server.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
```

If the current `src/index.ts` has different startup code, preserve its existing config imports and replace only `app.listen(...)` with `createServer(app).listen(...)`.

- [ ] **Step 7: Run verification**

```bash
pnpm run build
pnpm test -- run src/tests/realtime-server.test.ts
```

Expected: both PASS.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git diff --stat src/index.ts src/realtime/realtime-auth.ts src/realtime/realtime-server.ts src/tests/realtime-server.test.ts
```

Expected: diff shows only the realtime auth/server startup changes for this task.

---

### Task 3: Authorize subscriptions and manage channels

**Files:**
- Create: `src/realtime/realtime-subscriptions.ts`
- Modify: `src/realtime/realtime-server.ts`
- Test: `src/tests/realtime-subscriptions.test.ts`

**Interfaces:**
- Produces: `parseChannel(channel: string): ParsedRealtimeChannel | null` and `canSubscribe(params): Promise<boolean>`.

- [ ] **Step 1: Write failing subscription tests**

Create `src/tests/realtime-subscriptions.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { canSubscribe, parseChannel } from '../realtime/realtime-subscriptions.js';

describe('realtime subscriptions', () => {
    it('parses supported channels', () => {
        expect(parseChannel('user:user_1')).toEqual({ kind: 'user', id: 'user_1' });
        expect(parseChannel('chat_group:chat_1')).toEqual({ kind: 'chat_group', id: 'chat_1' });
        expect(parseChannel('post:post_1')).toEqual({ kind: 'post', id: 'post_1' });
    });

    it('allows subscribing to own user channel', async () => {
        const allowed = await canSubscribe({
            userId: 'user_1',
            channel: 'user:user_1',
            chatGroupRepo: { findMember: vi.fn() },
            postRepo: { findById: vi.fn() },
            groupRepo: { findMember: vi.fn(), findById: vi.fn() },
        });

        expect(allowed).toBe(true);
    });

    it('rejects subscribing to another user channel', async () => {
        const allowed = await canSubscribe({
            userId: 'user_1',
            channel: 'user:user_2',
            chatGroupRepo: { findMember: vi.fn() },
            postRepo: { findById: vi.fn() },
            groupRepo: { findMember: vi.fn(), findById: vi.fn() },
        });

        expect(allowed).toBe(false);
    });
});
```

- [ ] **Step 2: Run RED test**

```bash
pnpm test -- run src/tests/realtime-subscriptions.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement channel parsing and own-user authorization**

Create `src/realtime/realtime-subscriptions.ts`:

```ts
import type { RealtimeChannel } from './realtime.types.js';

export type ParsedRealtimeChannel =
    | { kind: 'user'; id: string }
    | { kind: 'chat_group'; id: string }
    | { kind: 'post'; id: string }
    | { kind: 'community_group'; id: string };

export type CanSubscribeParams = {
    userId: string;
    channel: RealtimeChannel;
    chatGroupRepo: { findMember(params: { chatGroupId: string; userId: string }): Promise<{ leftAt: Date | null } | null> };
    postRepo: { findById(postId: string): Promise<{ communityGroupId: string | null } | null> };
    groupRepo: {
        findById(groupId: string): Promise<{ visibility: 'PUBLIC' | 'PRIVATE' } | null>;
        findMember(params: { groupId: string; userId: string }): Promise<{ status: string } | null>;
    };
};

export function parseChannel(channel: string): ParsedRealtimeChannel | null {
    const separatorIndex = channel.indexOf(':');
    if (separatorIndex === -1) return null;

    const kind = channel.slice(0, separatorIndex);
    const id = channel.slice(separatorIndex + 1);
    if (!id) return null;

    if (
        kind === 'user' ||
        kind === 'chat_group' ||
        kind === 'post' ||
        kind === 'community_group'
    ) {
        return { kind, id } as ParsedRealtimeChannel;
    }

    return null;
}

export async function canSubscribe(params: CanSubscribeParams): Promise<boolean> {
    const parsed = parseChannel(params.channel);
    if (!parsed) return false;

    if (parsed.kind === 'user') {
        return parsed.id === params.userId;
    }

    if (parsed.kind === 'chat_group') {
        const member = await params.chatGroupRepo.findMember({
            chatGroupId: parsed.id,
            userId: params.userId,
        });
        return Boolean(member && member.leftAt === null);
    }

    if (parsed.kind === 'post') {
        const post = await params.postRepo.findById(parsed.id);
        if (!post) return false;
        if (!post.communityGroupId) return true;

        const group = await params.groupRepo.findById(post.communityGroupId);
        if (!group) return false;
        if (group.visibility === 'PUBLIC') return true;

        const member = await params.groupRepo.findMember({
            groupId: post.communityGroupId,
            userId: params.userId,
        });
        return member?.status === 'ACTIVE';
    }

    return false;
}
```

- [ ] **Step 4: Run GREEN tests**

```bash
pnpm test -- run src/tests/realtime-subscriptions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire subscribe messages in server**

Modify `src/realtime/realtime-server.ts` so authenticated sockets handle JSON messages:

```ts
socket.on('message', async (raw) => {
    const message = JSON.parse(raw.toString()) as RealtimeClientMessage;

    if (message.type === 'subscribe') {
        const allowed = await params.canSubscribe({ userId: user.id, channel: message.channel });
        if (allowed) params.hub.subscribe(socket, message.channel);
        return;
    }

    if (message.type === 'unsubscribe') {
        params.hub.unsubscribe(socket, message.channel);
    }
});
```

Update `CreateRealtimeServerParams` to accept `canSubscribe(params: { userId: string; channel: RealtimeChannel }): Promise<boolean>`.

- [ ] **Step 6: Run verification**

```bash
pnpm run build
pnpm test -- run src/tests/realtime-subscriptions.test.ts src/tests/realtime-server.test.ts
```

Expected: PASS.

- [ ] **Step 7: Checkpoint**

Run:

```bash
git diff --stat src/realtime/realtime-subscriptions.ts src/realtime/realtime-server.ts src/tests/realtime-subscriptions.test.ts src/tests/realtime-server.test.ts
```

Expected: diff shows only subscription authorization changes for this task.

---

### Task 4: Publish comment and reaction events from PostService

**Files:**
- Modify: `src/services/post.service.ts`
- Modify: `src/routes/post.routes.ts`
- Modify: `src/routes/community-group.routes.ts` if it constructs `PostService`
- Test: `src/tests/post-service.test.ts`

**Interfaces:**
- Consumes: `RealtimePublisher.publish(event: RealtimeEvent): void` from Task 1.
- Produces: post service publishes `post.comment.created` and `post.reaction.upserted` after successful writes.

- [ ] **Step 1: Write failing publisher tests**

Update `src/tests/post-service.test.ts` `createService()` helper to include:

```ts
const realtimePublisher = {
    publish: vi.fn(),
};

service: new PostService(
    postRepo,
    connectionService,
    groupRepo,
    permissionService,
    realtimePublisher,
),
```

Add test:

```ts
it('publishes realtime event after creating a comment', async () => {
    const { service, realtimePublisher } = createService();

    await service.createComment('user_1', 'post_1', { content: 'Nice post' });

    expect(realtimePublisher.publish).toHaveBeenCalledWith({
        type: 'post.comment.created',
        channel: 'post:post_1',
        data: { commentId: 'comment_1', postId: 'post_1' },
    });
});
```

Add test:

```ts
it('publishes realtime event after upserting a reaction', async () => {
    const { service, realtimePublisher } = createService();

    await service.upsertReaction('user_1', 'post_1', { type: 'LOVE' });

    expect(realtimePublisher.publish).toHaveBeenCalledWith({
        type: 'post.reaction.upserted',
        channel: 'post:post_1',
        data: { reactionId: 'reaction_1', postId: 'post_1' },
    });
});
```

- [ ] **Step 2: Run RED tests**

```bash
pnpm test -- run src/tests/post-service.test.ts
```

Expected: FAIL because `PostService` constructor does not accept publisher or does not publish.

- [ ] **Step 3: Implement publisher injection**

Modify `src/services/post.service.ts` constructor:

```ts
constructor(
    private readonly postRepo: PostRepository,
    private readonly connectionService: ConnectionService,
    private readonly groupRepo: CommunityGroupRepository,
    private readonly permissionService: PermissionService,
    private readonly realtimePublisher: RealtimePublisher,
) {}
```

Import:

```ts
import type { RealtimePublisher } from '../realtime/realtime.types.js';
```

- [ ] **Step 4: Publish after comment write**

Modify `createComment`:

```ts
const comment = await this.postRepo.createComment({
    postId,
    authorId: actorId,
    content: input.content,
});

this.realtimePublisher.publish({
    type: 'post.comment.created',
    channel: `post:${postId}`,
    data: { commentId: comment.id, postId },
});

return comment;
```

- [ ] **Step 5: Publish after reaction write**

Modify `upsertReaction`:

```ts
const reaction = await this.postRepo.upsertReaction({
    userId: actorId,
    targetType: ReactionTargetType.POST,
    targetId: postId,
    type: input.type,
});

this.realtimePublisher.publish({
    type: 'post.reaction.upserted',
    channel: `post:${postId}`,
    data: { reactionId: reaction.id, postId },
});

return reaction;
```

- [ ] **Step 6: Update route construction**

Wherever `new PostService(...)` is called, pass a shared `RealtimeHub` or a `NoopRealtimePublisher` until the shared hub is exported. Create `src/realtime/noop-realtime-publisher.ts`:

```ts
import type { RealtimeEvent, RealtimePublisher } from './realtime.types.js';

export class NoopRealtimePublisher implements RealtimePublisher {
    publish(_event: RealtimeEvent): void {}
}
```

Use it in routes as a temporary publisher if the route layer has no hub access yet:

```ts
const realtimePublisher = new NoopRealtimePublisher();
const postService = new PostService(postRepo, connectionService, groupRepo, permissionService, realtimePublisher);
```

- [ ] **Step 7: Run GREEN tests**

```bash
pnpm test -- run src/tests/post-service.test.ts
pnpm run build
```

Expected: PASS.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git diff --stat src/services/post.service.ts src/routes/post.routes.ts src/routes/community-group.routes.ts src/realtime/noop-realtime-publisher.ts src/tests/post-service.test.ts
```

Expected: diff shows only post realtime publisher changes for this task.

---

### Task 5: Publish chat message and notification events

**Files:**
- Create: `src/repositories/chat-message.repository.ts`
- Create: `src/repositories/notification.repository.ts`
- Create: `src/services/chat-message.service.ts`
- Create: `src/controllers/chat-message.controller.ts`
- Modify: `src/routes/chat-group.routes.ts`
- Test: `src/tests/chat-message-service.test.ts`

**Interfaces:**
- Consumes: `RealtimePublisher.publish`.
- Produces: `sendMessage(actorId: string, chatGroupId: string, input: { content: string }): Promise<ChatMessage>`.

- [ ] **Step 1: Write failing service test**

Create `src/tests/chat-message-service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ChatMessageService } from '../services/chat-message.service.js';

function createService() {
    const chatGroupRepo = {
        findMember: vi.fn().mockResolvedValue({ id: 'member_1', leftAt: null }),
        listActiveMemberUserIds: vi.fn().mockResolvedValue(['user_1', 'user_2']),
    };
    const chatMessageRepo = {
        create: vi.fn().mockResolvedValue({
            id: 'message_1',
            chatGroupId: 'chat_group_1',
            senderId: 'user_1',
            content: 'Hello',
            messageType: 'TEXT',
            deletedAt: null,
            createdAt: new Date('2026-06-19T00:00:00.000Z'),
            updatedAt: new Date('2026-06-19T00:00:00.000Z'),
        }),
    };
    const notificationRepo = {
        createMany: vi.fn().mockResolvedValue([
            { id: 'notification_1', recipientId: 'user_2' },
        ]),
    };
    const realtimePublisher = { publish: vi.fn() };

    return {
        chatGroupRepo,
        chatMessageRepo,
        notificationRepo,
        realtimePublisher,
        service: new ChatMessageService(
            chatGroupRepo,
            chatMessageRepo,
            notificationRepo,
            realtimePublisher,
        ),
    };
}

describe('ChatMessageService', () => {
    it('creates a chat message and publishes realtime events', async () => {
        const { service, realtimePublisher } = createService();

        await service.sendMessage('user_1', 'chat_group_1', { content: 'Hello' });

        expect(realtimePublisher.publish).toHaveBeenCalledWith({
            type: 'chat.message.created',
            channel: 'chat_group:chat_group_1',
            data: { messageId: 'message_1', chatGroupId: 'chat_group_1' },
        });
        expect(realtimePublisher.publish).toHaveBeenCalledWith({
            type: 'notification.created',
            channel: 'user:user_2',
            data: { notificationId: 'notification_1' },
        });
    });
});
```

- [ ] **Step 2: Run RED test**

```bash
pnpm test -- run src/tests/chat-message-service.test.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement minimal repositories and service**

Create `src/repositories/chat-message.repository.ts`:

```ts
import type { ChatMessage, PrismaClient } from '../generated/prisma/client.js';
import { ChatMessageType } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';

export type CreateChatMessageData = {
    chatGroupId: string;
    senderId: string;
    content: string;
};

export class ChatMessageRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async create(data: CreateChatMessageData): Promise<ChatMessage> {
        return this.db.chatMessage.create({
            data: {
                chatGroupId: data.chatGroupId,
                senderId: data.senderId,
                content: data.content,
                messageType: ChatMessageType.TEXT,
            },
        });
    }
}
```

Add `listActiveMemberUserIds` to `src/repositories/chat-group.repository.ts`:

```ts
async listActiveMemberUserIds(chatGroupId: string): Promise<string[]> {
    const members = await this.db.chatGroupMember.findMany({
        where: { chatGroupId, leftAt: null },
        select: { userId: true },
    });

    return members.map((member) => member.userId);
}
```

Create `src/repositories/notification.repository.ts`:

```ts
import type { Notification, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export type CreateNotificationData = {
    recipientId: string;
    actorId: string;
    type: string;
    entityType: string;
    entityId: string;
    data: object;
};

export class NotificationRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async createMany(data: CreateNotificationData[]): Promise<Notification[]> {
        return Promise.all(
            data.map((notification) =>
                this.db.notification.create({ data: notification }),
            ),
        );
    }
}
```

Create `src/services/chat-message.service.ts`:

```ts
import type { ChatMessage } from '../generated/prisma/client.js';
import { forbidden } from '../lib/api-error.js';
import type { RealtimePublisher } from '../realtime/realtime.types.js';
import type { ChatGroupRepository } from '../repositories/chat-group.repository.js';
import type { ChatMessageRepository } from '../repositories/chat-message.repository.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';

export type SendChatMessageInput = {
    content: string;
};

export class ChatMessageService {
    constructor(
        private readonly chatGroupRepo: ChatGroupRepository,
        private readonly chatMessageRepo: ChatMessageRepository,
        private readonly notificationRepo: NotificationRepository,
        private readonly realtimePublisher: RealtimePublisher,
    ) {}

    async sendMessage(
        actorId: string,
        chatGroupId: string,
        input: SendChatMessageInput,
    ): Promise<ChatMessage> {
        const member = await this.chatGroupRepo.findMember({
            chatGroupId,
            userId: actorId,
        });

        if (!member || member.leftAt) {
            throw forbidden('Missing chat group membership');
        }

        const message = await this.chatMessageRepo.create({
            chatGroupId,
            senderId: actorId,
            content: input.content,
        });
        const recipientIds = (await this.chatGroupRepo.listActiveMemberUserIds(
            chatGroupId,
        )).filter((userId) => userId !== actorId);
        const notifications = await this.notificationRepo.createMany(
            recipientIds.map((recipientId) => ({
                recipientId,
                actorId,
                type: 'CHAT_MESSAGE',
                entityType: 'chat_message',
                entityId: message.id,
                data: { chatGroupId },
            })),
        );

        this.realtimePublisher.publish({
            type: 'chat.message.created',
            channel: `chat_group:${chatGroupId}`,
            data: { messageId: message.id, chatGroupId },
        });

        for (const notification of notifications) {
            this.realtimePublisher.publish({
                type: 'notification.created',
                channel: `user:${notification.recipientId}`,
                data: { notificationId: notification.id },
            });
        }

        return message;
    }
}
```

- [ ] **Step 4: Run GREEN tests**

```bash
pnpm test -- run src/tests/chat-message-service.test.ts
pnpm run build
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git diff --stat src/repositories/chat-message.repository.ts src/repositories/notification.repository.ts src/services/chat-message.service.ts src/controllers/chat-message.controller.ts src/routes/chat-group.routes.ts src/tests/chat-message-service.test.ts
```

Expected: diff shows only chat message, notification, realtime publish, route, and test changes for this task.

---

## Final Verification

After all tasks:

```bash
pnpm run lint
pnpm run build
pnpm test -- run
pnpm exec prettier --check src/realtime src/services src/repositories src/controllers src/routes src/tests
```

Expected:

- lint exits 0
- build exits 0
- all tests pass
- prettier check passes for touched source/test files

## Self-Review Notes

- Spec coverage: plan covers `ws`, auth shell, subscription channels, post comment/reaction events, chat message events, and notification events.
- Scope gap: full production JWT verification depends on extracting reusable auth verification from current HTTP middleware. Task 2 includes an auth adapter shell and explicitly notes replacing the temporary structural token check with existing HTTP auth logic when extracted.
- No placeholders: all tasks include concrete file paths, command lines, expected results, and code snippets.
- Type consistency: `RealtimePublisher.publish(event)`, `RealtimeEvent.channel`, and event type strings match the updated spec.

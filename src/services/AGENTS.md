# Service Agent Rules

These rules apply to files under `src/services`.

Follow the backend architecture defined in the root `AGENTS.md`. Follow repository-specific rules when changing repository query behavior.

## Backend Pattern Skill

Before changing service code, read `<project-root>/.agents/skills/nodejs-backend-patterns/SKILL.md` for service-layer orchestration, dependency injection, error handling, side-effect, and testing patterns.

Project-specific service rules in this file override generic examples in the skill. Do not introduce new infrastructure, queues, caches, database clients, or production dependencies from generic examples unless the task explicitly requires it and the user approves production dependencies.

## PostgreSQL and Supabase Skills

Before working on data access, transactions, or Supabase-related tasks, read the relevant skill file first:

| Task type                                       | Skill file                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Complex queries, CTEs, bulk operations, indexes | `<project-root>/.agents/skills/postgres-patterns/SKILL.md`                |
| Supabase Auth, Storage, Realtime, RLS           | `<project-root>/.agents/skills/supabase/SKILL.md`                         |
| Supabase-specific PostgreSQL best practices     | `<project-root>/.agents/skills/supabase-postgres-best-practices/SKILL.md` |

Do not assume Prisma or PostgreSQL behavior. Read the relevant skill file before making changes.

---

## Service Responsibility

Services contain business logic and use-case orchestration.

Service methods should:

- Accept DTO-parsed values and authenticated context passed by controllers.
- Apply business rules, authorization decisions, state transitions, and workflow orchestration.
- Call repositories or other injected services to perform persistence and side effects.
- Return typed domain/service results to controllers.

Services must not accept or depend on Express `req` / `res` objects. Keep HTTP response formatting in controllers.

Do not return HTTP response bodies from services. Do not use response helper functions in services. Services return typed domain/service results; controllers format HTTP responses.

---

## Trust DTO-Parsed Input

Trust data received from controllers after DTO/Zod parsing.

Do not repeat request validation in services. Do not re-parse controller input with Zod, manually check required request fields, or duplicate DTO constraints in service methods.

Services are responsible for business invariants that span multiple fields, entities, or system state. These are not DTO concerns. Examples:

- End date must be after start date when both are present.
- A user cannot follow themselves.
- A referenced entity must exist before creating a child record.
- An entity must be in a specific state before a transition is allowed.
- A user cannot have more than N active items.

Services may also validate ownership, permissions, entity state, duplicate records, and quota limits.

---

## Data Access

Do not write raw Prisma queries or SQL directly in services.

Avoid direct use of the Prisma client (`prisma.user.findMany(...)`, `prisma.$queryRaw(...)`, etc.) in services unless the service must coordinate a multi-repository transaction that cannot reasonably live in a single repository.

Use injected repository instances and repository methods. Typical repository method shapes:

- `findById` — fetch a single record by primary key
- `findMany` — fetch a list with optional filters, pagination, and ordering
- `findOne` — fetch a single record matching conditions
- `create` — insert a new record
- `update` — update specific fields on a known record
- `upsert` — create or update in one operation
- `delete` / `softDelete` — remove a record
- `count` — count records matching conditions
- `existsById` / `existsWhere` — check for record existence

If a service needs a query shape not supported by an existing repository method, add the smallest repository method needed and keep Prisma query construction in the repository layer.

---

## Transactions

Use Prisma interactive transactions (`prisma.$transaction(async (tx) => { ... })`) only when two or more writes must be atomic.

Do not use transactions for single-record writes.

Do not perform external side effects inside a transaction body. This includes HTTP calls, file uploads, push notifications, and email sends. Complete all side effects before or after the transaction.

Pass the transaction client (`tx`) down to repository methods rather than importing the global Prisma client inside transaction callbacks. Repository methods that participate in transactions should accept an optional transaction client parameter.

```ts
await prisma.$transaction(async (tx) => {
    await this.postRepo.create(postData, tx);
    await this.feedRepo.insertFeedEntry(feedEntry, tx);
});
```

---

## Media and File Uploads

Use a dedicated `MediaService` or `StorageService` for file handling. Inject it through the constructor like any other dependency.

For Supabase Storage operations (upload, delete, signed URLs):

- Read `<project-root>/.agents/skills/supabase/SKILL.md` before making changes.

Do not call Supabase Storage APIs directly from domain services. Route all storage calls through the injected storage service.

When deleting an entity that has uploaded files, delete the storage files as part of the same operation:

```ts
await Promise.all([
    this.postRepo.delete(postId),
    ...mediaPaths.map((path) => this.storageService.delete(path)),
]);
```

Do not leave orphaned storage files when deleting domain entities.

---

## Notification Side Effects

Use a dedicated `NotificationService` for sending push notifications or emails. Do not call third-party notification APIs directly from domain services.

Notification side effects must not block the main service operation. Wrap notification calls in a separate private method with its own `try/catch`:

```ts
private async notifyFollowers(params: { postId: string }) {
  try {
    await this.notificationService.sendToFollowers(params);
  } catch (error) {
    this.logger.error({ ...params, error }, '[PostService] Failed to send notification');
  }
}
```

Call notification helpers after the main write has completed. Do not send notifications inside transactions.

---

## Entity Mapping Helpers

When a service returns list or detail data that requires reshaping repository output into response types, use private mapper methods rather than inline object construction in the public method body.

Name mapper methods with a `map` prefix: `mapToListItem`, `mapToDetail`, etc.

Keep mapper methods pure — they should accept data and return a shaped object with no side effects, no repository calls, and no async operations.

---

## Parallel Data Fetching

When a service method needs data from multiple independent sources, fetch them concurrently with `Promise.all` rather than sequentially:

```ts
const [post, author] = await Promise.all([
    this.postRepo.findById(postId),
    this.userRepo.findById(authorId),
]);
```

When building a map of related entities for a list, deduplicate IDs before fetching:

```ts
const uniqueUserIds = [...new Set(posts.map((p) => p.authorId))];
const users = await Promise.all(
    uniqueUserIds.map((id) => this.userRepo.findById(id)),
);
```

Do not fetch the same record multiple times within a single service method execution.

---

## Compensation on Multi-Step Write Failures

When a service performs multiple sequential writes and a later step fails, compensate by rolling back earlier writes where possible.

Log rollback failures separately and rethrow the original error after attempting rollback:

```ts
try {
    await laterWriteStep();
} catch (err) {
    try {
        await this.postRepo.delete(createdPostId);
    } catch (rollbackErr) {
        console.error('Failed to rollback after write error:', rollbackErr);
    }
    throw err;
}
```

Prefer wrapping related writes in a Prisma transaction over manual compensation when atomicity is required.

Do not silently swallow the original error after a failed compensation.

---

## Unit Tests

Always write unit tests for each function after implementing it.

Tests must:

- Use Vitest.
- Cover the full expected behavior including success paths, edge cases, validation/business-rule failures, authorization failures, and dependency errors when applicable.
- Live under `src/test/**/*.spec.ts` or colocated as `*.spec.ts` beside the service file.
- Mock repositories, Prisma client, storage services, and other side-effecting dependencies rather than calling real external services or the real database.

These tests must pass in CI. Do not leave newly implemented service functions without matching unit test coverage.

---

## Structured Logging

Use the project logger (injected or imported from `src/lib/logger.ts`) instead of `console.log`, `console.error`, or `console.warn`.

Always pass structured context as the first argument, not an interpolated string:

```ts
// WRONG
console.error(`[PostService] Failed to delete post ${postId}: ${err.message}`);

// CORRECT
this.logger.error({ postId, err }, 'Failed to delete post');
```

Use `error` level for unexpected failures that affect the operation result. Use `warn` for recoverable degraded behavior (e.g. cache miss, retried operation). Use `debug` for per-call detail that is only useful during development.

Do not log sensitive values such as passwords, tokens, or full request bodies containing credentials.

---

## Async and Non-Blocking Operations

All service methods that perform I/O (database, cache, external HTTP) must be `async` and return a `Promise`.

Never use synchronous blocking alternatives inside service methods:

- No `fs.readFileSync`, `fs.writeFileSync`
- No CPU-intensive loops that block the event loop (use worker threads or offload if needed)
- No `JSON.parse` on extremely large untrusted payloads inside the hot path

Use `Promise.all` for independent async operations rather than sequential `await` chains — see the Parallel Data Fetching section above.

Propagate errors by re-throwing or wrapping in a typed error. Do not swallow errors silently unless they are explicitly non-blocking side effects (notifications, analytics) and that is documented.

---

## Caching

When a service method reads data that is expensive to compute or fetch and is safe to serve slightly stale, apply the cache-aside pattern using the project cache client (from `src/lib/cache.ts`):

```ts
const cacheKey = `post:${postId}`;
const cached = await this.cache.get(cacheKey);
if (cached) return JSON.parse(cached) as PostDetail;

const post = await this.postRepo.findById(postId);
await this.cache.set(cacheKey, JSON.stringify(post), { ttl: 300 });
return post;
```

Invalidate the relevant cache keys after write operations in the same service method:

```ts
await this.postRepo.update(postId, data);
await this.cache.del(`post:${postId}`);
```

Do not cache inside repository methods — caching is a service-layer concern.

Do not cache data that contains secrets or sensitive personal information unless the cache key is scoped strictly to the owning user.

Set explicit TTLs on all cached values. Do not cache without a TTL.

---

## Singleton Services

Prefer constructor injection for all new services.

A static `getInstance()` singleton is acceptable only for shared infrastructure services used by several routes with the exact same dependency configuration.

Do not add new singleton services by default. Do not change an existing singleton to constructor injection unless the task explicitly requires it.

---

## Final Response Note

When changing service files, include a short service note in the final response:

```
Service note:
- Service method changed:
- Business invariants validated: yes/no
- Repository methods used:
- Transaction used: yes/no
- Side effects (notifications/storage): yes/no
- Unit tests added/updated: yes/no
```

# Backend Agent Rules

These rules apply to all files under `src`.

## Backend Pattern Source

For generic Node.js backend architecture and implementation patterns, read:

- `<project-root>/.agents/skills/nodejs-backend-patterns/SKILL.md`

For PostgreSQL-specific query patterns, transactions, and optimization:

- `<project-root>/.agents/skills/postgres-patterns/SKILL.md`

For Supabase-specific integration (Auth, Storage, Realtime, RLS):

- `<project-root>/.agents/skills/supabase/SKILL.md`
- `<project-root>/.agents/skills/supabase-postgres-best-practices/SKILL.md`

For database schema changes and migrations:

- `<project-root>/.agents/skills/database-migrations/SKILL.md`

Do not duplicate generic guidance from these skills in this file. Use this file as the project-specific overlay.

Project-specific rules in this file and folder-specific `AGENTS.md` files override generic examples in the skills above.

Do not add framework, middleware, database, or other production dependencies from skill examples without explicit user approval.

---

## Folder Structure

The canonical source layout is:

```
src/
  config/          # Centralized configuration (env, third-party clients)
  controllers/     # HTTP boundary — thin request/response handlers
  services/        # Business logic and use-case orchestration
  repositories/    # Database access — all Prisma queries live here
  models/          # Domain types, interfaces, enums, constants
  routes/          # Express router wiring only
  middlewares/     # Auth, error handling, rate limiting, logging
  utils/           # Pure helper functions with no side effects
  lib/             # Shared singletons (prisma client, logger, cache client)
  scripts/         # One-off scripts, seed data, migrations helpers
  test/            # Unit and integration test files
```

Do not create new top-level directories under `src` without explicit discussion. Place new files in the closest matching existing directory.

---

## Layer Architecture

This backend uses the following layer order:

```
DTO (Zod) → Controller → Service → Repository → Prisma Client → PostgreSQL
```

Before editing a layer, read its folder-specific rules when present:

- `src/controllers/AGENTS.md`
- `src/services/AGENTS.md`
- `src/repositories/AGENTS.md`
- `src/models/AGENTS.md`

Folder-specific rules always override general guidance in this file.

---

## Single Responsibility and Modular Code

Apply the Single Responsibility Principle to every file and class. Each module should have one reason to change.

When a file grows beyond roughly 300 lines, consider whether it is doing too much and split it into focused modules. Do not split purely for line count — split when distinct responsibilities can be separated cleanly.

Break large service methods into private helper methods with descriptive names rather than keeping all logic in one long function body.

Do not create "utility dump" files that accumulate unrelated helper functions. Group utilities by the concern they serve.

---

## Code Readability and Naming

Use descriptive names over excessive comments. Code should read like prose; a comment explaining _what_ the code does is a signal the code needs to be renamed or restructured.

Use comments to explain _why_, not _what_:

```ts
// WRONG — describes what the code already says
// Get the user by id
const user = await this.userRepo.findById(userId);

// CORRECT — explains a non-obvious business reason
// Fetch author separately; posts table omits profile data for query performance
const author = await this.userRepo.findById(post.authorId);
```

Prefer full words over abbreviations in variable, method, and class names. `userRepository` over `userRepo` is acceptable in public APIs; short names in small private scopes are fine.

Name booleans as questions: `isPublished`, `hasFollowers`, `canEdit`.

Name async functions and methods with verbs: `createPost`, `fetchFeed`, `deleteComment`.

---

## TypeScript

Use TypeScript strict mode. The `tsconfig.json` must include `"strict": true`.

Do not use `any`. Use `unknown` when the type is genuinely unknown and narrow it before use.

Do not use non-null assertions (`!`) unless the value's presence is guaranteed by prior logic and narrowing is not practical. Add a comment explaining why when used.

Prefer explicit return types on all public service and repository methods so callers always know what to expect.

Use `type` for object shapes and union types. Use `interface` for shapes that may be extended. Be consistent with whichever is used in nearby files.

Do not suppress TypeScript errors with `@ts-ignore` or `@ts-expect-error` without a comment explaining the reason.

---

## Configuration Management

All environment-specific values must come from environment variables. Do not hardcode URLs, secrets, ports, database credentials, or third-party API keys in source files.

Centralize configuration loading in `src/config/`. Each config module should read from `process.env`, apply defaults, and export a typed config object:

```ts
// src/config/app.config.ts
export const appConfig = {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    jwtSecret:
        process.env.JWT_SECRET
        ?? (() => {
            throw new Error('JWT_SECRET is required');
        })(),
};
```

Throw at startup for missing required environment variables rather than failing silently at runtime.

Do not import `process.env` directly in controllers, services, or repositories. Import the typed config object from `src/config/` instead.

Keep `.env.example` up to date whenever a new environment variable is added. Do not commit `.env` files with real secrets.

---

## Auth and Security

This project uses **Supabase Auth** for identity. JWT tokens issued by Supabase are verified server-side by the global `authenticate` middleware (`src/middlewares/auth.middleware.ts`).

Do not trust client-provided identity fields such as `userId`, `role`, `email`, or ownership fields when identity must come from the verified JWT.

Extract identity exclusively from the verified Supabase JWT context attached by auth middleware. Never read `userId` from `req.body`, `req.params`, or `req.query` when it should come from the token.

Do not make any auth, security, permission, payment, or data-deletion changes without explicit confirmation.

For Supabase Auth specifics (JWT verification, RLS policies, user management):

- Read `<project-root>/.agents/skills/supabase/SKILL.md` before making changes.

### Security Hardening

`helmet` must be applied in `src/app.ts` and must not be removed or disabled.

`express-rate-limit` must be applied globally. Do not remove or lower rate limits without explicit approval.

Run `pnpm audit` before adding new dependencies. Do not add packages with known high-severity vulnerabilities.

Do not log sensitive values (passwords, tokens, secrets, full request bodies containing credentials) at any log level.

---

## HTTP and Performance

### Compression

`compression` middleware must be applied in `src/app.ts` to gzip HTTP responses. Do not remove it.

### Async Handlers

All Express route handlers and middleware must be `async` functions or return a `Promise`. Never use synchronous blocking operations (file system sync reads, CPU-intensive loops, `JSON.parse` on very large payloads) inside request handlers.

Use `Promise.all` for independent async operations rather than sequential `await` chains.

---

## API Documentation

Every public endpoint must have a corresponding `@openapi` JSDoc block in the route file.

The OpenAPI spec must be served at `GET /docs` (or the project-configured path) via Swagger UI in non-production environments.

When adding or modifying an endpoint, update both the implementation and the OpenAPI block in the same change. Do not leave documentation out of sync with the implementation.

---

## Caching

Use Redis (via `src/lib/cache.ts` or equivalent) for application-level caching. Do not use in-memory caches (plain JS `Map`, module-level variables) for data that must be consistent across multiple server instances.

Follow the cache-aside pattern:

```ts
// 1. Read from cache
const cached = await cache.get(cacheKey);
if (cached) return JSON.parse(cached);

// 2. Read from DB on miss
const data = await this.repo.findById(id);

// 3. Populate cache
await cache.set(cacheKey, JSON.stringify(data), { ttl: 300 });

return data;
```

Cache invalidation must happen in the service layer after write operations, not in repositories or controllers.

Set explicit TTLs on all cached values. Do not cache without a TTL.

Do not cache values that contain sensitive user data unless the cache key is scoped to that user.

---

## Structured Logging

Use the project logger (from `src/lib/logger.ts`) instead of `console.log`, `console.error`, or `console.warn` anywhere in `src`.

The logger must use a structured format (JSON in production, pretty-print in development). Pino is the preferred library.

Log levels:

| Level   | When to use                                                                                  |
| ------- | -------------------------------------------------------------------------------------------- |
| `error` | Unexpected failures, caught exceptions that affect the response                              |
| `warn`  | Degraded behavior that is recoverable (cache miss forcing DB, rate limit close to threshold) |
| `info`  | Significant lifecycle events (server start, migration complete)                              |
| `debug` | Per-request detail useful during development only                                            |

Do not use `info` or `debug` inside hot request paths in production — prefer `debug` and ensure it is disabled at the production log level.

Always include structured context, not interpolated strings:

```ts
// WRONG
logger.error(`Failed to fetch user ${userId}: ${err.message}`);

// CORRECT
logger.error({ userId, err }, 'Failed to fetch user');
```

---

## Database and Data Access

Use **Prisma** as the ORM. Keep all raw database access inside repository files.

Do not write raw SQL or Prisma queries in controllers or services, except for rare transaction orchestration described in `src/services/AGENTS.md`.

For complex raw SQL (analytics, bulk operations, CTEs), use `prisma.$queryRaw` or `prisma.$executeRaw` inside repository methods only.

Preserve existing Prisma schema field names, relation names, and model conventions unless explicitly asked to change them.

For PostgreSQL-level optimization (indexes, query plans, partitioning, RLS):

- Read `<project-root>/.agents/skills/postgres-patterns/SKILL.md` before making changes.

For Supabase-specific PostgreSQL behavior (RLS, storage policies, realtime):

- Read `<project-root>/.agents/skills/supabase-postgres-best-practices/SKILL.md` before making changes.

---

## Schema and Migration Rules

All schema changes must go through Prisma migrations. Do not modify the database schema directly via SQL or the Supabase Dashboard without a corresponding migration file.

Before creating or editing a migration:

- Read `<project-root>/.agents/skills/database-migrations/SKILL.md`.

Run `prisma migrate dev` for local development. Run `prisma migrate deploy` for production.

Do not use `prisma db push` in production environments.

If a migration adds or changes indexes, foreign keys, or RLS policies, document the change in the migration file's description comment.

---

## Dependency Injection

Use constructor injection for all dependencies (repositories, services, external clients).

Do not import and call shared services or repositories as module-level singletons inside service methods. Receive them via the constructor so they can be swapped in tests.

```ts
// CORRECT
class PostService {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly storageService: StorageService,
    ) {}
}

// WRONG — hard-coded dependency, not testable
class PostService {
    private postRepo = new PostRepository(prisma);
}
```

Dependency graphs are composed at the router layer (`src/routes/`). This is the only place where `new Repository(...)` and `new Service(repo)` calls are allowed.

---

## Third-Party Service Abstraction

All calls to external APIs (email providers, push notification services, payment gateways, analytics, CDNs) must go through a dedicated service class in `src/services/`.

Do not call third-party SDKs or HTTP clients directly from domain services, controllers, or repositories.

Wrap external calls so that swapping a provider requires changing only the dedicated service class, not its callers.

External service failures must be caught and either re-thrown as typed internal errors or handled as non-blocking side effects, depending on whether the caller needs the result.

---

## Containerization

The project uses Docker with multi-stage builds. The `Dockerfile` must include at minimum a `build` stage and a `production` stage.

The production image must not include `devDependencies`, source TypeScript files, or build tooling.

Environment variables must be injected at runtime via Docker environment configuration, not baked into the image.

Do not modify the `Dockerfile` or `docker-compose.yml` without explicit user approval.

---

## Codebase Constraints

Preserve existing import/export style and module boundaries.

Prefer existing shared types, DTO-inferred types, and Prisma-generated types over duplicating shapes.

If a task requires a new production dependency, pause generation, explain exactly which dependency is needed and why, and ask the user for approval before modifying `package.json`.

Do not refactor unrelated files or change public API behavior unless explicitly requested.

Keep changes minimal and reviewable.

---

## Linting and Code Style

ESLint is the enforced linter. The config must include:

- `eslint-plugin-prettier` for formatting consistency.
- A security-focused plugin (e.g. `eslint-plugin-security`) to catch common Node.js security issues.

All code must pass `pnpm run lint` with zero errors before being committed. Warnings must not be suppressed with `// eslint-disable` without a comment explaining the reason and a tracking note.

Prettier is the enforced formatter. Do not manually format code in ways that conflict with the Prettier config.

---

## Checks After Code Changes

Use `pnpm` by default.

After code changes, always run lint, build, and unit tests using the scripts defined in `package.json`. If any check fails, automatically attempt to fix the errors up to 2 times. If the checks still fail, stop and present the errors to the user.

Before running commands, inspect `package.json` and use only scripts that exist.

Common backend checks:

```bash
pnpm run lint
pnpm run build
pnpm run test
```

These same checks must pass in CI. Do not bypass or skip them.

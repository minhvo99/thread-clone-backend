# Repository Agent Rules

These rules apply to files under `src/repositories`.

## Backend Pattern Skill

Before changing repository code, read `<project-root>/.agents/skills/nodejs-backend-patterns/SKILL.md` for data-access boundary, dependency, and maintainability patterns.

## PostgreSQL and Supabase Skills

Before working on any database query task in repositories, read:

- `<project-root>/.agents/skills/postgres-patterns/SKILL.md` — for query patterns, indexing, CTEs, bulk operations, and query optimization.
- `<project-root>/.agents/skills/supabase-postgres-best-practices/SKILL.md` — for Supabase-specific PostgreSQL behavior, RLS, and storage policies.

Do not assume Prisma or PostgreSQL behavior. Always read the skill files before making changes.

---

## Repository Responsibility

Repositories own all database access for their domain. They translate repository method calls into Prisma queries and return typed domain objects to services.

A repository should only:

- Accept typed query parameters from services.
- Build and execute Prisma queries.
- Map Prisma results to domain/model types when needed.
- Return typed results to the caller.

Do not put business logic, authorization decisions, or HTTP-related code in repositories.

---

## Prisma Query Rules

When adding or changing Prisma queries in repositories:

- Keep all Prisma query logic inside repository classes. Do not move Prisma calls into controllers or services.
- Use the injected `PrismaClient` instance. Do not import and instantiate a new `PrismaClient` inside a repository class.
- Repository methods should accept and pass through `select` / `include` options where practical. The service or call site is responsible for deciding which relations or fields are needed — not the repository.
- Avoid duplicating equivalent query logic across repositories.
- Preserve existing Prisma model names, field names, and relation conventions.

---

## Transaction Support

Repository methods that participate in Prisma transactions must accept an optional transaction client parameter (`tx`):

```ts
async create(data: CreatePostData, tx?: Prisma.TransactionClient): Promise<Post> {
  const client = tx ?? this.prisma;
  return client.post.create({ data });
}
```

Do not import the global Prisma client inside a transaction callback. Always receive `tx` from the caller.

---

## Raw SQL Rules

Raw SQL is allowed inside repositories only when Prisma's query builder cannot express the required query. This includes:

- CTEs (`WITH` expressions)
- Window functions
- Bulk upserts
- Complex aggregations
- PostgreSQL-specific features (e.g., `UNNEST`, `jsonb_agg`, text search with `tsvector`)

Use `prisma.$queryRaw` with tagged template literals or `Prisma.sql` for parameterized raw queries. Never interpolate user-supplied values directly into SQL strings:

```ts
// CORRECT
const results = await this.prisma.$queryRaw<Post[]>`
  SELECT * FROM posts WHERE author_id = ${userId} LIMIT ${limit}
`;

// WRONG — SQL injection risk
const results = await this.prisma.$queryRaw(
    `SELECT * FROM posts WHERE author_id = '${userId}'`,
);
```

Before writing raw SQL, read `<project-root>/.agents/skills/postgres-patterns/SKILL.md`.

---

## Index Rules

When a query uses multiple `WHERE` filters, range filters, `ORDER BY`, pagination, or combined filter + sort patterns, check whether a database index is required.

Before editing database indexes:

1. Read `<project-root>/.agents/skills/postgres-patterns/SKILL.md` for indexing conventions.
2. Read `<project-root>/.agents/skills/database-migrations/SKILL.md` to understand how to add indexes via migration.
3. Check existing Prisma schema `@@index` and `@@unique` definitions.

If a new index is required, add it to the Prisma schema as a `@@index` directive and create a migration. Do not apply indexes directly to the database without a corresponding migration.

For partial indexes, expression indexes, or GIN/GiST indexes not supported by Prisma schema directives, add them via a raw migration SQL file. Document the reason with a comment.

---

## Pagination Patterns

Prefer cursor-based pagination for social feed use cases (infinite scroll). Prefer offset pagination for admin list pages.

Cursor-based example:

```ts
async findFeed(params: {
  cursor?: string;
  limit: number;
  userId: string;
}): Promise<{ items: Post[]; nextCursor: string | null }> {
  const rows = await this.prisma.post.findMany({
    where: { authorId: { in: followedIds } },
    orderBy: { createdAt: 'desc' },
    take: params.limit + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  const hasNextPage = rows.length > params.limit;
  const items = hasNextPage ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return { items, nextCursor };
}
```

Do not implement pagination logic in services or controllers.

---

## Soft Deletes

If the domain model uses a `deletedAt` field for soft deletes, always filter `deletedAt: null` in `findMany` queries unless the method is explicitly intended to return soft-deleted records.

Do not hard-delete records in repositories that use soft-delete conventions unless the task explicitly requires it.

---

## Async and Non-Blocking Operations

All repository methods must be `async` and return a `Promise`. Never use synchronous Prisma alternatives or synchronous file/network I/O inside repository methods.

Do not perform CPU-intensive transformations on large result sets inside a repository method. Return the raw Prisma result and let the service map it.

---

## Error Handling and Logging in Repositories

Do not catch and swallow Prisma errors in repository methods unless the method is explicitly designed to return `null` on not-found. Let errors propagate to the service layer where they can be mapped to typed domain errors.

When a repository method catches an error to add context before re-throwing, log it with the project logger:

```ts
} catch (err) {
  logger.error({ postId, err }, 'Failed to fetch post from database');
  throw err;
}
```

Do not use `console.error` or `console.log` in repository files.

Map Prisma's `P2025` (record not found) error to a domain-level not-found result or let it propagate — choose consistently with the pattern used in nearby repository methods.

---

## Required Final Note

Include this note when a change involves query logic — for example, adding or modifying `where` filters, `orderBy`, `select`, `include`, `limit`, pagination, or raw SQL. Skip it for changes that only affect write methods, constructors, or model mapping helpers.

```
Repository query/index note:
- Repository method changed:
- Query filters:
- Sort/order:
- Pagination:
- Index required: yes/no
- Existing index found: yes/no
- New index added/recommended: yes/no
- Migration needed: yes/no
```

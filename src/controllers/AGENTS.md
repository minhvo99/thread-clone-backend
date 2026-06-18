# Controller Agent Rules

These rules apply to files under `src/controllers`.

Follow the architecture, Zod, TypeScript, auth, error-handling, and validation rules defined in the root `AGENTS.md` when writing controller code.

Before changing controller code, read `<project-root>/.agents/skills/nodejs-backend-patterns/SKILL.md` for backend boundary, API, middleware, and error-handling patterns. Apply project-specific controller rules in this file over any generic controller examples in that skill.

---

## Controller Responsibility

Controllers are the HTTP boundary for backend endpoints. They translate HTTP input into typed service calls and translate service results into project-standard HTTP responses.

Controllers must stay thin. A controller should only:

- Read the authenticated request context when needed.
- Parse and validate request input through DTO Zod schemas.
- Call the appropriate service method.
- Return an HTTP response using the shared response helper.

Do not put business logic in controllers. Business decisions, orchestration, authorization decisions, and invariants belong in services.

Do not call Prisma, the database, or repository methods directly from controllers. Controllers should call services.

---

## Request Validation

Validate request data in DTO files with Zod.

Do not define Zod schemas inline inside controllers. Define or update schemas in the relevant DTO file and import them into the controller.

Do not manually validate request input as a substitute for DTO parsing. This includes `req.body`, `req.params`, `req.query`, headers, and uploaded file metadata.

Avoid controller-level request-shape checks such as:

```ts
if (!req.body.content) {
}
typeof req.query.page === 'string';
```

Small technical guards are allowed only when required by existing middleware behavior or TypeScript narrowing, and they must not replace DTO validation.

Use DTO schemas to parse controller inputs before calling services:

```ts
const body = CreatePostDTO.parse(req.body);
const params = PostParamsDTO.parse(req.params);
const query = PostQueryDTO.parse(req.query);
```

After DTO parsing, pass the parsed DTO value to the service. Do not pass raw `req.body`, `req.params`, or `req.query` when parsed values exist.

If a DTO parse fails, let the global error middleware handle the `ZodError`. Do not create one-off validation response shapes in controllers.

---

## Form Data Requests

For `multipart/form-data` requests, use the project's existing form-data parsing utility to read fields and files.

After parsing form data, still validate the parsed result with Zod before calling services. Treat parsed `fields`, `files`, and file metadata as untrusted request input until a DTO schema has parsed them.

Do not manually validate form fields or uploaded files in the controller as a substitute for DTO validation.

Put form-data shape, required file rules, allowed field values, file count, MIME type, file size, and related request constraints in the relevant DTO schema whenever practical.

Only skip DTO-level file validation when the constraint cannot be expressed in Zod, such as actual file content integrity. Document the reason with an inline comment when this exception is used.

---

## Responses

Do not use the response helper for errors inside controllers. Let the global error middleware format error responses.

Do not return raw JSON payloads such as:

```ts
return res.status(200).json(data);
```

Use the project response shape instead:

```ts
const status = 200;

return res.status(status).json(
    toResponseBody({
        status,
        data,
        message: 'Request completed successfully',
    }),
);
```

For `204 No Content` responses, returning `res.status(204).send()` is allowed because there is no JSON body.

### HTTP Status Codes

Use standard HTTP status codes consistently across all controllers:

| Situation                             | Status                                                 |
| ------------------------------------- | ------------------------------------------------------ |
| Successful read or update             | `200`                                                  |
| Successful resource creation          | `201`                                                  |
| Successful deletion with no body      | `204`                                                  |
| Validation error from DTO/Zod parsing | `400` — handled by global error middleware             |
| Unauthenticated request               | `401` — handled by auth middleware                     |
| Forbidden operation                   | `403` — throw from service, mapped by error middleware |
| Resource not found                    | `404` — throw from service, mapped by error middleware |
| Internal error                        | `500` — handled by global error middleware             |

Do not manually set 4xx/5xx status codes in controllers for cases already covered by global error middleware. Let services throw typed errors and let the middleware handle the mapping.

---

## Query Param Transformation

Do not transform or compute derived values from query params inside controllers.

Examples of what belongs outside the controller:

- Converting `page` + `limit` to `offset`
- Mapping string enum values to internal constants
- Defaulting optional filters to fallback values
- Building repository query options
- Computing pagination cursors

Pass the DTO-parsed query object to the service. Put transformation logic in the service or a dedicated mapper.

---

## Error Handling

Do not wrap controller methods in local `try/catch` blocks just to forward or format errors. The global error middleware registered in `src/app.ts` handles `ZodError` and typed HTTP errors automatically.

Only catch errors in a controller when the controller must add necessary context or intentionally translate a known error type, and keep that pattern consistent with nearby controllers.

Do not translate service-layer business errors into ad hoc response shapes in controllers. Prefer typed errors and the global error middleware.

---

## Async Handlers

All controller methods must be `async` functions. Express 5 propagates rejected promises to the error middleware automatically; do not wrap handlers in a manual async error catcher.

Never perform synchronous blocking work inside a controller method (no sync file reads, no heavy CPU loops).

---

## Structured Logging

Do not use `console.log`, `console.error`, or `console.warn` in controller files.

Controllers should not log routine request data — that belongs to the HTTP access log middleware. Only log when a controller catches a known error and adds context before re-throwing:

```ts
} catch (err) {
  logger.warn({ postId, userId, err }, 'Unexpected error in createPost controller');
  throw err;
}
```

Use the project logger imported from `src/lib/logger.ts`.

---

## Auth Context

### Request Type

All endpoints are protected by the global `authenticate` middleware registered in `src/app.ts`. By the time any controller runs, `req.user` is guaranteed to be populated.

Type controller methods using `AuthenticatedRequest` imported directly from the auth middleware:

```ts
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PostController {
    createPost = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        // ...
    };
}
```

Never use the base Express `Request` type for controller methods in this project.

### Reading User Identity

Read identity directly from `req.user`. Do not import or use any helper wrapper (`getCurrentUser`, `getOptionalCurrentUser`, or similar) — these add a file and an indirection for no benefit since `req.user` is always present after `authenticate` runs.

```ts
// CORRECT — read directly
const { userId, role, email } = req.user;

// WRONG — unnecessary wrapper
const currentUser = getCurrentUser(req);
```

Do not read `userId` from `req.body`, `req.params`, `req.query`, or any client-provided field. Identity always comes from `req.user` set by `authenticate`.

Do not create or import `getCurrentUser`, `getOptionalCurrentUser`, or any equivalent utility. If such a file already exists in the codebase, do not add new usages — read `req.user` directly instead.

### Route-Level Authorization

Use `authorize(...roles)` from `src/middlewares/auth.middleware.ts` to restrict endpoints by role. Apply it at the router level, not inside the controller method body:

```ts
import { authenticate, authorize } from '../middlewares/auth.middleware';

router.delete('/:postId', authorize('admin'), deletePost);
```

`authenticate` is global — do not add it again on individual routes. Only add `authorize` when a route requires a specific role beyond basic authentication.

Use route-level `authorize` for coarse role guards. Put ownership checks and business-level authorization decisions in the service layer.

---

## Controller Final Response Note

When changing controller code, include a short controller note in the final response:

```
Controller note:
- DTO parsed: yes/no
- Raw request data passed to service: yes/no
- Service called:
- Response helper used: yes/no
- Auth context used: yes/no
```

# Route Agent Rules

These rules apply to files under `src/routes`.

Follow the backend architecture, auth, TypeScript, and validation rules defined in the root `AGENTS.md`. Also follow controller, service, and repository rules when a route change requires changes in those layers.

## Runtime Architecture

The backend is a plain Express application:

- `src/index.ts` creates the HTTP server and starts listening.
- `src/app.ts` creates the Express app, applies global middleware, mounts `appRouter`, then applies not-found and error middleware.
- `src/routes/index.ts` creates `appRouter` and mounts domain routers.
- Each domain route file builds an Express `Router` and wires middleware, controller methods, services, and repositories.

Do not mount domain routes directly in `app.ts`. Register domain routers in `src/routes/index.ts`.

---

## Route Responsibility

Routes are wiring only. A route file may:

- Create an Express `Router`.
- Instantiate repositories, services, and controllers for that router.
- Destructure controller methods.
- Attach middleware in the correct order.
- Register HTTP method/path handlers.
- Maintain OpenAPI route documentation.

Do not put request parsing, DTO validation, response formatting, business logic, authorization decisions, database queries, or file processing in route files.

Request parsing and DTO validation belong in controllers. Business logic belongs in services. Database query construction belongs in repositories.

---

## Router Builder Pattern

Prefer the existing builder pattern for new or updated domain routers:

```ts
import { authorize } from '../middlewares/auth.middleware';

export function buildPostRouter() {
    const router = Router();

    const postRepo = new PostRepository(prisma);
    const userRepo = new UserRepository(prisma);
    const postService = new PostService(postRepo, userRepo);
    const { createPost, getPost, listPosts, deletePost } = new PostController(
        postService,
    );

    router.get('/', listPosts);
    router.get('/:postId', getPost);
    router.post('/', createPost);
    router.delete('/:postId', authorize('admin'), deletePost);

    return router;
}
```

`authenticate` is applied globally in `src/app.ts` and covers all routes. Do not add `authenticate` again on individual route declarations.

Routes are allowed to instantiate repositories, services, and controllers as part of composition-root wiring. This is the exception to the service-layer rule that forbids creating dependencies with `new` inside services.

Keep dependency construction near the top of the router builder, before route declarations. Reuse a single controller/service instance within the router instead of creating new instances per endpoint.

Avoid adding new default-export patterns unless the nearby route file already uses that style. Prefer named `buildXRouter()` exports for new routers and mount them from `src/routes/index.ts`.

The Prisma client instance used in router builders should come from a shared singleton import (`src/lib/prisma.ts` or equivalent). Do not instantiate a new `PrismaClient` per router.

---

## Middleware Order

`authenticate` is registered globally in `src/app.ts` and applies to every route automatically. Do not add `authenticate` on individual route declarations.

For route-specific middleware, apply it before the controller handler and in this order:

1. Coarse route-level authorization middleware (when needed):
    - `authorize(...roles)` — restricts to one or more specific roles
    - Other project-specific guards
2. Controller handler.

Example:

```ts
import { authorize } from '../middlewares/auth.middleware';

// No authenticate needed — already applied globally
router.post('/', createPost);
router.get('/:postId', getPost);

// Role-protected route adds only the authorization guard
router.delete('/:postId', authorize('admin'), deletePost);
```

Do not perform middleware checks manually inside route files. If a new access pattern is needed, add or reuse middleware instead of inline route logic.

---

## Route Paths and Ordering

Use paths relative to the domain mount path in `src/routes/index.ts`.

For example, if `appRouter.use('/posts', buildPostRouter())` mounts the router, define paths such as:

```ts
router.get('/');
router.get('/feed');
router.get('/:postId');
router.post('/');
router.delete('/:postId');
```

Do not include the domain prefix again inside the domain router.

Register specific static routes before broad parameterized routes when they could conflict. For example, put `/feed`, `/trending`, or `/search` before `/:postId`.

Use existing REST naming conventions in nearby routes. Avoid changing public paths or HTTP methods unless explicitly requested.

---

## OpenAPI Documentation

When adding or changing a public endpoint, add or update the nearby `@openapi` block.

Keep OpenAPI docs aligned with the actual route:

- Full mounted path, including the domain prefix.
- HTTP method.
- Auth/security requirement.
- Path params.
- Query params.
- Request body content type, including `multipart/form-data` when relevant.
- Success response status and response shape.
- Expected error statuses handled by middleware.

Do not document behavior that is not implemented. Do not state that validation is handled only by the client; backend validation must happen through controller DTO/Zod rules.

---

## Auth and Request Typing Handoff

All routes are protected by the global `authenticate` middleware. Every controller receives an `AuthenticatedRequest` with `req.user` already populated — never a plain Express `Request`.

For role-protected routes, add `authorize` at the router level:

```ts
import { authorize } from '../middlewares/auth.middleware';

router.delete('/:postId', authorize('admin'), deletePost);
```

The controller request type must always be `AuthenticatedRequest`. Do not use the base Express `Request` type for any controller in this project.

If route authorization behavior changes, update the controller method typing according to `src/controllers/AGENTS.md`.

---

## Error Handling

Do not add route-level `try/catch` wrappers for controller handlers. Let async controller errors flow to the global error middleware registered in `src/app.ts`.

Do not add route-local error response formatting. Error response formatting belongs to global error middleware.

---

## App-Level Middleware

Global app middleware belongs in `src/app.ts`, not domain route files. This includes CORS, request logging, global rate limiting, Swagger setup, not-found handling, and global error handling.

Only add route-specific middleware in domain route files when it applies exclusively to that route or router.

Do not enable or change global middleware from a domain route task unless explicitly requested.

---

## Final Response Note

When changing route files, include a short route note in the final response:

```
Route note:
- Router mounted/updated:
- Middleware order checked: yes/no
- Controller handler wired:
- OpenAPI updated: yes/no
```

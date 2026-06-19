# Node.js Express Startup Refactor Design

Date: 2026-06-19

## Goal

Refactor the existing Express/TypeScript backend startup/bootstrap so it follows a clean Node.js backend pattern:

- keep `src/app.ts` responsible only for Express middleware, routes, and app wiring
- move Node-specific runtime concerns into a separate `src/server.ts`
- keep `src/index.ts` as the minimal process bootstrap entrypoint
- explain and preserve the existing `createServer(app)` usage for `ws` WebSocket attachment
- fix `tsconfig.json` so the TypeScript configuration matches Node ESM authorship with `.js` extensions in source imports

This is intentionally a small, focused refactor rather than a broad folder reshuffle.

## Current state

- `src/app.ts` configures Express middleware, `appRouter`, and error handling.
- `src/index.ts` currently does both environment bootstrap and Node HTTP server creation with `createServer(app)`.
- `src/realtime/realtime-server.ts` relies on a Node `Server` instance to attach WebSocket handling.
- `tsconfig.json` uses `moduleResolution: "Bundler"`, which is unusual for this repo and can make `.js` extension imports confusing.

## Proposed structure

Keep the existing source layout, but separate responsibilities explicitly:

- `src/app.ts`
  - exports the configured Express `app`
  - contains only HTTP middleware, routes, and error middleware
  - remains importable by tests or other tooling without starting the network stack

- `src/server.ts`
  - imports `app` from `src/app.ts`
  - creates the Node HTTP server via `createServer(app)`
  - attaches realtime WebSocket support using `createRealtimeServer(...)`
  - exports a factory or helper for creating/listening on the server

- `src/index.ts`
  - loads environment variables
  - imports the server factory from `src/server.ts`
  - starts listening on `process.env.PORT`
  - logs startup status

This keeps `app` and runtime wiring decoupled, which is a standard Node.js backend bootstrap pattern.

## Why `createServer(app)` is still correct

WebSocket libraries like `ws` need access to the raw HTTP server instance in order to upgrade connections.
Express `app.listen(...)` creates a server internally, but it does not expose that server object in a clean reusable way for WS wiring.

So the correct pattern for this app is:

- `app` remains the Express request handler
- `server = createServer(app)` creates the HTTP server
- `ws` attaches to `server`
- `server.listen(...)` starts both HTTP and WS on the same port

The refactor will keep this pattern, but move it into `src/server.ts` so `src/index.ts` is only the process entrypoint.

## TypeScript configuration changes

Update `tsconfig.json` to align with Node ESM and `.js` imports in TS source:

- `module`: `ES2023`
- `moduleResolution`: `node16`
- `target`: `ES2023`
- keep `rootDir`, `outDir`, `strict`, `esModuleInterop`, `skipLibCheck`
- keep the existing `paths` alias and `tsc-alias` config so runtime path aliasing still works
- keep `include: ["src/**/*"]`

This configuration is more standard for Node + ESM projects. It allows TypeScript to resolve `import ... from './app.js'` correctly while still outputting ESM-compatible JavaScript.

## Verification

After the refactor, verify:

- `pnpm run build` succeeds
- `pnpm run lint` succeeds
- the existing API startup shape still works
- `src/realtime/realtime-server.ts` still accepts the HTTP server from `src/server.ts`

## User approval

If this design looks right, I will implement the refactor in the worktree and keep the file/layout changes minimal.

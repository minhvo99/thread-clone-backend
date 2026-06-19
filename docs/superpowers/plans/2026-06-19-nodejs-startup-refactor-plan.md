# Node.js Startup Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Express/TypeScript backend startup so `src/app.ts` owns Express wiring, `src/server.ts` owns Node HTTP/WS bootstrap, and `src/index.ts` is a minimal process entrypoint while fixing TypeScript config for `.js` imports.

**Architecture:** Keep the existing Express app wiring in `src/app.ts`, move server creation and realtime attachment into `src/server.ts`, and leave `src/index.ts` as the CLI/bootstrap entrypoint. Preserve `createServer(app)` for WebSocket upgrade support and update `tsconfig.json` to use standard Node ESM resolution.

**Tech Stack:** Node 22, Express 5, TypeScript 6, `ws`, `dotenv`, `vitest`.

## Global Constraints

- Use the existing Express app in `src/app.ts` for request handling.
- Keep WebSocket attachment on the raw Node HTTP server; do not replace it with a separate WS-only server.
- Update TypeScript config to support `import './file.js'` style imports in source.
- Verify with `pnpm run build`, `pnpm run lint`, and targeted tests.

---

### Task 1: Create `src/server.ts` and move runtime bootstrap logic

**Files:**
- Create: `src/server.ts`
- Modify: `src/index.ts`
- Modify: `src/app.ts`
- Test: `src/tests/server.test.ts`

**Interfaces:**
- Consumes: `app` from `src/app.ts`, `createRealtimeServer` from `src/realtime/realtime-server.ts`, `realtimeHub`, and `verifyRealtimeAccessToken`.
- Produces: `createServer(): Server` exported from `src/server.ts`.

- [ ] **Step 1: Write the failing bootstrap test**

Create `src/tests/server.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createServer } from '../server.js';

describe('server bootstrap', () => {
    it('creates an HTTP server that can be closed', () => {
        const server = createServer();

        expect(server).toBeDefined();
        expect(typeof server.listen).toBe('function');

        server.close();
    });
});
```

- [ ] **Step 2: Run RED test**

Run:

```bash
pnpm test -- run src/tests/server.test.ts
```

Expected: FAIL because `src/server.ts` does not exist yet or `createServer` is missing.

- [ ] **Step 3: Implement `src/server.ts`**

Create `src/server.ts`:

```ts
import { createServer as createHttpServer, type Server } from 'node:http';
import app from './app.js';
import { realtimeHub } from './realtime/realtime-hub-singleton.js';
import { createRealtimeServer } from './realtime/realtime-server.js';
import { verifyRealtimeAccessToken } from './realtime/realtime-auth.js';

export function createServer(): Server {
    const server = createHttpServer(app);

    createRealtimeServer({
        server,
        hub: realtimeHub,
        authenticateToken: async (token) =>
            verifyRealtimeAccessToken(token),
    });

    return server;
}
```

- [ ] **Step 4: Refactor `src/index.ts` to use `createServer()`**

Modify `src/index.ts` to:

```ts
import { config } from 'dotenv';
import { createServer } from './server.js';

config();

const PORT = Number(process.env.PORT ?? 8080);
const server = createServer();

server.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Move the root route into `src/app.ts`**

Modify `src/app.ts` to add the root health route before `export default app;`:

```ts
app.get('/', (_req, res) => {
  res.send('Hello, World!');
});
```

- [ ] **Step 6: Run GREEN test**

Run:

```bash
pnpm test -- run src/tests/server.test.ts
```

Expected: PASS.

- [ ] **Step 7: Verify bootstrap and runtime wiring**

Run:

```bash
pnpm run build
```

Expected: PASS.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git diff --stat src/app.ts src/index.ts src/server.ts src/tests/server.test.ts
```

Expected: diff shows only the runtime bootstrap refactor and new server test.

---

### Task 2: Fix TypeScript config for Node ESM and `.js` imports

**Files:**
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: existing `src` layout and source imports that use `.js` extensions.
- Produces: a compiler config that resolves Node ESM imports cleanly and preserves the existing build output path.

- [ ] **Step 1: Update `tsconfig.json`**

Modify `tsconfig.json` to:

```json
{
  "compilerOptions": {
    "module": "ES2023",
    "moduleResolution": "node16",
    "target": "ES2023",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "express.d.ts"],
  "tsc-alias": {
    "resolveFullPaths": true,
    "resolveFullExtension": ".js"
  }
}
```

- [ ] **Step 2: Run build to verify TypeScript config**

Run:

```bash
pnpm run build
```

Expected: PASS.

- [ ] **Step 3: Run lint to ensure no config-related issues**

Run:

```bash
pnpm run lint
```

Expected: PASS.

- [ ] **Step 4: Checkpoint**

Run:

```bash
git diff --stat tsconfig.json
```

Expected: diff shows only the TypeScript compiler options update.

---

## Final Verification

After both tasks complete:

```bash
pnpm run build
pnpm run lint
pnpm test -- run src/tests/server.test.ts
```

Expected:

- build exits 0
- lint exits 0
- server bootstrap test passes

## Execution options

Plan complete and saved to `docs/superpowers/plans/2026-06-19-nodejs-startup-refactor-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - use `superpowers:subagent-driven-development` to execute each task with review checkpoints.
2. Inline Execution - use `superpowers:executing-plans` to implement the plan in this session with checkpoints.

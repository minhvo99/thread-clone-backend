# TSX Dev Runtime and `.ts` Import Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the backend so development runs directly with `tsx`, source files use `.ts` relative imports consistently, and production still builds with `tsc` and runs from `dist/index.js`.

**Architecture:** Keep the existing Node + Express runtime shape, but separate authoring-time and runtime concerns. Source files under `src/` and `src/tests/` will use `.ts` relative imports for TypeScript-native authoring, while the TypeScript compiler rewrites emitted relative import extensions during production build so Node can run the output in `dist/`.

**Tech Stack:** Node 22, Express 5, TypeScript 6.0.3, `tsx`, `vitest`, `ws`.

## Global Constraints

- Use `tsx` for development.
- Keep production build on `tsc` and production start on `node dist/index.js`.
- Source files under `src/` and `src/tests/` use `.ts` relative imports consistently.
- Use TypeScript compiler support for relative import extension rewriting in emitted JavaScript.
- Verify with `pnpm run build`, `pnpm run lint`, and `pnpm test -- run`.

---

## File Structure

- Modify `package.json`: switch `dev` to `tsx watch src/index.ts` and keep `build`/`start` stable.
- Modify `tsconfig.json`: enable `.ts` import authoring and emitted import rewriting under Node ESM-compatible settings.
- Modify all handwritten source files under `src/` that currently import local modules via `.js`: convert to `.ts` imports.
- Modify handwritten test files under `src/tests/` that currently import local modules via `.js`: convert to `.ts` imports.
- Do not modify generated Prisma source under `src/generated/prisma/**` unless required by handwritten source compilation.

---

### Task 1: Switch dev runtime to `tsx` and enable TypeScript import rewriting

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `src/tests/server.test.ts`

**Interfaces:**
- Consumes: existing `src/index.ts` entrypoint, existing `tsx` devDependency, current `pnpm build` and `pnpm start` commands.
- Produces: `pnpm dev` running `tsx watch src/index.ts`, and TypeScript compiler configuration that accepts `.ts` relative imports and rewrites them to `.js` in emitted output.

- [ ] **Step 1: Update the dev script in `package.json`**

Change the `scripts.dev` entry from:

```json
"dev": "npx nodemon"
```

to:

```json
"dev": "tsx watch src/index.ts"
```

Do not change `build` or `start` in this step.

- [ ] **Step 2: Configure `tsconfig.json` for `.ts` imports and emitted rewrite**

Update `tsconfig.json` so `compilerOptions` includes these values:

```json
{
  "module": "Node16",
  "moduleResolution": "node16",
  "target": "ES2023",
  "rootDir": "src",
  "outDir": "dist",
  "esModuleInterop": true,
  "strict": true,
  "skipLibCheck": true,
  "allowImportingTsExtensions": true,
  "rewriteRelativeImportExtensions": true,
  "paths": {
    "~/*": ["./src/*"]
  }
}
```

Keep the existing `include` and `tsc-alias` sections unless a compiler error proves they conflict with this setup.

- [ ] **Step 3: Run a focused RED build check**

Run:

```bash
pnpm run build
```

Expected: this may FAIL before Task 2 because handwritten source files still import `.js` modules.

- [ ] **Step 4: Validate the `tsx` dev command shape**

Run:

```bash
pnpm run dev --help
```

Expected: the command resolves through `tsx` instead of `nodemon`.

- [ ] **Step 5: Keep the server bootstrap test available as a sanity check**

Run:

```bash
pnpm test -- run src/tests/server.test.ts
```

Expected: PASS or fail only due to the pending import-convention migration in Task 2.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git diff --stat package.json tsconfig.json
```

Expected: diff shows only the dev script update and TypeScript compiler config changes.

---

### Task 2: Convert handwritten source and test imports from `.js` to `.ts`

**Files:**
- Modify: handwritten `src/**/*.ts` files with local `.js` imports
- Modify: handwritten `src/tests/**/*.ts` files with local `.js` imports
- Test: `src/tests/server.test.ts`

**Interfaces:**
- Consumes: compiler config from Task 1 with `allowImportingTsExtensions: true` and `rewriteRelativeImportExtensions: true`.
- Produces: consistent `.ts` relative imports across handwritten source and test files, while preserving the same module graph and runtime behavior.

- [ ] **Step 1: Enumerate handwritten files that still import local `.js` modules**

Run:

```bash
rg -l "from ['\"].*\\.js['\"]|import\(['\"].*\\.js['\"]\)" src --glob '!src/generated/**'
```

Expected: list of handwritten source/test files that need conversion.

- [ ] **Step 2: Convert handwritten source files to `.ts` relative imports**

Update relative imports such as:

```ts
import app from './app.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { createRealtimeServer } from './realtime/realtime-server.js';
```

into:

```ts
import app from './app.ts';
import { errorMiddleware } from './middleware/error.middleware.ts';
import { createRealtimeServer } from './realtime/realtime-server.ts';
```

Apply this pattern consistently across handwritten files in:

- `src/*.ts`
- `src/controllers/*.ts`
- `src/dtos/*.ts`
- `src/lib/*.ts`
- `src/middleware/*.ts`
- `src/realtime/*.ts`
- `src/repositories/*.ts`
- `src/routes/*.ts`
- `src/services/*.ts`
- `src/types/*.ts`

Do not change package imports like `express`, `zod`, `vitest`, `jsonwebtoken`, `ws`, or generated package imports from `@prisma/client`.

- [ ] **Step 3: Convert handwritten test files to `.ts` relative imports**

Update test imports such as:

```ts
import { createServer } from '../server.js';
import { ChatMessageService } from '../services/chat-message.service.js';
```

into:

```ts
import { createServer } from '../server.ts';
import { ChatMessageService } from '../services/chat-message.service.ts';
```

Apply this consistently across handwritten files in `src/tests/**/*.ts`.

- [ ] **Step 4: Run build to verify emitted import rewriting works**

Run:

```bash
pnpm run build
```

Expected: PASS.

- [ ] **Step 5: Inspect the emitted runtime import shape**

Run:

```bash
rg -n "from ['\"].*\\.ts['\"]" dist || true
```

Expected: no matches in handwritten emitted JavaScript, proving imports were rewritten for runtime.

- [ ] **Step 6: Run lint and full tests**

Run:

```bash
pnpm run lint
pnpm test -- run
```

Expected: both PASS.

- [ ] **Step 7: Smoke-check production entrypoint**

Run:

```bash
node dist/index.js
```

Expected: server starts successfully or fails only due to missing environment variables unrelated to import resolution. If it starts, stop it after confirming startup.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git diff --stat src package.json tsconfig.json
```

Expected: diff shows the dev runtime script change, compiler config updates, and `.ts` import conversions across handwritten source/test files.

---

## Final Verification

After both tasks:

```bash
pnpm run build
pnpm run lint
pnpm test -- run
rg -n "from ['\"].*\\.ts['\"]" dist || true
```

Expected:

- build exits 0
- lint exits 0
- all tests pass
- no emitted `.ts` relative imports remain in `dist/`

## Self-Review Notes

- Spec coverage: Task 1 covers `tsx` dev runtime and compiler rewrite config. Task 2 covers `.ts` import conversion plus verification that emitted JS is runnable.
- Placeholder scan: no TBD/TODO placeholders remain; every verification step includes an exact command and expected result.
- Type consistency: plan consistently uses `.ts` imports in source and `dist/*.js` in emitted runtime.

## Execution options

Plan complete and saved to `docs/superpowers/plans/2026-06-19-tsx-dev-ts-imports-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

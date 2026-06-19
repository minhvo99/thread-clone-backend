# TypeScript Dev Runtime and Import Extension Refactor Design

Date: 2026-06-19

## Goal

Update the backend toolchain so the source tree uses TypeScript-style relative imports with `.ts` extensions, development runs directly through `tsx`, and production still builds to `dist/` with `tsc` and runs from `dist/index.js`.

## Current state

- The project is an Express backend written in TypeScript.
- Production is already compiled with `tsc` into `dist/` and started with Node.
- The source tree currently mixes Node-style runtime concerns into `src/index.ts`.
- Relative imports have been drifting between `.js` and `.ts` conventions.
- The repo already includes `tsx` in devDependencies, so the dev runtime can be simplified without adding new tooling.

## Decision

Use **`tsx` for development** and **`tsc` for production**.

Source files under `src/` and `src/tests/` will use **`.ts` relative imports** consistently. The TypeScript compiler will rewrite those extensions during production emit so the compiled JavaScript in `dist/` remains executable by Node.

This preserves the standard Node production path while making the authored TypeScript easier to read and refactor.

## Architecture

### Development flow

- `pnpm dev` runs `tsx watch src/index.ts`
- `tsx` executes TypeScript directly, so developers do not need a prebuild step while iterating
- source imports stay in `.ts` form during development

### Production flow

- `pnpm build` continues to compile the repo into `dist/`
- the TypeScript compiler rewrites relative `.ts` imports to `.js` in emitted output
- `pnpm start` continues to run `node dist/index.js`

### Source import convention

- all relative imports in `src/**/*.ts` and `src/tests/**/*.ts` will use `.ts`
- path alias imports may remain unchanged where already used
- generated Prisma files are not part of this convention change unless a manual source file imports them relatively

## Configuration changes

### `package.json`

- update `dev` to use `tsx watch src/index.ts`
- keep `build` using `tsc` for production output
- keep `start` as `node dist/index.js`

### `tsconfig.json`

- keep Node-oriented compilation
- enable TypeScript’s relative import extension rewrite for emitted JavaScript
- keep `rootDir`, `outDir`, strict mode, and alias support
- keep the compiler configuration aligned with Node ESM semantics

### `src/**/*.ts` and `src/tests/**/*.ts`

- convert relative imports from `.js` to `.ts`
- keep internal modules grouped by responsibility rather than flattening the folder structure
- update any newly created files from the realtime/bootstrap work so they follow the same convention

## Runtime behavior

### Development

A developer should be able to run:

```bash
pnpm dev
```

and get a live TypeScript process without a separate build step.

### Production

A production build should still follow the stable Node path:

```bash
pnpm build
pnpm start
```

where `pnpm start` serves the compiled JavaScript from `dist/index.js`.

## Error handling and compatibility

- If TypeScript import rewriting is misconfigured, the build will fail rather than producing broken JavaScript.
- If a source file is left with the wrong relative extension, the compiler or runtime will surface it during build/test verification.
- The refactor should not change API behavior, realtime behavior, or database behavior.

## Testing strategy

Verify the change with:

- `pnpm dev` starts the server directly from TypeScript
- `pnpm run build` succeeds
- `pnpm run lint` succeeds
- `pnpm test -- run` succeeds
- a quick inspection of emitted `dist/**/*.js` shows rewritten relative imports that Node can execute

## Scope boundaries

Included:

- dev runtime change to `tsx`
- source import convention change to `.ts`
- compiler configuration to emit runnable `dist/`
- startup/bootstrap files needed to preserve the runtime path

Not included:

- changing the runtime architecture away from Node + Express
- changing the production start command away from `node dist/index.js`
- restructuring the entire feature folder layout

## Self-review notes

- No placeholders remain.
- The design keeps production on the stable Node path while letting source files remain TypeScript-native.
- The source import convention and the compiler rewrite behavior are aligned.
- The scope is narrow enough to implement in a single refactor plan.

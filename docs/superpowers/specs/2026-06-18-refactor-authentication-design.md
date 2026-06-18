# Refactoring Plan for Authentication Module

**Date:** 2026-06-18  
**Author:** Claude Code  
**Project:** Thread Clone Backend  
**Scope:** Refactor `src/controllers/auth`, `src/services/auth.service`, `src/repositories/auth.repository`, `src/controllers/auth/auth.dto.ts`, and related files to improve code quality, enforce SOLID principles, and align with project-wide standards.

---

## 1. Goals & Success Criteria

- **Behavior Preservation:** All existing HTTP endpoints (`/register`, `/login`, `/refresh-token`, `/logout`, `/me`, `/list-sessions`, `/revoke-session`, `/reset-password`, etc.) must continue to function identically.
- **Type Safety:** Eliminate `any` usage; all code must compile with `tsc --noEmit` and pass the project’s strict TypeScript settings.
- **Code Quality:** Pass ESLint and Prettier checks with zero errors/warnings. Adhere to the configuration in `.prettierrc` (e.g., single quotes, expanding parentheses, trailing commas).
- **Error Handling:** Centralize error classes and ensure they are used consistently across the module.
- **Separation of Concerns:** Apply Clean Architecture / SOLID principles to clearly delineate Controllers, Services, Repositories, and DTOs.
- **Documentation:** Generate a design specification stored in `docs/superpowers/specs/` and commit it to Git.

---

## 2. Current Architecture Overview

| Layer                 | Responsibility                                                                 | Current Implementation                                               |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Controllers**       | HTTP request/response handling, input validation, response formatting          | `AuthController` in `src/controllers/auth/auth.controller.ts`        |
| **Services**          | Business logic, orchestration of multiple repositories, transaction management | `AuthService` in `src/services/auth.service.ts`                      |
| **Repositories**      | Data access, Prisma client interactions, query building                        | `AuthRepository` in `src/repositories/auth.repository.ts` (implicit) |
| **DTOs / Validation** | Input schema definition and validation (Zod)                                   | `auth.dto.ts` defines numerous Zod schemas                           |
| **Middleware**        | Authentication/authorization helpers (`auth.middleware.ts`)                    | Provides `authenticate`, `authorize` functions                       |
| **Utilities**         | Helper functions (`response`, `errors`, `password`, `jwt`)                     | Various utility modules                                              |

The current implementation mixes concerns (e.g., validation directly inside controllers) and contains occasional duplication of logic (e.g., session metadata handling).

---

## 3. Refactored Design Principles

1. **Single Responsibility Principle (SRP)**
    - Each class/file should have one, well‑defined responsibility.
2. **Dependency Inversion Principle (DIP)**
    - High‑level modules (controllers, services) depend on abstractions (interfaces) rather than concrete implementations.
3. **Explicit Dependencies**
    - Use the `Container` DI system consistently; avoid hidden service look‑ups.
4. **Uniform Error Handling**
    - Introduce a single `AppError` base class and specific subclasses (`BadRequestError`, `UnauthorizedError`, etc.) used throughout.
5. **Validation Layer**
    - Keep Zod schemas in dedicated `validation/` folder; import them into controllers rather than embedding validation logic.
6. **Formatting Compliance**
    - All new/modified files must conform to `.prettierrc` settings (single quotes, trailing commas, expanding parentheses, etc.).

---

## 4. Proposed Folder Structure

```
src/
├─ controllers/
│   └─ auth/
│        ├─ auth.controller.ts          # Thin layer – only routing & response formatting
│        └─ auth.validator.ts           # Validation decorators / reusable schema utils
├─ services/
│   ├─ container.service.ts            # Dependency injection container (existing)
│   └─ auth.service.ts                 # Core business logic (refactored)
├─ repositories/
│   └─ auth.repository.ts              # Prisma client wrapper with typed methods
├─ middlewares/
│   └─ auth.middleware.ts              # Updated to use new error classes
├─ dto/
│   └─ auth/
│        ├─ register.schema.ts
│        ├─ login.schema.ts
│        └─ … (all other schemas)
├─ utils/
│   ├─ errors.ts                       # Custom error classes
│   ├─ response.ts                     # Response wrapper utility
│   └─ auth/
│        ├─ password.ts                # Password hashing helpers
│        └─ jwt.ts                     # JWT token utilities
└─ types/
    └─ auth.d.ts                       # Shared TypeScript interfaces
```

### Key Changes

- **DTOs** move to `src/dto/auth/*.ts` and become pure Zod schemas exported for import.
- **Controller** becomes a _pass‑through_ that validates against the imported schema, then delegates to `AuthService`.
- **AuthService** gains a clearer contract: all methods accept **typed input objects** and return **typed response objects**.
- **Repository** methods now return **typed Prisma models** and throw **domain‑specific errors** (`UserNotFoundError`, `EmailConflictError`, etc.).
- **Error handling** is centralized: controllers catch `AppError` instances and forward them to the global error‑handler middleware.

---

## 5. Implementation Steps (High‑Level)

| Step                       | Description                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **1. Prep**                | Create `src/dto/auth/` folder and move each Zod schema into its own file. Export each schema as a named constant.                    |
| **2. Validation Utility**  | Build `src/controllers/auth/auth.validator.ts` that imports and composes schemas, providing a `validate` helper used by controllers. |
| **3. Error Classes**       | Add `src/utils/errors.ts` with `AppError`, `BadRequestError`, `UnauthorizedError`, `NotFoundError`, `ConflictError`, etc.            |
| **4. Repository Refactor** | Update `src/repositories/auth.repository.ts` to use typed error classes and expose methods with explicit input/output types.         |
| **5. Service Refactor**    | Rewrite `src/services/auth.service.ts` to depend on the new repository interface via DI, and to use the new error classes.           |
| **6. Controller Refactor** | Simplify `src/controllers/auth/auth.controller.ts` to use `validate` and delegate all logic to the service.                          |
| **7. DI Registration**     | Ensure `Container` registers the updated service and repository lifecycles.                                                          |
| **8. Tests**               | Run existing unit/integration tests to verify behavior preservation. Add new tests for any uncovered edge cases.                     |
| **9. Lint & Format**       | Run `npm run lint` and `npm run fmt` (or equivalent) to satisfy Prettier rules.                                                      |
| **10. Documentation**      | Commit the design spec (`2026-06-18-refactor-authentication-design.md`) and update `README` if needed.                               |

---

## 6. Migration Path & Backward Compatibility

- **No API changes**: All route paths and request/response shapes remain identical.
- **Database schema**: Prisma client usage stays unchanged; only internal typing improves.
- **Frontend**: No impact; only response payload shapes remain the same.
- **Migration**: Deploy the refactor behind a feature flag or in a separate branch; run integration tests before merging to `main`.

---

## 7. Open Questions / Decisions

| Question                                                 | Decision / Status                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Should validation be performed in a separate middleware? | Kept in a validator utility for simplicity; middleware will remain focused on auth checks. |
| How to handle optional fields in DTOs?                   | Use Zod’s `.optional()` and keep type definitions strict.                                  |
| Error class naming convention?                           | Adopt `PascalCaseError` suffix (e.g., `BadRequestError`).                                  |
| Should we introduce an interface for `AuthRepository`?   | Yes – create `AuthRepositoryPort` to allow mocking in tests.                               |

---

## 8. Risks & Mitigations

- **Risk:** Introducing breaking changes to error messages.  
  **Mitigation:** Keep error message strings identical; only add new error classes without altering existing ones.
- **Risk:** Test suite may surface hidden bugs.  
  **Mitigation:** Run the full test suite after each refactor step; treat failing tests as a signal to halt and adjust.
- **Risk:** Prettier formatting conflicts.  
  **Mitigation:** Run `npm run fmt` automatically in CI; resolve any conflicts before commit.

---

### Next Steps

1. **User Approval** – Please review the design above and confirm it aligns with your expectations.
2. **Implementation** – Once approved, I will proceed to execute the steps outlined in Section 6, starting with moving the DTO schemas.

</details>

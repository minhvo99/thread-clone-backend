# Social Backend Agent Rules

These rules apply to the Social backend project.

Global rules still apply. This file only adds Social-backend-specific rules and does not replace the global behavioral guidelines.

## Rule Priority

Follow rules in this order:

1. User’s explicit instruction in the current task
2. Folder-specific `AGENTS.md`
3. This Social backend `AGENTS.md`
4. Global `AGENTS.md`
5. Installed Agent Skills

If rules conflict, the rule with the highest numerical priority (1 being highest) wins.

## Global Behavioral Baseline

Always follow the global project guidelines:

* Think before coding.
* State assumptions and uncertainty.
* Prefer simple solutions.
* Make surgical changes only.
* Do not refactor unrelated code.
* Define verifiable success criteria before implementation — output your success criteria in your initial response and wait for user approval before beginning.
* For multi-step work, state a short plan and verification method.

These global rules emphasize minimal, reviewable changes and avoiding speculative implementation.

## Skill Sources

Use the installed Agent Skills as implementation references. If a skill file cannot be found at the specified path, halt and inform the user rather than guessing the implementation pattern.

* `<project-root>/.agents/skills/nodejs-backend-patterns/SKILL.md`
* `<project-root>/.agents/skills/database-migrations/SKILL.md`
* `<project-root>/.agents/skills/postgres-patterns/SKILL.md`
* `<project-root>/.agents/skills/supabase/SKILL.md`
* `<project-root>/.agents/skills/supabase-postgres-best-practices/SKILL.md`

Do not duplicate generic skill guidance in this file. Use this file only for project-specific constraints.

Do not add new frameworks, middleware, database clients, queue systems, cache layers, or production dependencies from skill examples without explicit user approval.

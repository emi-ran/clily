# AGENTS.md

This file is for coding agents working in this repository.

## Project Summary

- Project name: `clily`
- Type: Node.js CLI written in TypeScript
- Runtime: Node `>=20.11.0`
- Module system: ESM (`"type": "module"`)
- Entry point: `src/index.ts`
- Output directory: `dist/`
- Main purpose: turn natural language into a single shell command, apply local safety rules, and optionally run the command

## Rule Files

- No `AGENTS.md` existed before this file.
- No `.cursorrules` file was found.
- No `.cursor/rules/` directory was found.
- No `.github/copilot-instructions.md` file was found.
- If any of those files are added later, update this file to reflect them.

## Install And Build Commands

- Install dependencies: `npm install`
- Type-check the project: `npm run check`
- Build the project: `npm run build`
- Run tests: `npm run test`
- Run in dev mode: `npm run dev -- "git status"`
- Run setup in dev mode: `npm run dev -- --setup`

## Lint And Test Status

- There is currently no linter configured.
- Tests use the built-in Node test runner via `tsx --test`.
- Agents should run `npm run check`, `npm run build`, and `npm run test` after meaningful code changes.

## Single Test Guidance

- Run all tests: `npm run test`
- Run one file: `npx tsx --test tests/config-store.test.ts`
- Run one test name: `npx tsx --test --test-name-pattern "saveConfig" tests/config-store.test.ts`
- There is no watch mode configured today.
- Standard validation steps:
  - `npm run check`
  - `npm run build`
  - `npm run test`
  - optionally run `npm run dev -- --help`

## Key Commands For Manual Verification

- Show global help: `npm run dev -- --help`
- Show config help: `npm run dev -- config --help`
- Show safety help: `npm run dev -- safety --help`
- Show config: `npm run dev -- config show`
- Run setup: `npm run dev -- setup`
- Try prompt flow: `npm run dev -- "node sürümünü göster"`

## Architecture Overview

- `src/index.ts`: main CLI command tree and command dispatch
- `src/setup.ts`: interactive setup wizard
- `src/config/`: config defaults, schema, paths, and persistence
- `src/config/secrets.ts`: encrypted provider secret storage
- `src/lib/gemini.ts`: Gemini provider integration
- `src/lib/groq.ts`: Groq provider integration
- `src/lib/provider.ts`: provider dispatch layer
- `src/lib/safety.ts`: allowlist, warnlist, denylist logic
- `src/lib/runner.ts`: run/cancel flow and command execution
- `src/lib/history.ts`: shell history loading and masking
- `src/lib/session.ts`: last execution capture for future context
- `src/lib/format.ts`: readable CLI output for config and safety lists
- `src/types.ts`: shared project types

## Documentation Files

- `README.md`: user-facing project documentation
- `PROJECT_PLAN.md`: phased roadmap, bugs, and change history
- `NEXT_SESSION.md`: handoff file for continuing work in a new chat
- `AGENTS.md`: this file, for coding agents

## Code Style

### General

- Use TypeScript with `strict` mode in mind.
- Keep code ESM-compatible.
- Prefer small focused functions over large monolithic blocks.
- Keep CLI output concise and readable.
- Preserve existing wording style in help messages and prompts.

### Imports

- Use `import` syntax only.
- Use `.js` extensions in local TypeScript imports, matching the current NodeNext setup.
- Group imports by source style:
  - package imports first
  - local project imports second
  - type-only imports last when reasonable
- Use `import type` for type-only imports.

### Formatting

- Follow the existing style already in the repo.
- Use double quotes, not single quotes.
- Use semicolons.
- Prefer trailing commas only when the surrounding style already has them; current code mostly omits them.
- Keep line length reasonable, but readability matters more than rigid wrapping.
- Prefer multi-line chained command builders when using `commander`.

### Naming

- Use `camelCase` for variables and functions.
- Use `PascalCase` for interfaces and types.
- Use descriptive names over abbreviations.
- Use explicit names for config paths, safety concepts, and provider behavior.
- Match existing terms exactly where they already exist, such as `allowlist`, `warnlist`, `denylist`, `historyLimit`, `maskSecrets`.

### Types

- Add or reuse shared types in `src/types.ts` when they are used across modules.
- Prefer precise union types over broad strings where possible.
- Prefer schema validation plus static typing together for untrusted data.
- Use `zod` to validate external API responses or persisted structured data.
- Do not bypass types with `any` unless absolutely unavoidable.
- If you must coerce a type, keep the cast local and justify it by context.

### Error Handling

- Throw `Error` instances with direct, readable messages.
- Fail early on missing config or malformed provider output.
- Treat prompt cancellation (`SIGINT`, force-closed prompt) as a normal exit path, not a crash.
- Validate external responses before trusting them.
- For provider fallbacks, prefer graceful degradation over silent failure.

### Config And Persistence

- Validate config changes through `configSchema` before saving.
- Keep config mutations centralized in `src/config/store.ts` when possible.
- Respect platform-specific config paths from `src/config/paths.ts`.
- Mask secrets before storing or reusing captured output when the config says to do so.

### CLI Behavior

- Keep help output discoverable and example-driven.
- Add descriptions for every command and subcommand.
- If a new command is added, update help text with at least one example.
- Prefer readable terminal messages over overly technical wording.
- Do not remove the existing `Run` / `Cancel` safety flow without a clear reason.

### Provider Integrations

- Keep provider-specific code inside provider modules.
- Keep shared provider dispatch in `src/lib/provider.ts`.
- Use structured output when the provider/model supports it.
- Keep local normalization for partial provider output close to the provider implementation.
- Do not assume all models support the same schema guarantees.

### Safety Rules

- Local safety logic is critical; changes here need extra care.
- Preserve the separation between `allowlist`, `warnlist`, and `denylist`.
- Prefer explicit blocking for dangerous patterns.
- Avoid making auto-run behavior broader without considering `mode` semantics.

### Comments

- Do not add comments unless they help explain non-obvious logic.
- Prefer self-explanatory names and small functions over explanatory comments.

## Agent Workflow Expectations

- Before major edits, read the relevant files directly.
- After significant code changes, run:
  - `npm run check`
  - `npm run build`
- If you change behavior, update docs that describe it.
- For substantial milestones, update `PROJECT_PLAN.md` change history.
- If your changes affect onboarding or future sessions, update `README.md` and `NEXT_SESSION.md` too.

## High-Value Next Areas

- local fast-paths for obvious commands
- model filtering and ranking improvements
- keychain or env-based secret storage
- better context selection for correction-style prompts
- broader test coverage

## Do Not Assume

- There is no linter today.
- There is a small test suite today, but coverage is still limited.
- There are no Cursor or Copilot rule files today.
- There is no npm publish pipeline finalized yet.

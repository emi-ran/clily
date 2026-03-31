# Clily Project Plan

## Vision

`clily` is a CLI assistant that converts natural language into a single shell command, checks it against local safety rules, and then lets the user run or cancel it.

## Product Goals

- Fast command generation from natural language
- OS and shell aware output
- Single-line command output only
- Safe execution flow with configurable trust modes
- Optional history-aware correction without leaking secrets
- Configurable setup wizard with provider/model selection

## Current Scope

- Initial providers: Gemini, Groq
- Initial package target: npm package
- Initial implementation language: TypeScript

## Phases

### Phase 0 - Foundation

- [x] Define MVP behavior and command flow
- [x] Decide config file location and format
- [x] Decide secret storage approach for API keys
- [x] Define structured output schema
- [x] Define allowlist / warnlist / denylist behavior

### Phase 1 - Project Bootstrap

- [x] Initialize TypeScript CLI project
- [x] Add basic test setup
- [ ] Add linting and formatting setup
- [x] Add CLI entry point
- [x] Add argument parsing
- [x] Add basic logging/output helpers

### Phase 2 - Setup Wizard

- [x] Implement first-run detection
- [x] Implement `--setup` command
- [x] Add mode selection (`safe`, `balanced`, `auto`)
- [x] Add provider selection
- [x] Add Gemini API key setup
- [x] Fetch and list Gemini models dynamically
- [x] Save and reload config

### Phase 3 - AI Command Generation

- [x] Add OS detection
- [x] Add shell detection
- [x] Add Gemini client integration
- [x] Add structured JSON response parsing
- [x] Add strict system prompt for safe command generation
- [x] Add fallback handling for invalid model output

### Phase 4 - Safety Layer

- [x] Implement command classification
- [x] Implement allowlist matching
- [x] Implement warnlist matching
- [x] Implement denylist matching
- [x] Block empty / ambiguous / unsafe outputs
- [x] Add confirmation prompts based on selected mode

### Phase 5 - Execution Flow

- [x] Show generated command clearly in terminal
- [x] Offer `Run` / `Cancel` interaction
- [x] Add `--run` support
- [x] Add safe execution wrapper
- [x] Capture stdout / stderr for future context use

### Phase 6 - History and Context

- [x] Read shell history from supported shells
- [x] Add `historyLimit` config (default `20`)
- [x] Disable history when `historyLimit=0`
- [x] Mask secrets before sending context to provider
- [x] Add local command history fallback for shells without reliable native history support
- [ ] Add optional history-aware correction flow
- [x] Add support for using previous errors as context

### Phase 7 - Config Management

- [x] Add config display command
- [x] Add config edit/update command
- [x] Add allowlist management command
- [x] Add warnlist management command
- [x] Add denylist management command
- [x] Add privacy settings management

### Phase 8 - Packaging and Release

- [x] Prepare npm package metadata
- [x] Add build pipeline
- [ ] Test global install flow
- [x] Add README and usage docs
- [x] Publish first package version

## MVP Definition

- [x] `clily --setup` works end-to-end
- [x] User can configure Gemini API key and model
- [x] `clily "..."` returns one command only
- [x] Command is validated by local safety layer
- [x] User can run or cancel from terminal prompt
- [x] History can be enabled, limited, or disabled

## Open Questions

- [x] Where should config live on Windows/macOS/Linux?
- [x] Should API keys be stored in config, env vars, or keychain?
- [ ] Should `auto` mode still force confirmation for warnlist commands?
- [x] How strict should command parsing be when model output is malformed?
- [ ] How much shell-specific behavior should MVP support?

## Bugs

Use this section to track active and resolved issues.

### Active

- [ ] Model filtering may still need tuning as Gemini API capability metadata includes some non-command models that are technically visible via the API.
- [ ] Groq model filtering is currently name-based and may need tuning once real model usage patterns are clearer.
- [ ] Groq structured output support varies by model, so non-GPT-OSS models currently fall back to JSON object mode.
- [ ] Published package install visibility should be rechecked after npm registry propagation with `npm view @emiran/clily version` and a fresh install test.

### Resolved

- [x] Gemini setup model picker initially hid newer models because raw HTTP parsing/filtering did not reflect the official SDK model metadata. Moving to `@google/genai` fixed the main visibility issue.
- [x] Provider responses could fail hard when `riskLevel` came back in an unexpected format. Result normalization now tolerates imperfect provider JSON and falls back safely.
- [x] Raw provider parse and validation failures could leak technical JSON/Zod errors to the CLI. Provider errors are now mapped to user-friendly messages.
- [x] Provider API keys were stored in plaintext config. They are now written to a separate encrypted local secrets file.
- [x] Plaintext `provider.apiKey` fallback in `config.json` kept the old storage path alive. Config loading now rejects plaintext keys and only uses encrypted secret storage.

## Change History

Record notable edits here so a future session can quickly resume.

| Date | Author | Change |
| --- | --- | --- |
| 2026-03-30 | OpenCode | Created initial phased project plan, MVP checklist, bug tracker, and change history sections. |
| 2026-03-30 | OpenCode | Bootstrapped the TypeScript CLI, added config storage, shell and OS detection, Gemini model listing, and a first-run setup wizard. |
| 2026-03-30 | OpenCode | Added Gemini command generation with structured output, local safety evaluation, history loading and masking, and interactive run/cancel execution flow. |
| 2026-03-30 | OpenCode | Migrated Gemini integration to `@google/genai` so setup and generation use the official SDK instead of raw HTTP calls. |
| 2026-03-30 | OpenCode | Simplified Gemini setup back to a single filtered picker and tightened model filtering to hide non-command models like embedding, TTS, and live variants. |
| 2026-03-30 | OpenCode | Added Groq as a second provider, including setup-time provider selection, Groq model listing, and OpenAI-compatible structured command generation. |
| 2026-03-30 | OpenCode | Switched Groq generation to `groq-sdk` and added model-aware structured output fallback to avoid 400 errors on models without strict schema support. |
| 2026-03-30 | OpenCode | Added session execution capture so the last command, exit code, stdout, and stderr are saved and can be reused as future context. |
| 2026-03-30 | OpenCode | Added `config` and `safety` commands for updating settings and rules, plus clearer CLI help text with examples. |
| 2026-03-30 | OpenCode | Added `README.md` and `NEXT_SESSION.md` so the project can be resumed easily in a future chat. |
| 2026-03-31 | OpenCode | Normalized provider command results so malformed `riskLevel` values no longer crash generation and instead fall back to safe defaults. |
| 2026-03-31 | OpenCode | Added user-friendly provider error mapping so malformed JSON, auth issues, rate limits, and network failures show readable CLI messages. |
| 2026-03-31 | OpenCode | Moved provider API keys out of `config.json` into an encrypted local secrets file and added a first automated test suite with `npm run test`. |
| 2026-03-31 | OpenCode | Removed plaintext API key fallback from `config.json`; config loading now requires encrypted secret storage only. |
| 2026-03-31 | OpenCode | Added `clily config doctor` to inspect config health, plaintext key mistakes, and encrypted secret availability. |
| 2026-03-31 | OpenCode | Polished CLI output with shared terminal UI helpers and improved setup, preview, and config presentation. |
| 2026-03-31 | OpenCode | Added local command history fallback so command context still works when shell-native history is unavailable or limited. |
| 2026-03-31 | OpenCode | Updated `--run` behavior so low-risk commands in balanced mode can skip confirmation unless warnlist, denylist, or blocked rules apply. |
| 2026-03-31 | OpenCode | Prepared the package for npm release with scoped metadata, clean builds, `prepack` validation, and release docs including English and Turkish READMEs plus `CONTRIBUTING.md`. |
| 2026-03-31 | OpenCode | Switched the package scope to `@emiran` after confirming the npm account name and published the first public package version. |

## Notes

- Keep this file updated as implementation decisions become final.
- When a bug is fixed, move it from `Active` to `Resolved` with a short note.
- Add a new row to `Change History` for meaningful project updates.

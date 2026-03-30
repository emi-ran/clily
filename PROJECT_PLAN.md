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
- [ ] Decide secret storage approach for API keys
- [x] Define structured output schema
- [x] Define allowlist / warnlist / denylist behavior

### Phase 1 - Project Bootstrap

- [x] Initialize TypeScript CLI project
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
- [ ] Capture stdout / stderr for future context use

### Phase 6 - History and Context

- [x] Read shell history from supported shells
- [x] Add `historyLimit` config (default `20`)
- [x] Disable history when `historyLimit=0`
- [x] Mask secrets before sending context to provider
- [ ] Add optional history-aware correction flow
- [ ] Add support for using previous errors as context

### Phase 7 - Config Management

- [x] Add config display command
- [ ] Add config edit/update command
- [ ] Add allowlist management command
- [ ] Add warnlist management command
- [ ] Add denylist management command
- [ ] Add privacy settings management

### Phase 8 - Packaging and Release

- [ ] Prepare npm package metadata
- [ ] Add build pipeline
- [ ] Test global install flow
- [ ] Add README and usage docs
- [ ] Publish first package version

## MVP Definition

- [ ] `clily --setup` works end-to-end
- [ ] User can configure Gemini API key and model
- [x] `clily "..."` returns one command only
- [x] Command is validated by local safety layer
- [x] User can run or cancel from terminal prompt
- [ ] History can be enabled, limited, or disabled

## Open Questions

- [ ] Where should config live on Windows/macOS/Linux?
- [ ] Should API keys be stored in config, env vars, or keychain?
- [ ] Should `auto` mode still force confirmation for warnlist commands?
- [ ] How strict should command parsing be when model output is malformed?
- [ ] How much shell-specific behavior should MVP support?

## Bugs

Use this section to track active and resolved issues.

### Active

- [ ] Model filtering may still need tuning as Gemini API capability metadata includes some non-command models that are technically visible via the API.
- [ ] Groq model filtering is currently name-based and may need tuning once real model usage patterns are clearer.
- [ ] Groq structured output support varies by model, so non-GPT-OSS models currently fall back to JSON object mode.

### Resolved

- [x] Gemini setup model picker initially hid newer models because raw HTTP parsing/filtering did not reflect the official SDK model metadata. Moving to `@google/genai` fixed the main visibility issue.

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

## Notes

- Keep this file updated as implementation decisions become final.
- When a bug is fixed, move it from `Active` to `Resolved` with a short note.
- Add a new row to `Change History` for meaningful project updates.

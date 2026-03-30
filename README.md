# Clily

`clily` turns natural language into a single shell command, checks it against local safety rules, and then lets you run or cancel it.

NPM package name: `@emi-ran/clily`
CLI command: `clily`

## Current Status

- TypeScript CLI project is set up
- Gemini and Groq providers are supported
- First-run setup wizard is implemented
- Local safety layer is implemented
- Shell history and last command output can be used as context
- Config and safety rules can be managed from the CLI
- Provider API keys are stored in an encrypted local secrets file

## Install

Global install after publish:

```bash
npm install -g @emi-ran/clily
```

Then run:

```bash
clily --setup
clily "git status"
```

Local development install:

```bash
npm install
```

## Run In Dev Mode

```bash
npm run dev -- --setup
```

Then try:

```bash
npm run dev -- "git status"
npm run dev -- "node sürümünü göster"
npm run dev -- "choco ile ruby kur" --run
```

## Build

```bash
npm run build
npm run test
node dist/index.js --help
```

## Platform Support

- Windows: PowerShell and CMD
- macOS: bash and zsh
- Linux: bash and zsh

Clily detects the current shell and asks the model for shell-appropriate commands.

## Setup Flow

Run setup anytime with:

```bash
clily --setup
```

or in dev mode:

```bash
npm run dev -- --setup
```

Setup currently asks for:

- AI provider
- execution mode
- API key
- provider model
- secret masking
- history usage
- history limit

API keys are not written to `config.json`. They are stored in a separate encrypted file under the same config directory.

If you publish or install the package globally, setup is still the first thing to run:

```bash
clily --setup
```

## Main Usage

```bash
clily "git status"
clily "dotnetin hangi sürümleri yüklü"
clily "docker containeri sil" --run
```

Default flow:

1. Your request is sent to the selected provider.
2. The model returns one shell command.
3. Local safety rules evaluate the command.
4. Clily shows the command, risk, reason, and warnings.
5. You choose `Run` or `Cancel` unless the selected mode allows auto-run.

Examples:

```bash
clily "git status"
clily "node surumunu goster"
clily "ruby kurulu mu"
clily "docker containeri sil" --run
```

## Safety Modes

- `safe`: always ask before running
- `balanced`: allowlist commands can auto-run, others ask
- `auto`: run directly unless blocked locally

## Safety Rules

Clily uses three local rule groups:

- `allowlist`: trusted commands
- `warnlist`: commands that should ask for confirmation
- `denylist`: blocked commands

Examples:

```bash
clily safety allow list
clily safety allow add "git status"
clily safety warn add "docker rm *"
clily safety deny add "rm -rf *"
clily safety deny remove "rm -rf *"
```

## Config Commands

Show config:

```bash
clily config show
clily config path
clily config doctor
```

Update config values:

```bash
clily config set mode auto
clily config set provider.name groq
clily config set provider.model openai/gpt-oss-20b
clily config set privacy.sendHistory false
clily config set history.historyLimit 10
clily config set provider.apiKey YOUR_KEY
```

Health check:

```bash
clily config doctor
```

This checks whether:

- config exists
- encrypted secrets file exists
- config is valid
- plaintext API keys were written by mistake
- the current provider has an encrypted API key

Supported `config set` keys:

- `mode`
- `provider.name`
- `provider.model`
- `provider.apiKey`
- `shell`
- `privacy.maskSecrets`
- `privacy.sendHistory`
- `history.historyLimit`

## Secret Storage

- `config.json` keeps non-secret settings only
- provider API keys are stored in `secrets.enc.json`
- the secrets file is encrypted locally before it is written to disk
- if you need a stable custom encryption secret across machines, set `CLILY_SECRET_KEY`
- plaintext `provider.apiKey` inside `config.json` is not supported

Important notes:

- encrypted local storage is better than plaintext config, but it is not a full OS keychain yet
- if you move your config between machines, decryption can fail unless `CLILY_SECRET_KEY` is also preserved

## Context Behavior

Clily can use two local context sources:

- shell history
- last executed command record

Current behavior:

- shell history is read from the configured shell history file
- secret-like values can be masked before being sent to the provider
- the last command's `stdout`, `stderr`, and `exitCode` are stored locally and reused as context

## Providers

### Gemini

- Uses `@google/genai`
- Setup lists Gemini models from the API
- Structured output is used for command generation

### Groq

- Uses `groq-sdk`
- Setup lists Groq models from the API
- Structured output behavior depends on model support
- Best results currently come from `openai/gpt-oss-20b` or `openai/gpt-oss-120b`

## Helpful Commands

```bash
clily --help
clily config --help
clily safety --help
clily config doctor
npm run test
```

## Release Smoke Test

Before publishing, these are the minimum checks:

```bash
npm run check
npm run build
npm run test
npm pack
```

Manual smoke test after install:

```bash
clily --help
clily --setup
clily config show
clily config doctor
clily "ruby kurulu mu"
```

## Project Files

- `PROJECT_PLAN.md`: phased roadmap, bugs, history
- `NEXT_SESSION.md`: handoff note for the next chat/session
- `README.md`: usage and project documentation

## Known Gaps

- keychain-backed secret storage is not implemented yet
- model filtering may still need tuning for some providers
- local fast-paths and prompt/result cache are not implemented yet

## Development Notes

Before continuing development, check:

- `PROJECT_PLAN.md`
- `NEXT_SESSION.md`

Then run:

```bash
npm run check
npm run build
```

# Clily

English | [Türkçe](README.tr.md)

`clily` turns natural language into a single shell command, checks it against local safety rules, and lets you run or cancel it.

![Clily command preview and run flow](assets/preview-run.png)

NPM package: `@emiran/clily`
CLI command: `clily`

## Why Clily

- Turn plain English into shell commands
- Keep a local safety layer between the model and your terminal
- Review the generated command before execution
- Reuse local context such as recent shell history and the last command result
- Work across Windows, macOS, and Linux

## Features

- Gemini, Groq, OpenAI, and OpenRouter provider support
- Interactive setup wizard
- Safety modes: `safe`, `balanced`, `auto`
- Local `allowlist`, `warnlist`, and `denylist`
- Secure local API key storage
- Config management from the CLI
- Config health check with `clily config doctor`
- Terminal UI with readable previews and confirmations

## Platform Support

- Windows: PowerShell and CMD
- macOS: bash and zsh
- Linux: bash and zsh

Clily detects your current shell and asks the model for shell-appropriate commands.

## Install

Requirements: Node.js `>=20.11.0`

```bash
npm install -g @emiran/clily
```

Clily may occasionally check whether a newer npm version is available.
Disable this with `CLILY_DISABLE_UPDATE_CHECK=1`.

## Quick Start

Run setup first:

```bash
clily --setup
```

You can also run setup again later with:

```bash
clily setup
```

![Clily setup flow](assets/setup-flow.png)

Then try a few prompts:

```bash
clily "show git status"
clily "check whether Ruby is installed"
clily "list running Docker containers"
```

If local rules allow it, you can also run directly:

```bash
clily "show Node.js version" --run
```

`--run` tells Clily to execute the generated command when your safety mode allows it.

## How It Works

1. You write a natural-language request.
2. Clily asks the selected model for one shell command.
3. The command is checked against local safety rules.
4. Clily shows a preview with command, risk, and reason.
5. Clily asks for confirmation or runs it directly, depending on your mode.

## Safety Model

Clily uses three local rule groups:

- `allowlist`: trusted commands
- `warnlist`: commands that should require confirmation
- `denylist`: commands that should be blocked

Safety modes:

- `safe`: always ask before running
- `balanced`: allow trusted commands to auto-run, confirm others
- `auto`: run commands without confirmation unless a local rule blocks them

Manage rules from the CLI:

```bash
clily safety allow list
clily safety allow add "git status"
clily safety warn add "docker rm *"
clily safety deny add "rm -rf *"
```

## Configuration

Useful commands:

```bash
clily config show
clily config path
clily config doctor
clily config set mode auto
clily config set provider.name groq
clily config set provider.model openai/gpt-oss-20b
clily config set provider.apiKey YOUR_KEY
```

`clily config doctor` checks for common setup, config, and API key problems.

![Clily config overview](assets/config-overview.png)

## Privacy And Secret Storage

- secret-like values can be masked before context is sent to a provider
- shell history can be enabled, limited, or disabled
- the last command result can be reused as local context

## Providers

### Gemini

- Model selection is available during setup

### Groq

- Works best today with `openai/gpt-oss-20b` and `openai/gpt-oss-120b`

### OpenAI

- Defaults to `gpt-4o-mini`

### OpenRouter

- Model selection is available during setup

## Documentation

- [Turkish README](README.tr.md)
- [Contributing Guide](CONTRIBUTING.md)

## Development

For local development:

```bash
npm install
npm run check
npm run build
npm run test
npm run dev -- --setup
```

Package preflight:

```bash
npm pack
```

## Contributing

Issues and pull requests are welcome.

- Bug reports and feature requests: use GitHub Issues
- Code contributions: open a pull request
- Before opening a PR, run:

```bash
npm run check
npm run build
npm run test
```

More details: [CONTRIBUTING.md](CONTRIBUTING.md)

## Support

If something looks wrong or confusing:

- open an issue for bugs or unexpected behavior
- open an issue for docs or setup problems
- include your platform, shell, provider, and the command you ran when possible

## License

[MIT](LICENSE)

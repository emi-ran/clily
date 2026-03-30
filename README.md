# Clily

English | [Türkçe](README.tr.md)

`clily` turns natural language into a single shell command, checks it against local safety rules, and lets you run or cancel it.

NPM package: `@emiran/clily`
CLI command: `clily`

## Why Clily

- Turn plain English into shell commands
- Keep a local safety layer between the model and your terminal
- Review the generated command before execution
- Reuse local context such as recent shell history and the last command result
- Work across Windows, macOS, and Linux

## Features

- Gemini and Groq provider support
- Interactive setup wizard
- Safety modes: `safe`, `balanced`, `auto`
- Local `allowlist`, `warnlist`, and `denylist`
- Encrypted local API key storage
- Config management from the CLI
- Config health check with `clily config doctor`
- Terminal UI with readable previews and confirmations

## Platform Support

- Windows: PowerShell and CMD
- macOS: bash and zsh
- Linux: bash and zsh

Clily detects your current shell and asks the model for shell-appropriate commands.

## Install

```bash
npm install -g @emiran/clily
```

## Quick Start

Run setup first:

```bash
clily --setup
```

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

## How It Works

1. You write a natural-language request.
2. Clily asks the selected model for one shell command.
3. The command is checked against local safety rules.
4. Clily shows a preview with command, risk, and reason.
5. You choose `Run` or `Cancel` unless your mode allows auto-run.

## Safety Model

Clily uses three local rule groups:

- `allowlist`: trusted commands
- `warnlist`: commands that should require confirmation
- `denylist`: commands that should be blocked

Safety modes:

- `safe`: always ask before running
- `balanced`: allow trusted commands to auto-run, confirm others
- `auto`: run directly unless blocked locally

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

`clily config doctor` checks whether:

- config exists
- encrypted secret storage exists
- config is valid
- plaintext API keys were written by mistake
- the selected provider has an encrypted API key

## Privacy And Secret Storage

- API keys are not stored in `config.json`
- provider keys are stored in a separate encrypted local file
- secret-like values can be masked before context is sent to a provider
- shell history can be enabled, limited, or disabled
- the last command result can be reused as local context

Note: encrypted local storage is safer than plaintext config, but it is not an OS keychain yet.

## Providers

### Gemini

- Uses `@google/genai`
- Lists available Gemini models during setup
- Uses structured output for command generation

### Groq

- Uses `groq-sdk`
- Lists available Groq models during setup
- Works best today with `openai/gpt-oss-20b` and `openai/gpt-oss-120b`

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

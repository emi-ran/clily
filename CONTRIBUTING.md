# Contributing to Clily

Thanks for your interest in contributing.

## Before You Start

- use Node.js `>=20.11.0`
- install dependencies with `npm install`
- read `README.md` for product behavior and CLI usage

## Local Setup

```bash
npm install
npm run check
npm run build
npm run test
npm run dev -- --setup
```

## Development Guidelines

- keep CLI output short, readable, and user-focused
- preserve the local safety model
- prefer small focused changes over broad refactors
- update docs when user-visible behavior changes
- avoid storing secrets in plaintext

## Pull Requests

Before opening a pull request, make sure:

- `npm run check` passes
- `npm run build` passes
- `npm run test` passes
- relevant docs are updated

In your PR description, include:

- what changed
- why it changed
- how you tested it

## Issues

When opening an issue, try to include:

- operating system
- shell (`powershell`, `cmd`, `bash`, `zsh`)
- selected provider and model
- the prompt you used
- the command Clily generated
- the unexpected behavior or error message

## Security

Do not open public issues with real API keys, tokens, or sensitive command history.

If you are reporting a security-sensitive issue, share only the minimum information needed to reproduce it safely.

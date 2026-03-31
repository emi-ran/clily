# Next Session Handoff

Use this file to quickly resume work on `clily` in a new chat.

## Current Project State

- Core CLI is working
- Setup wizard is working
- Provider generation now uses AI SDK adapters with lazy-loaded provider modules
- Gemini, Groq, OpenAI, and OpenRouter are supported providers
- Local safety layer is working
- Config and safety management commands are implemented
- Last command execution is stored and reused as context
- API keys are stored in an encrypted local secrets file
- Basic test setup is now available via `npm run test`
- Plaintext `provider.apiKey` in `config.json` is intentionally rejected
- There are unpublished local changes for malformed JSON recovery, `.tgz` gitignore cleanup, and source map removal from published output
- `0.1.1` is still the next intended release version and has not been published yet

## Important Files

- `PROJECT_PLAN.md` - roadmap, bugs, change history
- `README.md` - user/developer documentation
- `src/index.ts` - main CLI command tree
- `src/setup.ts` - setup wizard
- `src/lib/gemini.ts` - Gemini provider adapter and live model listing
- `src/lib/groq.ts` - Groq provider adapter and live model listing
- `src/lib/openai.ts` - OpenAI provider adapter and live model listing
- `src/lib/openrouter.ts` - OpenRouter provider adapter and live model listing
- `src/lib/provider.ts` - provider dispatch
- `src/lib/provider-shared.ts` - shared AI SDK generation flow and prompt/schema helpers
- `src/lib/safety.ts` - local safety evaluation
- `src/lib/runner.ts` - run/cancel and command execution
- `src/lib/history.ts` - shell history loading
- `src/lib/session.ts` - last execution capture
- `src/config/store.ts` - config load/save/update logic
- `src/config/secrets.ts` - encrypted API key storage

## Commands To Know

```bash
npm install
npm run check
npm run build
npm run test
npm run dev -- --setup
npm run dev -- "git status"
npm run dev -- --help
```

## What Already Works

- natural language to one command
- provider selection in setup
- live model selection in setup with retry, API key validation, and explicit fallback messaging
- safe/balanced/auto modes
- allowlist/warnlist/denylist evaluation
- run/cancel prompt
- `config show`
- `config path`
- `config doctor`
- `config set <path> <value>`
- `safety allow|warn|deny list|add|remove`
- encrypted provider secret storage
- basic unit tests for config storage, safety, and command normalization
- malformed near-JSON provider responses are repaired before final parse when possible

## Recommended Next Work

1. Commit and later publish the still-unreleased local changes (`.gitignore`, `tsconfig.json`, `src/lib/provider-shared.ts`, `tests/provider-shared.test.ts`)
2. Improve provider model filtering and ranking, especially for OpenRouter
3. Add keychain-backed secret storage as an optional upgrade path
4. Add better context selection for prompts like "komutun doğrusunu yaz"
5. Expand automated test coverage around provider adapters and setup flow

## Known Issues / Watchouts

- Some providers may still return imperfect structured output, so text fallback remains important
- OpenRouter model metadata is broad and may need more filtering/ranking over time
- Shell history behavior can differ by shell and may not always reflect the very latest command instantly

## Suggested Prompt For The Next Chat

```text
Projeye `C:\Users\enes\Desktop\clily` klasorunde devam edelim. Once `PROJECT_PLAN.md`, `NEXT_SESSION.md` ve `README.md` dosyalarini oku. Sonra mevcut durumu kisaca ozetle ve plandaki bir sonraki mantikli adimi uygula. Kod degisikligi yaparsan `npm run check` ve `npm run build` calistir. Mevcut davranisi bozma, mevcut CLI komut yapisina sadik kal.
```

## Reminder

- Update `PROJECT_PLAN.md` after meaningful changes
- Add a new `Change History` row for important milestones
- Keep docs in sync with actual commands and behavior

# Next Session Handoff

Use this file to quickly resume work on `clily` in a new chat.

## Current Project State

- Core CLI is working
- Setup wizard is working
- Gemini provider is integrated with `@google/genai`
- Groq provider is integrated with `groq-sdk`
- Local safety layer is working
- Config and safety management commands are implemented
- Last command execution is stored and reused as context

## Important Files

- `PROJECT_PLAN.md` - roadmap, bugs, change history
- `README.md` - user/developer documentation
- `src/index.ts` - main CLI command tree
- `src/setup.ts` - setup wizard
- `src/lib/gemini.ts` - Gemini provider logic
- `src/lib/groq.ts` - Groq provider logic
- `src/lib/provider.ts` - provider dispatch
- `src/lib/safety.ts` - local safety evaluation
- `src/lib/runner.ts` - run/cancel and command execution
- `src/lib/history.ts` - shell history loading
- `src/lib/session.ts` - last execution capture
- `src/config/store.ts` - config load/save/update logic

## Commands To Know

```bash
npm install
npm run check
npm run build
npm run dev -- --setup
npm run dev -- "git status"
npm run dev -- --help
```

## What Already Works

- natural language to one command
- provider selection in setup
- model selection in setup
- safe/balanced/auto modes
- allowlist/warnlist/denylist evaluation
- run/cancel prompt
- `config show`
- `config path`
- `config set <path> <value>`
- `safety allow|warn|deny list|add|remove`

## Recommended Next Work

1. Add local fast-paths for obvious commands like `git status`, `node -v`, `python --version`
2. Improve provider model filtering and ranking
3. Add README polish for npm publish/global install flow
4. Add keychain or env-based API key storage
5. Add better context selection for prompts like "komutun doğrusunu yaz"

## Known Issues / Watchouts

- Groq structured output support varies by model
- Gemini model metadata can include variants that are not ideal for command generation
- Shell history behavior can differ by shell and may not always reflect the very latest command instantly

## Suggested Prompt For The Next Chat

```text
Projeye `C:\Users\enes\Desktop\clily` klasorunde devam edelim. Once `PROJECT_PLAN.md`, `NEXT_SESSION.md` ve `README.md` dosyalarini oku. Sonra mevcut durumu kisaca ozetle ve plandaki bir sonraki mantikli adimi uygula. Kod degisikligi yaparsan `npm run check` ve `npm run build` calistir. Mevcut davranisi bozma, mevcut CLI komut yapisina sadik kal.
```

## Reminder

- Update `PROJECT_PLAN.md` after meaningful changes
- Add a new `Change History` row for important milestones
- Keep docs in sync with actual commands and behavior

import type { ClilyConfig } from "../types.js";

export const defaultConfig: ClilyConfig = {
  mode: "balanced",
  provider: {
    name: "gemini",
    model: "models/gemini-2.5-flash"
  },
  shell: "unknown",
  privacy: {
    maskSecrets: true,
    sendHistory: true
  },
  history: {
    historyLimit: 20
  },
  safety: {
    allowlist: [
      "git status",
      "npm install",
      "pnpm install",
      "choco install *"
    ],
    warnlist: [
      "winget install *",
      "docker rm *",
      "npm uninstall *"
    ],
    denylist: [
      "rm -rf *",
      "del /f /s *",
      "format *"
    ]
  }
};

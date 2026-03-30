import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getCommandHistoryPath } from "../src/config/paths.ts";
import { defaultConfig } from "../src/config/defaults.ts";
import { loadHistoryContext, saveCommandHistory } from "../src/lib/history.ts";
import type { ClilyConfig } from "../src/types.ts";

async function withTempAppData(run: () => Promise<void>): Promise<void> {
  const previousAppData = process.env.APPDATA;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "clily-history-test-"));
  process.env.APPDATA = tempRoot;

  try {
    await run();
  } finally {
    if (previousAppData === undefined) {
      delete process.env.APPDATA;
    } else {
      process.env.APPDATA = previousAppData;
    }

    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

function createConfig(overrides: Partial<ClilyConfig> = {}): ClilyConfig {
  return {
    ...defaultConfig,
    ...overrides,
    provider: {
      ...defaultConfig.provider,
      ...overrides.provider
    },
    privacy: {
      ...defaultConfig.privacy,
      ...overrides.privacy
    },
    history: {
      ...defaultConfig.history,
      ...overrides.history
    },
    safety: {
      ...defaultConfig.safety,
      ...overrides.safety
    }
  };
}

test("loadHistoryContext uses local command history for cmd", async () => {
  await withTempAppData(async () => {
    const config = createConfig({
      shell: "cmd",
      history: { historyLimit: 5 }
    });

    await saveCommandHistory(config, "dir");
    await saveCommandHistory(config, "git status");

    const history = await loadHistoryContext(config);

    assert.deepEqual(history, ["dir", "git status"]);
  });
});

test("saveCommandHistory masks secrets and dedupes adjacent commands", async () => {
  await withTempAppData(async () => {
    const config = createConfig({
      shell: "cmd",
      history: { historyLimit: 5 },
      privacy: {
        maskSecrets: true,
        sendHistory: true
      }
    });

    await saveCommandHistory(config, "set API_KEY=super-secret-value");
    await saveCommandHistory(config, "set API_KEY=super-secret-value");
    await saveCommandHistory(config, "echo done");

    const raw = await fs.readFile(getCommandHistoryPath(), "utf8");
    const history = await loadHistoryContext(config);

    assert.equal(raw.includes("super-secret-value"), false);
    assert.deepEqual(history, ["set API_KEY=[masked]", "echo done"]);
  });
});

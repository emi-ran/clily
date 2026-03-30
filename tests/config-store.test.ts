import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getConfigPath, getSecretsPath } from "../src/config/paths.ts";
import { createConfig, loadConfig, saveConfig } from "../src/config/store.ts";

async function withTempAppData(run: () => Promise<void>): Promise<void> {
  const previousAppData = process.env.APPDATA;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "clily-test-"));
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

test("saveConfig stores API key outside config.json", async () => {
  await withTempAppData(async () => {
    const config = createConfig({
      provider: {
        name: "gemini",
        model: "models/gemini-2.5-flash",
        apiKey: "super-secret-key"
      }
    });

    await saveConfig(config);

    const configRaw = await fs.readFile(getConfigPath(), "utf8");
    const secretRaw = await fs.readFile(getSecretsPath(), "utf8");
    const loaded = await loadConfig();

    assert.equal(configRaw.includes("super-secret-key"), false);
    assert.equal(secretRaw.includes("super-secret-key"), false);
    assert.equal(loaded.provider.apiKey, "super-secret-key");
  });
});

test("loadConfig rejects plaintext API keys in config.json", async () => {
  await withTempAppData(async () => {
    const configPath = getConfigPath();

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, `${JSON.stringify({
      mode: "balanced",
      provider: {
        name: "gemini",
        model: "models/gemini-2.5-flash",
        apiKey: "plaintext-key"
      },
      shell: "powershell",
      privacy: {
        maskSecrets: true,
        sendHistory: true
      },
      history: {
        historyLimit: 20
      },
      safety: {
        allowlist: [],
        warnlist: [],
        denylist: []
      }
    }, null, 2)}\n`, "utf8");

    await assert.rejects(
      () => loadConfig(),
      /Plaintext provider\.apiKey in config\.json is no longer supported/
    );
  });
});

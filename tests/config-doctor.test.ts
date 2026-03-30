import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getConfigPath } from "../src/config/paths.ts";
import { inspectConfigDoctor, saveConfig, createConfig } from "../src/config/store.ts";

async function withTempAppData(run: () => Promise<void>): Promise<void> {
  const previousAppData = process.env.APPDATA;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "clily-doctor-test-"));
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

test("inspectConfigDoctor reports healthy encrypted setup", async () => {
  await withTempAppData(async () => {
    await saveConfig(createConfig({
      provider: {
        name: "gemini",
        model: "models/gemini-2.5-flash",
        apiKey: "doctor-secret-key"
      }
    }));

    const report = await inspectConfigDoctor();

    assert.equal(report.configFileExists, true);
    assert.equal(report.secretsFileExists, true);
    assert.equal(report.configIsValid, true);
    assert.equal(report.plaintextApiKeyInConfig, false);
    assert.equal(report.apiKeyConfigured, true);
    assert.deepEqual(report.issues, []);
  });
});

test("inspectConfigDoctor flags plaintext API key in config", async () => {
  await withTempAppData(async () => {
    const configPath = getConfigPath();

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, `${JSON.stringify({
      mode: "balanced",
      provider: {
        name: "groq",
        model: "openai/gpt-oss-20b",
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

    const report = await inspectConfigDoctor();

    assert.equal(report.plaintextApiKeyInConfig, true);
    assert.equal(report.issues.length > 0, true);
  });
});

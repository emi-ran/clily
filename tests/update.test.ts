import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getUpdateStatePath } from "../src/config/paths.ts";
import {
  getUpdateNotification,
  isUpdateCheckEnabled,
  maybePrintUpdateNotification,
  readUpdateState,
  refreshUpdateState
} from "../src/lib/update.ts";

async function withTempAppData(run: () => Promise<void>): Promise<void> {
  const previousAppData = process.env.APPDATA;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "clily-update-test-"));
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

test("isUpdateCheckEnabled returns false when disabled by env", () => {
  assert.equal(isUpdateCheckEnabled({
    env: {
      CLILY_DISABLE_UPDATE_CHECK: "1"
    },
    isTTY: true
  }), false);
});

test("refreshUpdateState stores the latest npm version", async () => {
  await withTempAppData(async () => {
    const state = await refreshUpdateState({
      now: new Date("2026-04-04T12:00:00.000Z"),
      currentVersion: "0.1.1",
      packageName: "@emiran/clily",
      fetchLatestVersion: async () => "0.1.2"
    });

    assert.equal(state.latestVersion, "0.1.2");
    assert.equal(state.lastCheckedAt, "2026-04-04T12:00:00.000Z");

    const saved = JSON.parse(await fs.readFile(getUpdateStatePath(), "utf8")) as { latestVersion?: string };
    assert.equal(saved.latestVersion, "0.1.2");
  });
});

test("refreshUpdateState skips network calls while cache is fresh", async () => {
  await withTempAppData(async () => {
    await fs.mkdir(path.dirname(getUpdateStatePath()), { recursive: true });
    await fs.writeFile(getUpdateStatePath(), `${JSON.stringify({
      lastCheckedAt: "2026-04-04T12:00:00.000Z",
      latestVersion: "0.1.2"
    }, null, 2)}\n`, "utf8");

    let fetchCount = 0;
    const state = await refreshUpdateState({
      now: new Date("2026-04-04T18:00:00.000Z"),
      currentVersion: "0.1.1",
      packageName: "@emiran/clily",
      fetchLatestVersion: async () => {
        fetchCount += 1;
        return "0.1.3";
      }
    });

    assert.equal(fetchCount, 0);
    assert.equal(state.latestVersion, "0.1.2");
  });
});

test("getUpdateNotification returns a message for a newer version", () => {
  const notice = getUpdateNotification({
    state: {
      latestVersion: "0.1.2"
    },
    currentVersion: "0.1.1",
    packageName: "@emiran/clily"
  });

  assert.match(notice ?? "", /0\.1\.1 -> 0\.1\.2/);
  assert.match(notice ?? "", /npm install -g @emiran\/clily@latest/);
});

test("maybePrintUpdateNotification prints once for the same version", async () => {
  await withTempAppData(async () => {
    await fs.mkdir(path.dirname(getUpdateStatePath()), { recursive: true });
    await fs.writeFile(getUpdateStatePath(), `${JSON.stringify({
      latestVersion: "0.1.3"
    }, null, 2)}\n`, "utf8");

    const originalLog = console.log;
    const lines: string[] = [];
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true
    });
    console.log = (value?: unknown) => {
      lines.push(String(value ?? ""));
    };

    try {
      await maybePrintUpdateNotification();
      await maybePrintUpdateNotification();
    } finally {
      console.log = originalLog;
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalIsTTY,
        configurable: true
      });
    }

    assert.equal(lines.length, 1);
    assert.match(lines[0], /A newer Clily version is available/);

    const state = await readUpdateState();
    assert.equal(state.lastNotifiedVersion, "0.1.3");
  });
});

test("maybePrintUpdateNotification stays silent when update checks are disabled", async () => {
  await withTempAppData(async () => {
    await fs.mkdir(path.dirname(getUpdateStatePath()), { recursive: true });
    await fs.writeFile(getUpdateStatePath(), `${JSON.stringify({
      latestVersion: "0.1.2"
    }, null, 2)}\n`, "utf8");

    const originalLog = console.log;
    const previousDisable = process.env.CLILY_DISABLE_UPDATE_CHECK;
    const originalIsTTY = process.stdout.isTTY;
    const lines: string[] = [];
    process.env.CLILY_DISABLE_UPDATE_CHECK = "1";
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true
    });
    console.log = (value?: unknown) => {
      lines.push(String(value ?? ""));
    };

    try {
      await maybePrintUpdateNotification();
    } finally {
      console.log = originalLog;
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalIsTTY,
        configurable: true
      });

      if (previousDisable === undefined) {
        delete process.env.CLILY_DISABLE_UPDATE_CHECK;
      } else {
        process.env.CLILY_DISABLE_UPDATE_CHECK = previousDisable;
      }
    }

    assert.deepEqual(lines, []);
  });
});

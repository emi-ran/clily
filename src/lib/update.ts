import fs from "node:fs/promises";
import { createRequire } from "node:module";

import pc from "picocolors";
import { z } from "zod";

import { getConfigDir, getUpdateStatePath } from "../config/paths.js";
import { formatNotice } from "./ui.js";

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as { name: string; version: string };

const updateStateSchema = z.object({
  lastCheckedAt: z.string().datetime().optional(),
  latestVersion: z.string().min(1).optional(),
  lastNotifiedVersion: z.string().min(1).optional()
});

const npmRegistryResponseSchema = z.object({
  "dist-tags": z.object({
    latest: z.string().min(1)
  })
});

const updateCheckIntervalMs = 24 * 60 * 60 * 1000;
const updateFetchTimeoutMs = 1500;
const disableUpdateCheckEnvName = "CLILY_DISABLE_UPDATE_CHECK";

export interface UpdateState {
  lastCheckedAt?: string;
  latestVersion?: string;
  lastNotifiedVersion?: string;
}

export function isUpdateCheckEnabled(options: {
  env?: NodeJS.ProcessEnv;
  isTTY?: boolean;
} = {}): boolean {
  const env = options.env ?? process.env;
  const isTTY = options.isTTY ?? Boolean(process.stdout.isTTY);

  if (!isTTY || env.CI) {
    return false;
  }

  const disableFlag = env[disableUpdateCheckEnvName]?.trim().toLowerCase();
  return !["1", "true", "yes", "on"].includes(disableFlag ?? "");
}

export async function maybePrintUpdateNotification(): Promise<void> {
  if (!isUpdateCheckEnabled()) {
    return;
  }

  const state = await readUpdateState();
  const notice = getUpdateNotification({
    state,
    currentVersion: getCurrentPackageVersion(),
    packageName: getPackageName()
  });

  if (!notice || state.latestVersion === undefined) {
    return;
  }

  console.log(notice);
  await writeUpdateState({
    ...state,
    lastNotifiedVersion: state.latestVersion
  });
}

export function refreshUpdateStateInBackground(): void {
  if (!isUpdateCheckEnabled()) {
    return;
  }

  void refreshUpdateState().catch(() => {
    // Update checks should never interrupt normal CLI usage.
  });
}

export async function refreshUpdateState(options: {
  now?: Date;
  fetchLatestVersion?: (packageName: string) => Promise<string>;
  packageName?: string;
  currentVersion?: string;
} = {}): Promise<UpdateState> {
  const state = await readUpdateState();
  const now = options.now ?? new Date();
  const lastCheckedAt = state.lastCheckedAt ? Date.parse(state.lastCheckedAt) : Number.NaN;

  if (Number.isFinite(lastCheckedAt) && now.getTime() - lastCheckedAt < updateCheckIntervalMs) {
    return state;
  }

  const packageName = options.packageName ?? getPackageName();
  const fetchLatestVersion = options.fetchLatestVersion ?? fetchLatestPackageVersion;
  const latestVersion = await fetchLatestVersion(packageName);
  const currentVersion = options.currentVersion ?? getCurrentPackageVersion();
  const nextState: UpdateState = {
    ...state,
    lastCheckedAt: now.toISOString(),
    latestVersion
  };

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    nextState.lastNotifiedVersion = latestVersion;
  }

  await writeUpdateState(nextState);
  return nextState;
}

export function getUpdateNotification(options: {
  state: UpdateState;
  currentVersion: string;
  packageName: string;
}): string | null {
  const latestVersion = options.state.latestVersion;
  if (!latestVersion || compareVersions(latestVersion, options.currentVersion) <= 0) {
    return null;
  }

  if (options.state.lastNotifiedVersion === latestVersion) {
    return null;
  }

  return [
    formatNotice("info", `A newer Clily version is available: ${options.currentVersion} -> ${latestVersion}`),
    pc.dim(`If you installed with npm: npm install -g ${options.packageName}@latest`),
    pc.dim("Otherwise update Clily using your original installation method.")
  ].join("\n");
}

export async function readUpdateState(): Promise<UpdateState> {
  try {
    const raw = await fs.readFile(getUpdateStatePath(), "utf8");
    return updateStateSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function writeUpdateState(state: UpdateState): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getUpdateStatePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function fetchLatestPackageVersion(packageName: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
    signal: AbortSignal.timeout(updateFetchTimeoutMs)
  });

  if (!response.ok) {
    throw new Error(`NPM registry request failed with status ${response.status}`);
  }

  const parsed = npmRegistryResponseSchema.parse(await response.json());
  return parsed["dist-tags"].latest;
}

function getPackageName(): string {
  return packageJson.name;
}

function getCurrentPackageVersion(): string {
  return packageJson.version;
}

function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);

  for (let index = 0; index < Math.max(leftVersion.numbers.length, rightVersion.numbers.length); index += 1) {
    const leftNumber = leftVersion.numbers[index] ?? 0;
    const rightNumber = rightVersion.numbers[index] ?? 0;
    if (leftNumber !== rightNumber) {
      return leftNumber > rightNumber ? 1 : -1;
    }
  }

  if (leftVersion.prerelease === rightVersion.prerelease) {
    return 0;
  }

  if (leftVersion.prerelease === undefined) {
    return 1;
  }

  if (rightVersion.prerelease === undefined) {
    return -1;
  }

  return leftVersion.prerelease.localeCompare(rightVersion.prerelease);
}

function parseVersion(value: string): { numbers: number[]; prerelease?: string } {
  const [core, prerelease] = value.trim().split("-", 2);
  const numbers = core.split(".").map((part) => Number.parseInt(part, 10));

  if (numbers.some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid version: ${value}`);
  }

  return {
    numbers,
    prerelease
  };
}

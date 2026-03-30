import fs from "node:fs/promises";
import { defaultConfig } from "./defaults.js";
import { getConfigDir, getConfigPath } from "./paths.js";
import { configSchema } from "./schema.js";
import type { ClilyConfig } from "../types.js";

export async function configExists(): Promise<boolean> {
  try {
    await fs.access(getConfigPath());
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(): Promise<ClilyConfig> {
  const raw = await fs.readFile(getConfigPath(), "utf8");
  const parsed = JSON.parse(raw);
  return configSchema.parse(parsed);
}

export async function saveConfig(config: ClilyConfig): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function createConfig(overrides: Partial<ClilyConfig> = {}): ClilyConfig {
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

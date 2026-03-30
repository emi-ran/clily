import fs from "node:fs/promises";
import { defaultConfig } from "./defaults.js";
import { getConfigDir, getConfigPath } from "./paths.js";
import { getProviderApiKey, setProviderApiKey } from "./secrets.js";
import { configSchema } from "./schema.js";
import type { ClilyConfig } from "../types.js";

type ConfigPathKey =
  | "mode"
  | "provider.name"
  | "provider.model"
  | "provider.apiKey"
  | "shell"
  | "privacy.maskSecrets"
  | "privacy.sendHistory"
  | "history.historyLimit";

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
  const parsedJson = JSON.parse(raw) as { provider?: { apiKey?: unknown } };
  if (parsedJson.provider?.apiKey !== undefined) {
    throw new Error("Plaintext provider.apiKey in config.json is no longer supported. Run `clily setup` or `clily config set provider.apiKey <value>`.");
  }

  const parsed = configSchema.parse(parsedJson);
  return attachProviderApiKey(parsed);
}

export async function saveConfig(config: ClilyConfig): Promise<void> {
  if (config.provider.apiKey) {
    await setProviderApiKey(config.provider.name, config.provider.apiKey);
  }

  await writeConfigFile(configSchema.parse(stripApiKey(config)));
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

export async function requireConfig(): Promise<ClilyConfig> {
  if (!(await configExists())) {
    throw new Error("Config not found. Run `clily --setup` first.");
  }

  return loadConfig();
}

export async function updateConfigValue(path: ConfigPathKey, value: string): Promise<ClilyConfig> {
  const config = await requireConfig();

  switch (path) {
    case "mode":
      config.mode = value as ClilyConfig["mode"];
      break;
    case "provider.name":
      config.provider.name = value as ClilyConfig["provider"]["name"];
      config.provider.apiKey = await getProviderApiKey(config.provider.name);
      break;
    case "provider.model":
      config.provider.model = value;
      break;
    case "provider.apiKey":
      config.provider.apiKey = value;
      break;
    case "shell":
      config.shell = value as ClilyConfig["shell"];
      break;
    case "privacy.maskSecrets":
      config.privacy.maskSecrets = parseBoolean(value, path);
      break;
    case "privacy.sendHistory":
      config.privacy.sendHistory = parseBoolean(value, path);
      break;
    case "history.historyLimit":
      config.history.historyLimit = parseInteger(value, path);
      break;
    default:
      throw new Error(`Unsupported config path: ${path}`);
  }

  const validated = configSchema.parse(config);
  await saveConfig(validated);
  return validated;
}

export async function addSafetyPattern(kind: keyof ClilyConfig["safety"], pattern: string): Promise<ClilyConfig> {
  const config = await requireConfig();
  if (!config.safety[kind].includes(pattern)) {
    config.safety[kind].push(pattern);
  }

  const validated = configSchema.parse(config);
  await saveConfig(validated);
  return validated;
}

export async function removeSafetyPattern(kind: keyof ClilyConfig["safety"], pattern: string): Promise<ClilyConfig> {
  const config = await requireConfig();
  config.safety[kind] = config.safety[kind].filter((entry) => entry !== pattern);

  const validated = configSchema.parse(config);
  await saveConfig(validated);
  return validated;
}

function parseBoolean(value: string, path: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean for ${path}: ${value}`);
}

function parseInteger(value: string, path: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid integer for ${path}: ${value}`);
  }

  return parsed;
}

function stripApiKey(config: ClilyConfig): ClilyConfig {
  return {
    ...config,
    provider: {
      ...config.provider,
      apiKey: undefined
    }
  };
}

async function attachProviderApiKey(config: ClilyConfig): Promise<ClilyConfig> {
  const storedApiKey = await getProviderApiKey(config.provider.name);

  return {
    ...config,
    provider: {
      ...config.provider,
      apiKey: storedApiKey
    }
  };
}

async function writeConfigFile(config: ClilyConfig): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

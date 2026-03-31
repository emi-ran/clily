import fs from "node:fs/promises";
import { defaultConfig } from "./defaults.js";
import { getConfigDir, getConfigPath, getSecretsPath } from "./paths.js";
import { getProviderApiKey, setProviderApiKey } from "./secrets.js";
import { configSchema } from "./schema.js";
import type { ConfigSchema } from "./schema.js";
import type { ClilyConfig, ProviderProfiles } from "../types.js";

export interface ConfigDoctorReport {
  configPath: string;
  secretsPath: string;
  configFileExists: boolean;
  secretsFileExists: boolean;
  configIsValid: boolean;
  plaintextApiKeyInConfig: boolean;
  providerName?: ClilyConfig["provider"]["name"];
  providerModel?: string;
  apiKeyConfigured: boolean;
  issues: string[];
}

type PartialProviderProfiles = Partial<ProviderProfiles>;

type NormalizableConfig = Omit<ClilyConfig, "providers"> & {
  providers?: PartialProviderProfiles;
};

type ConfigOverrides = Partial<Omit<ClilyConfig, "provider" | "providers" | "privacy" | "history" | "safety">> & {
  provider?: Partial<ClilyConfig["provider"]>;
  providers?: PartialProviderProfiles;
  privacy?: Partial<ClilyConfig["privacy"]>;
  history?: Partial<ClilyConfig["history"]>;
  safety?: Partial<ClilyConfig["safety"]>;
};

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

export async function inspectConfigDoctor(): Promise<ConfigDoctorReport> {
  const configPath = getConfigPath();
  const secretsPath = getSecretsPath();
  const configFileExists = await fileExists(configPath);
  const secretsFileExists = await fileExists(secretsPath);
  const report: ConfigDoctorReport = {
    configPath,
    secretsPath,
    configFileExists,
    secretsFileExists,
    configIsValid: false,
    plaintextApiKeyInConfig: false,
    apiKeyConfigured: false,
    issues: []
  };

  if (!configFileExists) {
    report.issues.push("Config file is missing. Run `clily setup` first.");
    return report;
  }

  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsedJson = JSON.parse(raw) as { provider?: { apiKey?: unknown; name?: unknown; model?: unknown } };
    report.plaintextApiKeyInConfig = parsedJson.provider?.apiKey !== undefined;

    if (report.plaintextApiKeyInConfig) {
      report.issues.push("Plaintext provider.apiKey was found in config.json. Remove it and store the key with `clily config set provider.apiKey <value>` or rerun setup.");
    }

    const parsed = configSchema.parse(parsedJson);
    report.configIsValid = true;
    report.providerName = parsed.provider.name;
    report.providerModel = parsed.provider.model;

    try {
      report.apiKeyConfigured = Boolean(await getProviderApiKey(parsed.provider.name));
      if (!report.apiKeyConfigured) {
        report.issues.push(`No encrypted API key is stored for provider ${parsed.provider.name}. Run \`clily config set provider.apiKey <value>\` or rerun setup.`);
      }
    } catch (error) {
      report.issues.push(error instanceof Error ? error.message : String(error));
    }
  } catch (error) {
    report.issues.push(error instanceof Error ? error.message : String(error));
  }

  return report;
}

export async function loadConfig(): Promise<ClilyConfig> {
  const raw = await fs.readFile(getConfigPath(), "utf8");
  const parsedJson = JSON.parse(raw) as { provider?: { apiKey?: unknown } };
  if (parsedJson.provider?.apiKey !== undefined) {
    throw new Error("Plaintext provider.apiKey in config.json is no longer supported. Run `clily setup` or `clily config set provider.apiKey <value>`.");
  }

  const parsed = normalizeConfig(configSchema.parse(parsedJson));
  return attachProviderApiKey(parsed);
}

export async function saveConfig(config: ClilyConfig): Promise<void> {
  const normalized = normalizeConfig(config);

  if (normalized.provider.apiKey) {
    await setProviderApiKey(normalized.provider.name, normalized.provider.apiKey);
  }

  await writeConfigFile(configSchema.parse(stripApiKey(normalized)));
}

export function createConfig(overrides: ConfigOverrides = {}): ClilyConfig {
  return normalizeConfig({
    ...defaultConfig,
    ...overrides,
    provider: {
      ...defaultConfig.provider,
      ...overrides.provider
    },
    providers: {
      ...defaultConfig.providers,
      ...overrides.providers,
      gemini: {
        ...defaultConfig.providers.gemini,
        ...overrides.providers?.gemini
      },
      groq: {
        ...defaultConfig.providers.groq,
        ...overrides.providers?.groq
      },
      openai: {
        ...defaultConfig.providers.openai,
        ...overrides.providers?.openai
      },
      openrouter: {
        ...defaultConfig.providers.openrouter,
        ...overrides.providers?.openrouter
      }
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
  });
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
      config.provider.model = config.providers[config.provider.name].model;
      config.provider.apiKey = await getProviderApiKey(config.provider.name);
      break;
    case "provider.model":
      config.provider.model = value;
      config.providers[config.provider.name].model = value;
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

  const validated = normalizeConfig(configSchema.parse(config));
  await saveConfig(validated);
  return validated;
}

export async function addSafetyPattern(kind: keyof ClilyConfig["safety"], pattern: string): Promise<ClilyConfig> {
  const config = await requireConfig();
  if (!config.safety[kind].includes(pattern)) {
    config.safety[kind].push(pattern);
  }

  const validated = normalizeConfig(configSchema.parse(config));
  await saveConfig(validated);
  return validated;
}

export async function removeSafetyPattern(kind: keyof ClilyConfig["safety"], pattern: string): Promise<ClilyConfig> {
  const config = await requireConfig();
  config.safety[kind] = config.safety[kind].filter((entry) => entry !== pattern);

  const validated = normalizeConfig(configSchema.parse(config));
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

function normalizeConfig(config: NormalizableConfig): ClilyConfig {
  const providers = normalizeProviderProfiles(config.providers, config.provider);
  const activeProviderName = config.provider.name;

  return {
    ...config,
    provider: {
      ...config.provider,
      model: providers[activeProviderName].model
    },
    providers
  };
}

function normalizeProviderProfiles(
  providers: PartialProviderProfiles | undefined,
  activeProvider: ClilyConfig["provider"]
): ProviderProfiles {
  const normalized: ProviderProfiles = {
    ...defaultConfig.providers,
    ...providers,
    gemini: {
      ...defaultConfig.providers.gemini,
      ...providers?.gemini
    },
    groq: {
      ...defaultConfig.providers.groq,
      ...providers?.groq
    },
    openai: {
      ...defaultConfig.providers.openai,
      ...providers?.openai
    },
    openrouter: {
      ...defaultConfig.providers.openrouter,
      ...providers?.openrouter
    }
  };

  normalized[activeProvider.name] = {
    ...normalized[activeProvider.name],
    model: activeProvider.model
  };

  return normalized;
}

async function writeConfigFile(config: ConfigSchema): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

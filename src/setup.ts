import { input, password, select } from "@inquirer/prompts";
import pc from "picocolors";
import { getProviderApiKey } from "./config/secrets.js";
import { configExists, createConfig, loadConfig, saveConfig } from "./config/store.js";
import { detectShell } from "./lib/detect.js";
import { isProviderAuthenticationError } from "./lib/provider-error.js";
import { getDefaultProviderModel, listProviderModels } from "./lib/provider.js";
import { formatKeyValue, formatNotice, formatPanel, formatWrappedValue } from "./lib/ui.js";
import type { ClilyConfig, ProviderModelInfo, ProviderName, SafetyMode } from "./types.js";

function isPromptCancelled(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("sigint") || message.includes("force closed the prompt");
}

function describeMode(mode: SafetyMode): string {
  switch (mode) {
    case "safe":
      return "Always ask before running commands.";
    case "balanced":
      return "Auto-run allowlist commands, confirm others.";
    case "auto":
      return "Run commands directly unless blocked locally.";
  }
}

function formatModelChoice(model: ProviderModelInfo): { name: string; value: string; description?: string } {
  const supportedActions = model.supportedActions?.join(", ");
  const descriptionParts = [model.description, supportedActions].filter(Boolean);

  return {
    name: model.displayName ? `${model.displayName} (${model.name})` : model.name,
    value: model.name,
    description: descriptionParts.length > 0 ? descriptionParts.join(" | ") : undefined
  };
}

function sortModels(models: ProviderModelInfo[]): ProviderModelInfo[] {
  return [...models].sort((left, right) => {
    const leftName = left.displayName ?? left.name;
    const rightName = right.displayName ?? right.name;
    return leftName.localeCompare(rightName);
  });
}

function formatProviderName(provider: ProviderName): string {
  switch (provider) {
    case "gemini":
      return "Gemini";
    case "groq":
      return "Groq";
    case "openai":
      return "OpenAI";
    case "openrouter":
      return "OpenRouter";
  }
}

function formatModeName(mode: SafetyMode): string {
  switch (mode) {
    case "safe":
      return "Safe";
    case "balanced":
      return "Balanced";
    case "auto":
      return "Auto";
  }
}

function maskApiKeyPreview(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(Math.max(apiKey.length, 4));
  }

  return `${apiKey.slice(0, 3)}${"*".repeat(6)}${apiKey.slice(-4)}`;
}

async function selectBoolean(options: {
  message: string;
  defaultValue: boolean;
  trueLabel?: string;
  falseLabel?: string;
}): Promise<boolean> {
  return select<boolean>({
    message: options.message,
    choices: [
      { name: options.trueLabel ?? "Yes", value: true },
      { name: options.falseLabel ?? "No", value: false }
    ],
    default: options.defaultValue
  });
}

async function promptOptionalApiKey(options: {
  message: string;
  savedApiKey: string;
}): Promise<string> {
  const placeholder = maskApiKeyPreview(options.savedApiKey);

  const value = await input({
    message: options.message,
    default: "",
    transformer(currentValue) {
      return currentValue.length === 0 ? pc.dim(placeholder) : currentValue;
    }
  });

  return value.trim() || options.savedApiKey;
}

async function getProviderDefaults(provider: ProviderName): Promise<{ apiKeyLabel: string; model: string; modelLabel: string }> {
  switch (provider) {
    case "gemini":
      return {
        apiKeyLabel: "Gemini API key",
        model: await getDefaultProviderModel(provider),
        modelLabel: "Gemini model"
      };
    case "groq":
      return {
        apiKeyLabel: "Groq API key",
        model: await getDefaultProviderModel(provider),
        modelLabel: "Groq model"
      };
    case "openai":
      return {
        apiKeyLabel: "OpenAI API key",
        model: await getDefaultProviderModel(provider),
        modelLabel: "OpenAI model"
      };
    case "openrouter":
      return {
        apiKeyLabel: "OpenRouter API key",
        model: await getDefaultProviderModel(provider),
        modelLabel: "OpenRouter model"
      };
  }
}

async function selectProviderModel(provider: ProviderName, apiKey: string, fallbackModel: string): Promise<string> {
  const models = sortModels(await listProviderModels(provider, apiKey));
  if (models.length === 0) {
    return fallbackModel;
  }

  return select<string>({
    message: `Select ${formatProviderName(provider)} model`,
    choices: models.map(formatModelChoice),
    default: fallbackModel,
    pageSize: 12
  });
}

async function chooseProviderModel(options: {
  provider: ProviderName;
  apiKey: string;
  apiKeyLabel: string;
  fallbackModel: string;
  modelLabel: string;
}): Promise<{ apiKey: string; model: string }> {
  let apiKey = options.apiKey;

  while (true) {
    try {
      return {
        apiKey,
        model: await selectProviderModel(options.provider, apiKey, options.fallbackModel)
      };
    } catch (error) {
      if (isPromptCancelled(error)) {
        throw error;
      }

      if (isProviderAuthenticationError(error)) {
        console.log(formatNotice("warning", `${formatProviderName(options.provider)} API key could not be verified.`));

        const enterAnotherKey = await selectBoolean({
          message: `Enter a different ${options.apiKeyLabel.toLowerCase()}?`,
          defaultValue: true
        });

        if (!enterAnotherKey) {
          throw new Error(`${formatProviderName(options.provider)} setup requires a working API key.`);
        }

        apiKey = await password({
          message: options.apiKeyLabel,
          mask: "*"
        });
        continue;
      }

      const retry = await selectBoolean({
        message: `Could not fetch ${options.modelLabel.toLowerCase()}s (${error instanceof Error ? error.message : "unknown error"}). Retry?`,
        defaultValue: true,
        trueLabel: "Retry",
        falseLabel: "Use fallback"
      });

      if (retry) {
        continue;
      }

      console.log(formatNotice("warning", `Could not fetch ${options.modelLabel.toLowerCase()}s. ${options.fallbackModel} will be used.`));
      return {
        apiKey,
        model: options.fallbackModel
      };
    }
  }
}

async function loadSetupDefaults(): Promise<ClilyConfig> {
  if (!(await configExists())) {
    return createConfig({
      shell: detectShell()
    });
  }

  return loadConfig();
}

export async function runSetup(): Promise<ClilyConfig> {
  const existingConfig = await loadSetupDefaults();

  console.log("");
  console.log(formatPanel("Clily Setup", [
    formatNotice("info", "Configure provider, safety mode, privacy, and context."),
    formatKeyValue("Shell", pc.white(detectShell())),
    formatKeyValue("Secrets", pc.white("Encrypted local store"))
  ]));

  const provider = await select<ProviderName>({
    message: "Provider",
    choices: [
      { name: "Gemini", value: "gemini", description: "Google Gemini Developer API" },
      { name: "Groq", value: "groq", description: "Groq OpenAI-compatible API" },
      { name: "OpenAI", value: "openai", description: "OpenAI API" },
      { name: "OpenRouter", value: "openrouter", description: "Unified model gateway with many providers" }
    ],
    default: existingConfig.provider.name
  });

  const mode = await select<SafetyMode>({
    message: "Mode",
    choices: [
      { name: "Safe", value: "safe", description: describeMode("safe") },
      { name: "Balanced", value: "balanced", description: describeMode("balanced") },
      { name: "Auto", value: "auto", description: describeMode("auto") }
    ],
    default: existingConfig.mode
  });

  const providerDefaults = await getProviderDefaults(provider);
  const savedApiKey = await getProviderApiKey(provider);
  const defaultModel = existingConfig.providers[provider].model || providerDefaults.model;

  let apiKey = savedApiKey;
  if (savedApiKey) {
    apiKey = await promptOptionalApiKey({
      message: providerDefaults.apiKeyLabel,
      savedApiKey
    });
  }

  if (!apiKey) {
    apiKey = await password({
      message: providerDefaults.apiKeyLabel,
      mask: "*"
    });
  }

  const providerSelection = await chooseProviderModel({
    provider,
    apiKey,
    apiKeyLabel: providerDefaults.apiKeyLabel,
    fallbackModel: defaultModel,
    modelLabel: providerDefaults.modelLabel
  });
  apiKey = providerSelection.apiKey;
  const model = providerSelection.model;

  const maskSecrets = await selectBoolean({
    message: "Mask secrets before sending context?",
    defaultValue: existingConfig.privacy.maskSecrets,
    trueLabel: "Mask secrets",
    falseLabel: "Do not mask"
  });

  const sendHistory = await selectBoolean({
    message: "Use sanitized shell history as context?",
    defaultValue: existingConfig.privacy.sendHistory,
    trueLabel: "Use history",
    falseLabel: "Do not use"
  });

  const historyLimitValue = await input({
    message: "History limit (0 disables history)",
    default: String(existingConfig.history.historyLimit),
    validate(value) {
      const parsed = Number.parseInt(value, 10);
      return Number.isInteger(parsed) && parsed >= 0 ? true : "Enter a whole number >= 0";
    }
  });

  const config = createConfig({
    ...existingConfig,
    mode,
    shell: detectShell(),
    provider: {
      name: provider,
      model,
      apiKey
    },
    providers: {
      ...existingConfig.providers,
      [provider]: {
        model
      }
    },
    privacy: {
      maskSecrets,
      sendHistory
    },
    history: {
      historyLimit: Number.parseInt(historyLimitValue, 10)
    }
  });

  await saveConfig(config);
  console.log("");
  console.log(formatPanel("Setup Complete", [
    formatNotice("success", "Clily is ready."),
    formatKeyValue("Provider", pc.white(formatProviderName(config.provider.name))),
    ...formatWrappedValue("Model", config.provider.model),
    formatKeyValue("Mode", pc.white(formatModeName(mode))),
    formatKeyValue("Shell", pc.white(config.shell)),
    formatKeyValue("API key", pc.green("stored securely")),
    formatKeyValue("History", pc.white(config.privacy.sendHistory ? "enabled" : "disabled")),
    formatKeyValue("History limit", pc.white(String(config.history.historyLimit)))
  ]));
  return config;
}

import { confirm, input, password, select } from "@inquirer/prompts";
import pc from "picocolors";
import { getProviderApiKey } from "./config/secrets.js";
import { configExists, createConfig, loadConfig, saveConfig } from "./config/store.js";
import { detectShell } from "./lib/detect.js";
import { filterGenerateContentModels, listGeminiModels } from "./lib/gemini.js";
import { filterGroqModels, listGroqModels } from "./lib/groq.js";
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
  const supportedActions = model.supportedActions?.join(", ") ?? "unknown actions";

  return {
    name: model.displayName ? `${model.displayName} (${model.name})` : model.name,
    value: model.name,
    description: model.description ? `${model.description} | ${supportedActions}` : supportedActions
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

function getProviderDefaults(provider: ProviderName): { apiKeyLabel: string; model: string; modelLabel: string } {
  switch (provider) {
    case "gemini":
      return {
        apiKeyLabel: "Gemini API key",
        model: "models/gemini-2.5-flash",
        modelLabel: "Gemini model"
      };
    case "groq":
      return {
        apiKeyLabel: "Groq API key",
        model: "openai/gpt-oss-20b",
        modelLabel: "Groq model"
      };
  }
}

async function selectProviderModel(provider: ProviderName, apiKey: string, fallbackModel: string): Promise<string> {
  if (provider === "gemini") {
    const models = sortModels(filterGenerateContentModels(await listGeminiModels(apiKey)));
    if (models.length === 0) {
      return fallbackModel;
    }

    return select<string>({
      message: "Select Gemini model",
      choices: models.map(formatModelChoice),
      default: fallbackModel,
      pageSize: 12
    });
  }

  const models = sortModels(filterGroqModels(await listGroqModels(apiKey)));
  if (models.length === 0) {
    return fallbackModel;
  }

  return select<string>({
    message: "Select Groq model",
    choices: models.map(formatModelChoice),
    default: fallbackModel,
    pageSize: 12
  });
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
      { name: "Groq", value: "groq", description: "Groq OpenAI-compatible API" }
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

  const providerDefaults = getProviderDefaults(provider);
  const savedApiKey = await getProviderApiKey(provider);
  const defaultModel = existingConfig.providers[provider].model || providerDefaults.model;

  let apiKey = savedApiKey;
  if (savedApiKey) {
    const keepSavedApiKey = await confirm({
      message: `Keep saved ${providerDefaults.apiKeyLabel.toLowerCase()}?`,
      default: true
    });

    if (!keepSavedApiKey) {
      apiKey = undefined;
    }
  }

  if (!apiKey) {
    apiKey = await password({
      message: providerDefaults.apiKeyLabel,
      mask: "*"
    });
  }

  let model = defaultModel;
  try {
    model = await selectProviderModel(provider, apiKey, model);
  } catch (error) {
    if (isPromptCancelled(error)) {
      throw error;
    }

    const useFallbackModel = await confirm({
      message: `Could not fetch ${providerDefaults.modelLabel.toLowerCase()}s (${error instanceof Error ? error.message : "unknown error"}). Use default model?`,
      default: true
    });

    if (!useFallbackModel) {
      throw error;
    }
  }

  const maskSecrets = await confirm({
    message: "Mask secrets before sending context?",
    default: existingConfig.privacy.maskSecrets
  });

  const sendHistory = await confirm({
    message: "Use sanitized shell history as context?",
    default: existingConfig.privacy.sendHistory
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

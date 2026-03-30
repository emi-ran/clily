import { confirm, input, password, select } from "@inquirer/prompts";
import { createConfig, saveConfig } from "./config/store.js";
import { detectShell } from "./lib/detect.js";
import { filterGenerateContentModels, listGeminiModels } from "./lib/gemini.js";
import type { ClilyConfig, GeminiModelInfo, SafetyMode } from "./types.js";

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

function formatModelChoice(model: GeminiModelInfo): { name: string; value: string; description?: string } {
  const supportedActions = model.supportedActions?.join(", ") ?? "unknown actions";

  return {
    name: model.displayName ? `${model.displayName} (${model.name})` : model.name,
    value: model.name,
    description: model.description ? `${model.description} | ${supportedActions}` : supportedActions
  };
}

function sortModels(models: GeminiModelInfo[]): GeminiModelInfo[] {
  return [...models].sort((left, right) => {
    const leftName = left.displayName ?? left.name;
    const rightName = right.displayName ?? right.name;
    return leftName.localeCompare(rightName);
  });
}

export async function runSetup(): Promise<ClilyConfig> {
  const mode = await select<SafetyMode>({
    message: "Select execution mode",
    choices: [
      { name: `safe - ${describeMode("safe")}`, value: "safe" },
      { name: `balanced - ${describeMode("balanced")}`, value: "balanced" },
      { name: `auto - ${describeMode("auto")}`, value: "auto" }
    ],
    default: "balanced"
  });

  const apiKey = await password({
    message: "Enter your Gemini API key",
    mask: "*"
  });

  let model = "models/gemini-2.5-flash";
  try {
    const models = sortModels(filterGenerateContentModels(await listGeminiModels(apiKey)));
    if (models.length > 0) {
      model = await select<string>({
        message: "Select Gemini model",
        choices: models.map(formatModelChoice),
        default: model,
        pageSize: 12
      });
    }
  } catch (error) {
    if (isPromptCancelled(error)) {
      throw error;
    }

    const useFallbackModel = await confirm({
      message: `Could not fetch Gemini models (${error instanceof Error ? error.message : "unknown error"}). Use default model?`,
      default: true
    });

    if (!useFallbackModel) {
      throw error;
    }
  }

  const maskSecrets = await confirm({
    message: "Mask tokens, API keys, and .env-style secrets before sending context?",
    default: true
  });

  const sendHistory = await confirm({
    message: "Allow sanitized shell history to be used as context?",
    default: true
  });

  const historyLimitValue = await input({
    message: "How many recent commands should be used for context? (0 disables history)",
    default: "20",
    validate(value) {
      const parsed = Number.parseInt(value, 10);
      return Number.isInteger(parsed) && parsed >= 0 ? true : "Enter a whole number >= 0";
    }
  });

  const config = createConfig({
    mode,
    shell: detectShell(),
    provider: {
      name: "gemini",
      model,
      apiKey
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
  return config;
}

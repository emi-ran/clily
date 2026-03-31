import { toUserFacingProviderError } from "./provider-error.js";
import type { ClilyConfig, CommandGenerationContext, GenerateCommandResult, ProviderModelInfo, ProviderName } from "../types.js";

interface ProviderModule {
  defaultModel: string;
  listModels(apiKey: string): Promise<ProviderModelInfo[]>;
  generateCommand(options: {
    apiKey: string;
    model: string;
    context: CommandGenerationContext;
  }): Promise<GenerateCommandResult>;
}

const providerModules: Record<ProviderName, () => Promise<ProviderModule>> = {
  gemini: async () => {
    const module = await import("./gemini.js");
    return {
      defaultModel: module.geminiDefaultModel,
      listModels: module.listGeminiModels,
      generateCommand: module.generateGeminiCommand
    };
  },
  groq: async () => {
    const module = await import("./groq.js");
    return {
      defaultModel: module.groqDefaultModel,
      listModels: module.listGroqModels,
      generateCommand: module.generateGroqCommand
    };
  },
  openai: async () => {
    const module = await import("./openai.js");
    return {
      defaultModel: module.openAiDefaultModel,
      listModels: module.listOpenAiModels,
      generateCommand: module.generateOpenAiCommand
    };
  },
  openrouter: async () => {
    const module = await import("./openrouter.js");
    return {
      defaultModel: module.openRouterDefaultModel,
      listModels: module.listOpenRouterModels,
      generateCommand: module.generateOpenRouterCommand
    };
  }
};

export async function generateCommand(config: ClilyConfig, context: CommandGenerationContext): Promise<GenerateCommandResult> {
  if (!config.provider.apiKey) {
    throw new Error(`No API key found. Run \`clily --setup\` to configure ${config.provider.name}.`);
  }

  try {
    const provider = await providerModules[config.provider.name]();
    return provider.generateCommand({
      apiKey: config.provider.apiKey,
      model: config.provider.model,
      context
    });
  } catch (error) {
    throw toUserFacingProviderError(error, config.provider.name);
  }
}

export async function listProviderModels(provider: ProviderName, apiKey: string): Promise<ProviderModelInfo[]> {
  try {
    return (await providerModules[provider]()).listModels(apiKey);
  } catch (error) {
    throw toUserFacingProviderError(error, provider);
  }
}

export async function validateProviderApiKey(provider: ProviderName, apiKey: string): Promise<void> {
  await listProviderModels(provider, apiKey);
}

export async function getDefaultProviderModel(provider: ProviderName): Promise<string> {
  return (await providerModules[provider]()).defaultModel;
}

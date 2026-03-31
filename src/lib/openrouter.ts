import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { generateCommandWithModel } from "./provider-shared.js";
import type { CommandGenerationContext, GenerateCommandResult, ProviderModelInfo } from "../types.js";

interface OpenRouterModelsResponse {
  data?: Array<{
    id: string;
    name?: string;
    description?: string;
    architecture?: {
      modality?: string;
    };
  }>;
}

export const openRouterDefaultModel = "openai/gpt-oss-20b";

export async function listOpenRouterModels(apiKey: string): Promise<ProviderModelInfo[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`OpenRouter model list failed with status ${response.status}`);
  }

  const data = await response.json() as OpenRouterModelsResponse;
  return (data.data ?? [])
    .filter((model) => {
      const name = model.id.toLowerCase();
      const modality = model.architecture?.modality?.toLowerCase();

      if (modality && !modality.includes("text")) {
        return false;
      }

      return ![
        "embedding",
        "tts",
        "audio",
        "vision",
        "image",
        "moderation",
        "rerank"
      ].some((token) => name.includes(token));
    })
    .map((model) => ({
      name: model.id,
      displayName: model.name ?? model.id,
      description: model.description
    }));
}

export async function generateOpenRouterCommand(options: {
  apiKey: string;
  model: string;
  context: CommandGenerationContext;
}): Promise<GenerateCommandResult> {
  const openrouter = createOpenRouter({
    apiKey: options.apiKey,
    compatibility: "strict"
  });

  return generateCommandWithModel({
    model: openrouter.chat(options.model),
    providerLabel: "OpenRouter",
    context: options.context,
    providerOptions: {
      openrouter: {
        plugins: [{ id: "response-healing" }]
      }
    }
  });
}

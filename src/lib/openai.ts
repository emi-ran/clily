import { createOpenAI } from "@ai-sdk/openai";

import { generateCommandWithModel } from "./provider-shared.js";
import type { CommandGenerationContext, GenerateCommandResult, ProviderModelInfo } from "../types.js";

interface OpenAIModelsResponse {
  data?: Array<{
    id: string;
    owned_by?: string;
  }>;
}

export const openAiDefaultModel = "gpt-4o-mini";

export async function listOpenAiModels(apiKey: string): Promise<ProviderModelInfo[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAI model list failed with status ${response.status}`);
  }

  const data = await response.json() as OpenAIModelsResponse;
  return (data.data ?? [])
    .filter((model) => {
      const name = model.id.toLowerCase();
      return ![
        "whisper",
        "tts",
        "transcribe",
        "moderation",
        "embedding",
        "image",
        "realtime",
        "audio"
      ].some((token) => name.includes(token));
    })
    .map((model) => ({
      name: model.id,
      displayName: model.id,
      description: model.owned_by ? `Owner: ${model.owned_by}` : undefined
    }));
}

export async function generateOpenAiCommand(options: {
  apiKey: string;
  model: string;
  context: CommandGenerationContext;
}): Promise<GenerateCommandResult> {
  const openai = createOpenAI({ apiKey: options.apiKey });

  return generateCommandWithModel({
    model: openai(options.model),
    providerLabel: "OpenAI",
    context: options.context
  });
}

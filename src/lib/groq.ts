import { createGroq } from "@ai-sdk/groq";

import { generateCommandWithModel } from "./provider-shared.js";
import type { CommandGenerationContext, GenerateCommandResult, ProviderModelInfo } from "../types.js";

interface GroqModelsResponse {
  data?: Array<{
    id: string;
    owned_by?: string;
  }>;
}

export const groqDefaultModel = "openai/gpt-oss-20b";

export async function listGroqModels(apiKey: string): Promise<ProviderModelInfo[]> {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Groq model list failed with status ${response.status}`);
  }

  const data = await response.json() as GroqModelsResponse;
  return (data.data ?? [])
    .map((model) => ({
      name: model.id,
      displayName: model.id,
      description: model.owned_by ? `Owner: ${model.owned_by}` : undefined
    }))
    .filter((model) => {
      const name = model.name.toLowerCase();
      return ![
        "whisper",
        "tts",
        "playai",
        "vision",
        "distil"
      ].some((token) => name.includes(token));
    });
}

export async function generateGroqCommand(options: {
  apiKey: string;
  model: string;
  context: CommandGenerationContext;
}): Promise<GenerateCommandResult> {
  const groq = createGroq({ apiKey: options.apiKey });

  return generateCommandWithModel({
    model: groq(options.model),
    providerLabel: "Groq",
    context: options.context,
    providerOptions: {
      groq: {
        structuredOutputs: true,
        strictJsonSchema: false
      }
    }
  });
}

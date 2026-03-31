import { GoogleGenAI } from "@google/genai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { generateCommandWithModel } from "./provider-shared.js";
import type { CommandGenerationContext, GenerateCommandResult, ProviderModelInfo } from "../types.js";

export const geminiDefaultModel = "models/gemini-2.5-flash";

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function listGeminiModels(apiKey: string): Promise<ProviderModelInfo[]> {
  const ai = createGeminiClient(apiKey);
  const pager = await ai.models.list({
    config: {
      pageSize: 100
    }
  });

  const models: ProviderModelInfo[] = [];
  for await (const model of pager) {
    if (!model.name) {
      continue;
    }

    models.push({
      name: model.name,
      displayName: model.displayName,
      description: model.description,
      supportedActions: model.supportedActions
    });
  }

  return models.filter((model) => {
    const name = model.name.toLowerCase();

    if (!name.startsWith("models/gemini")) {
      return false;
    }

    if (!model.supportedActions?.includes("generateContent")) {
      return false;
    }

    return ![
      "embedding",
      "tts",
      "live",
      "image",
      "veo",
      "nano-banana"
    ].some((token) => name.includes(token));
  });
}

export async function generateGeminiCommand(options: {
  apiKey: string;
  model: string;
  context: CommandGenerationContext;
}): Promise<GenerateCommandResult> {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey });

  return generateCommandWithModel({
    model: google.chat(options.model.replace(/^models\//, "")),
    providerLabel: "Gemini",
    context: options.context,
    providerOptions: {
      google: {
        structuredOutputs: true
      }
    }
  });
}

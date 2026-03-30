import { generateGeminiCommand } from "./gemini.js";
import { generateGroqCommand } from "./groq.js";
import type { ClilyConfig, CommandGenerationContext, GenerateCommandResult } from "../types.js";

export async function generateCommand(config: ClilyConfig, context: CommandGenerationContext): Promise<GenerateCommandResult> {
  if (!config.provider.apiKey) {
    throw new Error(`No API key found. Run \`clily --setup\` to configure ${config.provider.name}.`);
  }

  switch (config.provider.name) {
    case "gemini":
      return generateGeminiCommand({
        apiKey: config.provider.apiKey,
        model: config.provider.model,
        context
      });
    case "groq":
      return generateGroqCommand({
        apiKey: config.provider.apiKey,
        model: config.provider.model,
        context
      });
  }
}

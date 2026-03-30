import { ZodError } from "zod";

import type { ProviderName } from "../types.js";

function formatProviderName(provider: ProviderName): string {
  switch (provider) {
    case "gemini":
      return "Gemini";
    case "groq":
      return "Groq";
  }
}

function buildProviderHint(provider: ProviderName): string {
  return `Check your ${formatProviderName(provider)} model and API key in \`clily config show\` or rerun \`clily setup\`.`;
}

export function toUserFacingProviderError(error: unknown, provider: ProviderName): Error {
  const providerName = formatProviderName(provider);

  if (error instanceof ZodError || error instanceof SyntaxError) {
    return new Error(`${providerName} returned an invalid response. Please try again. ${buildProviderHint(provider)}`);
  }

  if (!(error instanceof Error)) {
    return new Error(`${providerName} request failed for an unknown reason. ${buildProviderHint(provider)}`);
  }

  const message = error.message.toLowerCase();

  if (message.includes("api key") || message.includes("unauthorized") || message.includes("status 401") || message.includes("status 403")) {
    return new Error(`${providerName} authentication failed. Please verify your API key. ${buildProviderHint(provider)}`);
  }

  if (message.includes("rate limit") || message.includes("status 429")) {
    return new Error(`${providerName} rate limit was reached. Wait a bit and try again.`);
  }

  if (message.includes("empty response")) {
    return new Error(`${providerName} returned an empty response. Please try again.`);
  }

  if (message.includes("fetch failed") || message.includes("network") || message.includes("econnreset") || message.includes("enotfound") || message.includes("timed out")) {
    return new Error(`${providerName} request failed because of a network problem. Check your connection and try again.`);
  }

  return new Error(`${providerName} request failed: ${error.message}`);
}

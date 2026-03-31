import pc from "picocolors";
import type { ConfigDoctorReport } from "../config/store.js";
import type { ClilyConfig } from "../types.js";
import { formatKeyValue, formatNotice, formatPanel, formatWrappedValue } from "./ui.js";

export function formatConfig(config: ClilyConfig): string {
  return formatPanel("Clily Config", [
    formatKeyValue("Mode", pc.white(config.mode)),
    formatKeyValue("Provider", pc.white(config.provider.name)),
    ...formatWrappedValue("Model", config.provider.model),
    formatKeyValue("API key", config.provider.apiKey ? pc.green("configured") : pc.red("missing")),
    ...formatWrappedValue("Gemini model", config.providers.gemini.model),
    ...formatWrappedValue("Groq model", config.providers.groq.model),
    ...formatWrappedValue("OpenAI model", config.providers.openai.model),
    ...formatWrappedValue("OpenRouter model", config.providers.openrouter.model),
    formatKeyValue("Shell", pc.white(config.shell)),
    formatKeyValue("Mask secrets", pc.white(String(config.privacy.maskSecrets))),
    formatKeyValue("Send history", pc.white(String(config.privacy.sendHistory))),
    formatKeyValue("History limit", pc.white(String(config.history.historyLimit))),
    formatKeyValue("Allowlist", pc.white(`${config.safety.allowlist.length} rules`)),
    ...formatWrappedValue("Allow match", joinList(config.safety.allowlist)),
    formatKeyValue("Warnlist", pc.white(`${config.safety.warnlist.length} rules`)),
    ...formatWrappedValue("Warn match", joinList(config.safety.warnlist)),
    formatKeyValue("Denylist", pc.white(`${config.safety.denylist.length} rules`)),
    ...formatWrappedValue("Deny match", joinList(config.safety.denylist))
  ]);
}

export function formatSafetyList(title: string, patterns: string[]): string {
  const lines = [formatKeyValue("Rules", pc.white(String(patterns.length)))];
  if (patterns.length === 0) {
    lines.push(formatNotice("info", "No patterns saved yet."));
    return formatPanel(`Safety ${title}`, lines);
  }

  patterns.forEach((pattern, index) => lines.push(formatKeyValue(`#${index + 1}`, pc.white(pattern))));
  return formatPanel(`Safety ${title}`, lines);
}

export function formatConfigDoctor(report: ConfigDoctorReport): string {
  const lines = [
    formatKeyValue("Config file", formatBoolean(report.configFileExists)),
    formatKeyValue("Secrets file", formatBoolean(report.secretsFileExists)),
    formatKeyValue("Config valid", formatBoolean(report.configIsValid)),
    formatKeyValue("Plaintext key", report.plaintextApiKeyInConfig ? pc.red("found") : pc.green("clean")),
    formatKeyValue("Provider", pc.white(report.providerName ?? "unknown")),
    ...formatWrappedValue("Model", report.providerModel ?? "unknown"),
    formatKeyValue("API key", report.apiKeyConfigured ? pc.green("configured") : pc.red("missing"))
  ];

  if (report.issues.length === 0) {
    lines.push(formatNotice("success", "Health check passed."));
  } else {
    lines.push(formatNotice("warning", "Issues found."));
    report.issues.forEach((issue) => lines.push(...formatWrappedValue("Issue", issue, pc.yellow)));
  }

  return formatPanel("Clily Config Doctor", lines);
}

function joinList(values: string[]): string {
  return values.length > 0 ? values.join(" | ") : "empty";
}

function formatBoolean(value: boolean): string {
  return value ? pc.green("yes") : pc.red("no");
}

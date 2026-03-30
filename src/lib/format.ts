import type { ClilyConfig } from "../types.js";

export function formatConfig(config: ClilyConfig): string {
  const lines = [
    "Current Clily config",
    `- mode: ${config.mode}`,
    `- provider.name: ${config.provider.name}`,
    `- provider.model: ${config.provider.model}`,
    `- provider.apiKey: ${config.provider.apiKey ? "[configured]" : "[missing]"}`,
    `- shell: ${config.shell}`,
    `- privacy.maskSecrets: ${String(config.privacy.maskSecrets)}`,
    `- privacy.sendHistory: ${String(config.privacy.sendHistory)}`,
    `- history.historyLimit: ${config.history.historyLimit}`,
    `- safety.allowlist (${config.safety.allowlist.length}): ${joinList(config.safety.allowlist)}`,
    `- safety.warnlist (${config.safety.warnlist.length}): ${joinList(config.safety.warnlist)}`,
    `- safety.denylist (${config.safety.denylist.length}): ${joinList(config.safety.denylist)}`
  ];

  return lines.join("\n");
}

export function formatSafetyList(title: string, patterns: string[]): string {
  const lines = [`${title} (${patterns.length})`];
  if (patterns.length === 0) {
    lines.push("- empty");
    return lines.join("\n");
  }

  patterns.forEach((pattern) => lines.push(`- ${pattern}`));
  return lines.join("\n");
}

function joinList(values: string[]): string {
  return values.length > 0 ? values.join(" | ") : "empty";
}

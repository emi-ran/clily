import type { ClilyConfig, GenerateCommandResult, SafetyEvaluation, SafetyMatch } from "../types.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternMatches(command: string, pattern: string): boolean {
  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`, "i");
  return regex.test(command.trim());
}

function matchList(command: string, patterns: string[]): SafetyMatch {
  if (patterns.some((pattern) => patternMatches(command, pattern))) {
    return "allowlist";
  }

  return "none";
}

function hasUnsafeShape(command: string): boolean {
  const normalized = command.trim().toLowerCase();
  return normalized.length === 0 || normalized.includes("\n") || normalized.includes("\r");
}

export function evaluateSafety(config: ClilyConfig, result: GenerateCommandResult): SafetyEvaluation {
  const command = result.command.trim();

  if (hasUnsafeShape(command)) {
    return {
      match: "denylist",
      blocked: true,
      shouldConfirm: false,
      reason: "The generated command is empty or not a single line."
    };
  }

  if (config.safety.denylist.some((pattern) => patternMatches(command, pattern))) {
    return {
      match: "denylist",
      blocked: true,
      shouldConfirm: false,
      reason: "The command matches a denylist rule."
    };
  }

  if (config.safety.warnlist.some((pattern) => patternMatches(command, pattern))) {
    return {
      match: "warnlist",
      blocked: false,
      shouldConfirm: true,
      reason: "The command matches a warnlist rule."
    };
  }

  if (matchList(command, config.safety.allowlist) === "allowlist") {
    return {
      match: "allowlist",
      blocked: false,
      shouldConfirm: config.mode === "safe" || result.requiresConfirmation,
      reason: "The command matches an allowlist rule."
    };
  }

  if (result.riskLevel === "high") {
    return {
      match: "none",
      blocked: false,
      shouldConfirm: true,
      reason: "The model marked the command as high risk."
    };
  }

  return {
    match: "none",
    blocked: false,
    shouldConfirm: config.mode !== "auto" || result.requiresConfirmation,
    reason: "The command does not match a local safety rule."
  };
}

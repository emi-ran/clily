import { z } from "zod";

import type { CommandGenerationContext, GenerateCommandResult } from "../types.js";

const riskLevelSchema = z.enum(["low", "medium", "high"]);

const partialGenerateCommandResultSchema = z.object({
  command: z.string().optional(),
  shell: z.string().optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  requiresConfirmation: z.boolean().optional(),
  riskLevel: z.unknown().optional(),
  reason: z.string().optional(),
  usedHistory: z.unknown().optional(),
  warnings: z.unknown().optional()
});

const generateCommandResultSchema = z.object({
  command: z.string(),
  shell: z.string(),
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
  riskLevel: riskLevelSchema,
  reason: z.string(),
  usedHistory: z.boolean(),
  warnings: z.array(z.string())
});

function normalizeRiskLevel(value: unknown, hasCommand: boolean): GenerateCommandResult["riskLevel"] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "low" || normalized === "medium" || normalized === "high") {
      return normalized;
    }
  }

  return hasCommand ? "medium" : "high";
}

export function normalizeCommandResult(parsed: unknown, context: CommandGenerationContext, providerName: string): GenerateCommandResult {
  const partial = partialGenerateCommandResultSchema.parse(parsed);
  const command = partial.command?.trim() ?? "";
  const warnings = Array.isArray(partial.warnings)
    ? partial.warnings.filter((item): item is string => typeof item === "string")
    : [];
  const usedHistory = typeof partial.usedHistory === "boolean"
    ? partial.usedHistory
    : context.history.length > 0;

  return generateCommandResultSchema.parse({
    command,
    shell: partial.shell ?? context.shell,
    intent: partial.intent ?? (command ? "run_command" : "refuse"),
    confidence: partial.confidence ?? (command ? 0.7 : 0),
    requiresConfirmation: partial.requiresConfirmation ?? true,
    riskLevel: normalizeRiskLevel(partial.riskLevel, Boolean(command)),
    reason: partial.reason ?? (command ? `Generated from ${providerName}.` : `${providerName} did not return a usable command.`),
    usedHistory,
    warnings
  });
}

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getConfigDir } from "../config/paths.js";
import type { ClilyConfig, CommandExecutionRecord } from "../types.js";

const executionRecordSchema = z.object({
  command: z.string(),
  shell: z.enum(["powershell", "cmd", "bash", "zsh", "unknown"]),
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  executedAt: z.string()
});

function getSessionPath(): string {
  return path.join(getConfigDir(), "session.json");
}

function truncateOutput(value: string): string {
  const trimmed = value.trim();
  return trimmed.length <= 4000 ? trimmed : `${trimmed.slice(0, 4000)}...`;
}

function sanitizeOutput(value: string, maskSecrets: boolean): string {
  if (!maskSecrets) {
    return truncateOutput(value);
  }

  return truncateOutput(
    value
      .replace(/(api[_-]?key\s*[=:]\s*)([^\s]+)/gi, "$1[masked]")
      .replace(/(token\s*[=:]\s*)([^\s]+)/gi, "$1[masked]")
      .replace(/(bearer\s+)([^\s]+)/gi, "$1[masked]")
      .replace(/[A-Fa-f0-9]{32,}/g, "[masked-secret]")
  );
}

export async function saveLastExecution(config: ClilyConfig, record: CommandExecutionRecord): Promise<void> {
  const safeRecord: CommandExecutionRecord = {
    ...record,
    stdout: sanitizeOutput(record.stdout, config.privacy.maskSecrets),
    stderr: sanitizeOutput(record.stderr, config.privacy.maskSecrets)
  };

  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getSessionPath(), `${JSON.stringify(safeRecord, null, 2)}\n`, "utf8");
}

export async function loadSessionContext(config: ClilyConfig): Promise<string[]> {
  if (!config.privacy.sendHistory || config.history.historyLimit === 0) {
    return [];
  }

  try {
    const raw = await fs.readFile(getSessionPath(), "utf8");
    const parsed = executionRecordSchema.parse(JSON.parse(raw));
    const context = [
      `Last command: ${parsed.command}`,
      `Last exit code: ${parsed.exitCode}`
    ];

    if (parsed.stdout) {
      context.push(`Last stdout: ${parsed.stdout}`);
    }

    if (parsed.stderr) {
      context.push(`Last stderr: ${parsed.stderr}`);
    }

    return context;
  } catch {
    return [];
  }
}

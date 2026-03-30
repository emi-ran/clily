import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCommandHistoryPath, getConfigDir } from "../config/paths.js";
import type { ClilyConfig, ShellName } from "../types.js";

function getHistoryPath(shell: ShellName): string | null {
  const homeDir = os.homedir();

  switch (shell) {
    case "powershell": {
      const appData = process.env.APPDATA ?? path.join(homeDir, "AppData", "Roaming");
      return path.join(appData, "Microsoft", "Windows", "PowerShell", "PSReadLine", "ConsoleHost_history.txt");
    }
    case "bash":
      return path.join(homeDir, ".bash_history");
    case "zsh":
      return path.join(homeDir, ".zsh_history");
    default:
      return null;
  }
}

export function sanitizeHistoryLine(line: string): string {
  return line
    .replace(/(api[_-]?key\s*[=:]\s*)([^\s]+)/gi, "$1[masked]")
    .replace(/(token\s*[=:]\s*)([^\s]+)/gi, "$1[masked]")
    .replace(/(bearer\s+)([^\s]+)/gi, "$1[masked]")
    .replace(/([A-Za-z0-9_\-.]*\.env[^\s]*)/g, "[masked-env-ref]")
    .replace(/[A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{24,}(\.[A-Za-z0-9_\-]{10,})?/g, "[masked-token]")
    .replace(/[A-Fa-f0-9]{32,}/g, "[masked-secret]");
}

export async function loadHistoryContext(config: ClilyConfig): Promise<string[]> {
  if (!config.privacy.sendHistory || config.history.historyLimit === 0) {
    return [];
  }

  const shellHistory = await loadShellHistory(config);
  const localHistory = await loadLocalCommandHistory(config);

  return dedupeHistory([...shellHistory, ...localHistory]).slice(-config.history.historyLimit);
}

export async function saveCommandHistory(config: ClilyConfig, command: string): Promise<void> {
  const nextEntry = config.privacy.maskSecrets ? sanitizeHistoryLine(command) : command.trim();
  if (!nextEntry) {
    return;
  }

  const existingEntries = await loadLocalCommandHistory({
    ...config,
    privacy: {
      ...config.privacy,
      sendHistory: true
    }
  });
  const dedupedEntries = dedupeHistory([...existingEntries, nextEntry]).slice(-Math.max(config.history.historyLimit, 20));

  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getCommandHistoryPath(), `${dedupedEntries.join("\n")}\n`, "utf8");
}

async function loadShellHistory(config: ClilyConfig): Promise<string[]> {
  const historyPath = getHistoryPath(config.shell);
  if (!historyPath) {
    return [];
  }

  try {
    const raw = await fs.readFile(historyPath, "utf8");
    const lines = raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-config.history.historyLimit);

    if (!config.privacy.maskSecrets) {
      return lines;
    }

    return lines.map(sanitizeHistoryLine);
  } catch {
    return [];
  }
}

async function loadLocalCommandHistory(config: ClilyConfig): Promise<string[]> {
  try {
    const raw = await fs.readFile(getCommandHistoryPath(), "utf8");
    const lines = raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!config.privacy.maskSecrets) {
      return lines;
    }

    return lines.map(sanitizeHistoryLine);
  } catch {
    return [];
  }
}

function dedupeHistory(lines: string[]): string[] {
  const deduped: string[] = [];

  for (const line of lines) {
    if (!line || deduped[deduped.length - 1] === line) {
      continue;
    }

    deduped.push(line);
  }

  return deduped;
}

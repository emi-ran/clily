import { select } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import pc from "picocolors";
import type { CommandExecutionRecord, GenerateCommandResult, SafetyEvaluation, ShellName } from "../types.js";
import { formatIndentedBlock, formatKeyValue, formatPanel, formatWrappedValue } from "./ui.js";

function getShellCommand(shell: ShellName): { file: string; args: string[] } {
  switch (shell) {
    case "powershell":
      return { file: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-Command"] };
    case "cmd":
      return { file: "cmd.exe", args: ["/d", "/s", "/c"] };
    case "bash":
      return { file: "bash", args: ["-lc"] };
    case "zsh":
      return { file: "zsh", args: ["-lc"] };
    default:
      if (process.platform === "win32") {
        return { file: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-Command"] };
      }

      return { file: "bash", args: ["-lc"] };
  }
}

export function printCommandPreview(result: GenerateCommandResult, safety: SafetyEvaluation): void {
  const lines = [
    pc.dim("Command"),
    ...formatIndentedBlock(result.command).map((line) => pc.bold(line)),
    "",
    formatKeyValue("Shell", pc.white(result.shell)),
    formatKeyValue("Risk", formatRiskLevel(result.riskLevel)),
    formatKeyValue("Safety", formatSafetyMatch(safety.match)),
    ...formatWrappedValue("Why", result.reason)
  ];

  if (result.warnings.length > 0) {
    lines.push(...formatWrappedValue("Notes", result.warnings.join(" | "), pc.yellow));
  }

  console.log("");
  console.log(formatPanel("Clily Preview", lines));
}

export async function shouldRunCommand(options: {
  forceRun: boolean;
  shell: ShellName;
  result: GenerateCommandResult;
  safety: SafetyEvaluation;
}): Promise<boolean> {
  const { forceRun, result, safety } = options;

  if (safety.blocked) {
    return false;
  }

  if (canSkipConfirmationWithForceRun(forceRun, result, safety)) {
    return true;
  }

  const action = await select<string>({
    message: `${pc.bold("Run in ")}${pc.cyan(options.shell)}${pc.dim("?")}`,
    choices: [
      { name: pc.green("Run"), value: "run" },
      { name: pc.red("Cancel"), value: "cancel" }
    ],
    default: safety.shouldConfirm || result.riskLevel !== "low" ? "cancel" : "run"
  });

  return action === "run";
}

export function canSkipConfirmationWithForceRun(
  forceRun: boolean,
  result: GenerateCommandResult,
  safety: SafetyEvaluation
): boolean {
  if (!forceRun || safety.blocked) {
    return false;
  }

  if (safety.match === "warnlist" || safety.match === "denylist") {
    return false;
  }

  return result.riskLevel === "low";
}

function formatRiskLevel(riskLevel: GenerateCommandResult["riskLevel"]): string {
  switch (riskLevel) {
    case "low":
      return pc.green("low");
    case "medium":
      return pc.yellow("medium");
    case "high":
      return pc.red("high");
  }
}

function formatSafetyMatch(match: SafetyEvaluation["match"]): string {
  switch (match) {
    case "allowlist":
      return pc.green("allowlist");
    case "warnlist":
      return pc.yellow("warnlist");
    case "denylist":
      return pc.red("denylist");
    case "none":
      return pc.dim("none");
  }
}

export async function runCommand(command: string, shell: ShellName): Promise<CommandExecutionRecord> {
  const shellCommand = getShellCommand(shell);

  const child = spawn(shellCommand.file, [...shellCommand.args, command], {
    stdio: ["inherit", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (chunk: Buffer | string) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  return await new Promise<CommandExecutionRecord>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve({
      command,
      shell,
      exitCode: code ?? 1,
      stdout,
      stderr,
      executedAt: new Date().toISOString()
    }));
  });
}

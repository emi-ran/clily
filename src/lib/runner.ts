import { select } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import type { GenerateCommandResult, SafetyEvaluation, ShellName } from "../types.js";

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
  console.log(`Command: ${result.command}`);
  console.log(`Risk: ${result.riskLevel}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Safety: ${safety.match}`);

  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.join(" | ")}`);
  }
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

  if (forceRun && !safety.shouldConfirm) {
    return true;
  }

  const action = await select<string>({
    message: `Run this command in ${options.shell}?`,
    choices: [
      { name: "Run", value: "run" },
      { name: "Cancel", value: "cancel" }
    ],
    default: safety.shouldConfirm || result.riskLevel !== "low" ? "cancel" : "run"
  });

  return action === "run";
}

export async function runCommand(command: string, shell: ShellName): Promise<number> {
  const shellCommand = getShellCommand(shell);

  const child = spawn(shellCommand.file, [...shellCommand.args, command], {
    stdio: "inherit"
  });

  return await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

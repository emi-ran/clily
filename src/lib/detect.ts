import type { ShellName } from "../types.js";

export function detectShell(): ShellName {
  const shell = process.env.SHELL?.toLowerCase() ?? "";
  const comspec = process.env.ComSpec?.toLowerCase() ?? "";
  const psModulePath = process.env.PSModulePath?.toLowerCase() ?? "";

  if (psModulePath.includes("powershell") || comspec.includes("powershell")) {
    return "powershell";
  }

  if (comspec.includes("cmd.exe")) {
    return "cmd";
  }

  if (shell.includes("zsh")) {
    return "zsh";
  }

  if (shell.includes("bash")) {
    return "bash";
  }

  if (process.platform === "win32") {
    return "powershell";
  }

  return "unknown";
}

export function detectOsLabel(): string {
  if (process.platform === "win32") {
    return "windows";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  if (process.platform === "linux") {
    return "linux";
  }

  return process.platform;
}

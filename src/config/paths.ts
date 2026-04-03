import os from "node:os";
import path from "node:path";

export function getConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "clily");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "clily");
  }

  const xdgConfigHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(xdgConfigHome, "clily");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function getSecretsPath(): string {
  return path.join(getConfigDir(), "secrets.enc.json");
}

export function getCommandHistoryPath(): string {
  return path.join(getConfigDir(), "command-history.log");
}

export function getUpdateStatePath(): string {
  return path.join(getConfigDir(), "update-state.json");
}

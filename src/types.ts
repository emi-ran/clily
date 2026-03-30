export type SafetyMode = "safe" | "balanced" | "auto";

export type ProviderName = "gemini";

export type ShellName = "powershell" | "cmd" | "bash" | "zsh" | "unknown";

export interface PrivacyConfig {
  maskSecrets: boolean;
  sendHistory: boolean;
}

export interface HistoryConfig {
  historyLimit: number;
}

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  apiKey?: string;
}

export interface SafetyLists {
  allowlist: string[];
  warnlist: string[];
  denylist: string[];
}

export interface ClilyConfig {
  mode: SafetyMode;
  provider: ProviderConfig;
  shell: ShellName;
  privacy: PrivacyConfig;
  history: HistoryConfig;
  safety: SafetyLists;
}

export interface GeminiModelInfo {
  name: string;
  displayName?: string;
  description?: string;
  supportedActions?: string[];
}

export interface GenerateCommandResult {
  command: string;
  shell: string;
  intent: string;
  confidence: number;
  requiresConfirmation: boolean;
  riskLevel: "low" | "medium" | "high";
  reason: string;
  usedHistory: boolean;
  warnings: string[];
}

export type SafetyMatch = "allowlist" | "warnlist" | "denylist" | "none";

export interface SafetyEvaluation {
  match: SafetyMatch;
  blocked: boolean;
  shouldConfirm: boolean;
  reason: string;
}

export interface CommandGenerationContext {
  request: string;
  os: string;
  shell: ShellName;
  history: string[];
}

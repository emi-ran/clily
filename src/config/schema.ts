import { z } from "zod";

export const safetyModeSchema = z.enum(["safe", "balanced", "auto"]);
export const providerNameSchema = z.enum(["gemini"]);
export const shellNameSchema = z.enum(["powershell", "cmd", "bash", "zsh", "unknown"]);

export const configSchema = z.object({
  mode: safetyModeSchema,
  provider: z.object({
    name: providerNameSchema,
    model: z.string().min(1),
    apiKey: z.string().min(1).optional()
  }),
  shell: shellNameSchema,
  privacy: z.object({
    maskSecrets: z.boolean(),
    sendHistory: z.boolean()
  }),
  history: z.object({
    historyLimit: z.number().int().min(0)
  }),
  safety: z.object({
    allowlist: z.array(z.string()),
    warnlist: z.array(z.string()),
    denylist: z.array(z.string())
  })
});

export type ConfigSchema = z.infer<typeof configSchema>;

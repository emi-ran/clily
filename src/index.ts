#!/usr/bin/env node

import { Command } from "commander";
import { configExists, loadConfig } from "./config/store.js";
import { getConfigPath } from "./config/paths.js";
import { detectOsLabel, detectShell } from "./lib/detect.js";
import { generateGeminiCommand } from "./lib/gemini.js";
import { loadHistoryContext } from "./lib/history.js";
import { printCommandPreview, runCommand, shouldRunCommand } from "./lib/runner.js";
import { evaluateSafety } from "./lib/safety.js";
import { runSetup } from "./setup.js";

const program = new Command();

program
  .name("clily")
  .description("Generate safer shell commands from natural language")
  .argument("[request...]", "Natural language request")
  .option("--setup", "Run setup wizard")
  .option("--show-config", "Show current config path")
  .option("--run", "Run the generated command when allowed")
  .action(async (requestParts: string[], options: { setup?: boolean; showConfig?: boolean; run?: boolean }) => {
    if (options.showConfig) {
      console.log(getConfigPath());
      return;
    }

    const needsSetup = options.setup || !(await configExists());
    if (needsSetup) {
      const config = await runSetup();
      console.log(`Setup complete. Provider model: ${config.provider.model}`);
      return;
    }

    const config = await loadConfig();
    const request = requestParts.join(" ").trim();

    if (!request) {
      console.log("No request provided. Run `clily --setup` to configure or pass a prompt.");
      return;
    }

    if (!config.provider.apiKey) {
      throw new Error("No API key found. Run `clily --setup` to configure Gemini.");
    }

    const history = await loadHistoryContext(config);
    const result = await generateGeminiCommand({
      apiKey: config.provider.apiKey,
      model: config.provider.model,
      context: {
        request,
        os: detectOsLabel(),
        shell: config.shell || detectShell(),
        history
      }
    });

    const safety = evaluateSafety(config, result);
    printCommandPreview(result, safety);

    if (safety.blocked) {
      console.log(`Blocked: ${safety.reason}`);
      return;
    }

    const shouldRun = await shouldRunCommand({
      forceRun: options.run ?? false,
      shell: config.shell || detectShell(),
      result,
      safety
    });

    if (!shouldRun) {
      console.log("Cancelled.");
      return;
    }

    const exitCode = await runCommand(result.command, config.shell || detectShell());
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("sigint") || message.includes("force closed the prompt")) {
      process.exitCode = 130;
      return;
    }
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

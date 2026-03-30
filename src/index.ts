#!/usr/bin/env node

import { Command } from "commander";
import { configExists, loadConfig } from "./config/store.js";
import { getConfigPath } from "./config/paths.js";
import { detectOsLabel, detectShell } from "./lib/detect.js";
import { loadHistoryContext } from "./lib/history.js";
import { generateCommand } from "./lib/provider.js";
import { printCommandPreview, runCommand, shouldRunCommand } from "./lib/runner.js";
import { evaluateSafety } from "./lib/safety.js";
import { loadSessionContext, saveLastExecution } from "./lib/session.js";
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

    const history = [
      ...(await loadHistoryContext(config)),
      ...(await loadSessionContext(config))
    ];
    const result = await generateCommand(config, {
      request,
      os: detectOsLabel(),
      shell: config.shell || detectShell(),
      history
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

    const execution = await runCommand(result.command, config.shell || detectShell());
    await saveLastExecution(config, execution);

    if (execution.exitCode !== 0) {
      process.exitCode = execution.exitCode;
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

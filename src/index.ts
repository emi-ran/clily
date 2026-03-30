#!/usr/bin/env node

import { Command } from "commander";
import {
  addSafetyPattern,
  configExists,
  inspectConfigDoctor,
  loadConfig,
  removeSafetyPattern,
  requireConfig,
  updateConfigValue
} from "./config/store.js";
import { getConfigPath } from "./config/paths.js";
import { detectOsLabel, detectShell } from "./lib/detect.js";
import { formatConfig, formatConfigDoctor, formatSafetyList } from "./lib/format.js";
import { loadHistoryContext } from "./lib/history.js";
import { generateCommand } from "./lib/provider.js";
import { printCommandPreview, runCommand, shouldRunCommand } from "./lib/runner.js";
import { evaluateSafety } from "./lib/safety.js";
import { loadSessionContext, saveLastExecution } from "./lib/session.js";
import { formatNotice } from "./lib/ui.js";
import { runSetup } from "./setup.js";
import type { ClilyConfig } from "./types.js";

const program = new Command();
const configCommand = program.command("config");
const safetyCommand = program.command("safety");

program
  .name("clily")
  .description("Turn natural language into safer terminal commands")
  .addHelpText("after", [
    "",
    "Examples:",
    "  clily \"git status\"",
    "  clily \"choco ile ruby kur\" --run",
    "  clily --setup",
    "  clily config show",
    "  clily config set history.historyLimit 10",
    "  clily safety allow add \"git status\"",
    "",
    "Common config keys:",
    "  mode | provider.name | provider.model | provider.apiKey",
    "  shell | privacy.maskSecrets | privacy.sendHistory | history.historyLimit"
  ].join("\n"))
  .showHelpAfterError();

program
  .command("setup")
  .description("Run the interactive setup wizard again")
  .action(async () => {
    await runSetup();
  });

configCommand
  .description("View or update saved Clily settings")
  .addHelpText("after", [
    "",
    "Examples:",
    "  clily config show",
    "  clily config doctor",
    "  clily config path",
    "  clily config set mode auto",
    "  clily config set privacy.sendHistory false",
    "  clily config set history.historyLimit 5"
  ].join("\n"))

configCommand
  .command("doctor")
  .description("Run basic config and secret storage health checks")
  .action(async () => {
    console.log(formatConfigDoctor(await inspectConfigDoctor()));
  });

configCommand
  .command("show")
  .description("Print the current config in a readable format")
  .action(async () => {
    console.log(formatConfig(await requireConfig()));
  });

configCommand
  .command("path")
  .description("Show where the config file is stored")
  .action(() => {
    console.log(formatNotice("info", getConfigPath()));
  });

configCommand
  .command("set")
  .description("Update one config value without rerunning setup")
  .argument("<path>", "Config path, for example mode or history.historyLimit")
  .argument("<value>", "New value")
  .action(async (path: string, value: string) => {
    const config = await updateConfigValue(path as Parameters<typeof updateConfigValue>[0], value);
    console.log(formatNotice("success", `Updated ${path}`));
    console.log(formatConfig(config));
  });

safetyCommand
  .description("Manage local allowlist, warnlist, and denylist rules")
  .addHelpText("after", [
    "",
    "Examples:",
    "  clily safety allow list",
    "  clily safety allow add \"git status\"",
    "  clily safety warn add \"docker rm *\"",
    "  clily safety deny remove \"rm -rf *\""
  ].join("\n"));

addSafetyCommands(safetyCommand, "allow", "allowlist");
addSafetyCommands(safetyCommand, "warn", "warnlist");
addSafetyCommands(safetyCommand, "deny", "denylist");

program
  .argument("[request...]", "Natural language request to convert into a command")
  .option("--setup", "Run the setup wizard before doing anything else")
  .option("--show-config", "Print the config file path and exit")
  .option("--run", "Run the generated command when local safety rules allow it")
  .action(async (requestParts: string[], options: { setup?: boolean; showConfig?: boolean; run?: boolean }) => {
    if (options.showConfig) {
      console.log(formatNotice("info", getConfigPath()));
      return;
    }

    if (options.setup || !(await configExists())) {
      await runSetup();
      return;
    }

    const request = requestParts.join(" ").trim();
    if (!request) {
      program.outputHelp();
      return;
    }

    await handlePrompt(request, options.run ?? false);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("sigint") || message.includes("force closed the prompt")) {
      process.exitCode = 130;
      return;
    }
  }

  console.error(formatNotice("error", error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});

async function handlePrompt(request: string, forceRun: boolean): Promise<void> {
  const config = await loadConfig();
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

  const shell = config.shell || detectShell();
  const safety = evaluateSafety(config, result);
  printCommandPreview(result, safety);

  if (safety.blocked) {
    console.log(formatNotice("error", `Blocked: ${safety.reason}`));
    return;
  }

  const shouldRun = await shouldRunCommand({
    forceRun,
    shell,
    result,
    safety
  });

  if (!shouldRun) {
    console.log(formatNotice("warning", "Cancelled."));
    return;
  }

  const execution = await runCommand(result.command, shell);
  await saveLastExecution(config, execution);

  if (execution.exitCode !== 0) {
    process.exitCode = execution.exitCode;
  }
}

function addSafetyCommands(parent: Command, name: "allow" | "warn" | "deny", key: keyof ClilyConfig["safety"]): void {
  const safetyCommand = parent.command(name).description(`Manage the ${key} entries`);

  safetyCommand
    .command("list")
    .description(`List all ${key} patterns`)
    .action(async () => {
      const config = await requireConfig();
      console.log(formatSafetyList(key, config.safety[key]));
    });

  safetyCommand
    .command("add")
    .description(`Add a pattern to ${key}`)
    .argument("<pattern>", "Pattern to add")
    .action(async (pattern: string) => {
      const config = await addSafetyPattern(key, pattern);
      console.log(formatNotice("success", `Added to ${key}: ${pattern}`));
      console.log(formatSafetyList(key, config.safety[key]));
    });

  safetyCommand
    .command("remove")
    .description(`Remove a pattern from ${key}`)
    .argument("<pattern>", "Pattern to remove")
    .action(async (pattern: string) => {
      const config = await removeSafetyPattern(key, pattern);
      console.log(formatNotice("success", `Removed from ${key}: ${pattern}`));
      console.log(formatSafetyList(key, config.safety[key]));
    });
}

import pc from "picocolors";

export function formatPanel(title: string, lines: string[]): string {
  const width = getUiWidth();
  const divider = pc.dim("─".repeat(width));
  return [pc.bold(pc.cyan(title)), divider, ...lines, divider].join("\n");
}

export function formatKeyValue(label: string, value: string): string {
  return `${pc.dim(label.padEnd(12))} ${value}`;
}

export function formatIndentedBlock(value: string): string[] {
  return wrapText(value, Math.max(getUiWidth() - 2, 30)).map((line) => `  ${pc.white(line)}`);
}

export function formatWrappedValue(label: string, value: string, colorize: (value: string) => string = pc.white): string[] {
  const lines = wrapText(value, Math.max(getUiWidth() - 14, 24));
  return lines.map((line, index) => index === 0
    ? formatKeyValue(label, colorize(line))
    : `${pc.dim(" ".repeat(13))}${colorize(line)}`);
}

export function formatNotice(kind: "success" | "warning" | "error" | "info", message: string): string {
  switch (kind) {
    case "success":
      return `${pc.green("OK")} ${message}`;
    case "warning":
      return `${pc.yellow("WARN")} ${message}`;
    case "error":
      return `${pc.red("ERR")} ${message}`;
    case "info":
      return `${pc.cyan("INFO")} ${message}`;
  }
}

export function getUiWidth(): number {
  const terminalWidth = process.stdout.columns ?? 80;
  return Math.max(Math.min(terminalWidth - 4, 84), 56);
}

function wrapText(value: string, width: number): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
      continue;
    }

    if (`${currentLine} ${word}`.length <= width) {
      currentLine = `${currentLine} ${word}`;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

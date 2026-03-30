import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCommandResult } from "../src/lib/command-result.ts";

const baseContext = {
  request: "ruby kurulu mu",
  os: "Windows 11",
  shell: "powershell" as const,
  history: []
};

test("normalizeCommandResult accepts mixed-case risk levels", () => {
  const result = normalizeCommandResult({
    command: "ruby -v",
    shell: "powershell",
    intent: "check_install",
    confidence: 0.9,
    requiresConfirmation: false,
    riskLevel: "LOW",
    reason: "Version check.",
    usedHistory: false,
    warnings: []
  }, baseContext, "Gemini");

  assert.equal(result.riskLevel, "low");
});

test("normalizeCommandResult falls back safely on invalid risk levels", () => {
  const result = normalizeCommandResult({
    command: "ruby -v",
    riskLevel: "minimal"
  }, baseContext, "Groq");

  assert.equal(result.riskLevel, "medium");
  assert.equal(result.command, "ruby -v");
});

test("normalizeCommandResult tolerates numeric risk levels", () => {
  const result = normalizeCommandResult({
    command: "ruby -v",
    riskLevel: 1
  }, baseContext, "Groq");

  assert.equal(result.riskLevel, "medium");
});

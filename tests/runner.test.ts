import test from "node:test";
import assert from "node:assert/strict";

import { canSkipConfirmationWithForceRun } from "../src/lib/runner.ts";
import type { GenerateCommandResult, SafetyEvaluation } from "../src/types.ts";

function createResult(overrides: Partial<GenerateCommandResult> = {}): GenerateCommandResult {
  return {
    command: "node -v",
    shell: "powershell",
    intent: "run_command",
    confidence: 0.9,
    requiresConfirmation: false,
    riskLevel: "low",
    reason: "test",
    usedHistory: false,
    warnings: [],
    ...overrides
  };
}

function createSafety(overrides: Partial<SafetyEvaluation> = {}): SafetyEvaluation {
  return {
    match: "none",
    blocked: false,
    shouldConfirm: true,
    reason: "test",
    ...overrides
  };
}

test("force run skips confirmation for low-risk commands outside warnlist", () => {
  assert.equal(
    canSkipConfirmationWithForceRun(true, createResult({ riskLevel: "low" }), createSafety({ match: "none" })),
    true
  );
});

test("force run does not skip confirmation for warnlist commands", () => {
  assert.equal(
    canSkipConfirmationWithForceRun(true, createResult({ riskLevel: "low" }), createSafety({ match: "warnlist", shouldConfirm: true })),
    false
  );
});

test("force run does not skip confirmation for medium risk commands", () => {
  assert.equal(
    canSkipConfirmationWithForceRun(true, createResult({ riskLevel: "medium" }), createSafety({ match: "none", shouldConfirm: true })),
    false
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import { parseCommandResultText } from "../src/lib/provider-shared.ts";

test("parseCommandResultText accepts fenced valid JSON", () => {
  const parsed = parseCommandResultText("```json\n{\n  \"command\": \"ruby -v\",\n  \"riskLevel\": \"low\"\n}\n```");

  assert.deepEqual(parsed, {
    command: "ruby -v",
    riskLevel: "low"
  });
});

test("parseCommandResultText repairs unquoted keys and single quotes", () => {
  const parsed = parseCommandResultText(`{ command: 'ruby -v', riskLevel: 'low', }`);

  assert.deepEqual(parsed, {
    command: "ruby -v",
    riskLevel: "low"
  });
});

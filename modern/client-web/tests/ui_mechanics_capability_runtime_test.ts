import assert from "node:assert/strict";
import {
  buildMechanicsCapabilityMatrixRuntime,
  summarizeMechanicsCapabilitiesRuntime
} from "../gameplay/mechanics_capability_runtime.ts";

function testDefaultMatrix() {
  const matrix = buildMechanicsCapabilityMatrixRuntime({});
  assert.equal(matrix.length, 8, "default mechanics capability count mismatch");
  const summary = summarizeMechanicsCapabilitiesRuntime(matrix);
  assert.deepEqual(
    summary,
    { total: 8, implemented: 3, partial: 1, planned: 4 },
    "default mechanics capability summary mismatch"
  );
}

function testQuestExtensionPromotion() {
  const matrix = buildMechanicsCapabilityMatrixRuntime({ quest_system: true });
  const quest = matrix.find((m) => m.key === "quest_state_progression");
  assert.ok(quest, "quest capability missing");
  assert.equal(quest!.status, "partial", "quest extension should promote quest capability to partial");
  const summary = summarizeMechanicsCapabilitiesRuntime(matrix);
  assert.deepEqual(
    summary,
    { total: 8, implemented: 3, partial: 2, planned: 3 },
    "quest extension capability summary mismatch"
  );
}

testDefaultMatrix();
testQuestExtensionPromotion();

console.log("ui_mechanics_capability_runtime_test: ok");

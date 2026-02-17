import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildMechanicsCapabilityMatrixRuntime,
  summarizeMechanicsCapabilitiesRuntime,
  validateMechanicsCapabilityMatrixRuntime
} from "../gameplay/mechanics_capability_runtime.ts";

function testDefaultMatrix() {
  const matrix = buildMechanicsCapabilityMatrixRuntime({});
  assert.equal(matrix.length, 8, "default mechanics capability count mismatch");
  const targeted = matrix.find((m) => m.key === "targeted_interaction_core");
  assert.ok(targeted, "targeted interaction capability missing");
  assert.equal(targeted!.legacy_anchor, "legacy/u6-decompiled/SRC/seg_27a1.c", "targeted legacy anchor mismatch");
  assert.equal(targeted!.regression_gates.length, 1, "targeted regression gate count mismatch");
  const summary = summarizeMechanicsCapabilitiesRuntime(matrix);
  assert.deepEqual(
    summary,
    { total: 8, implemented: 3, partial: 1, planned: 4 },
    "default mechanics capability summary mismatch"
  );
  const validation = validateMechanicsCapabilityMatrixRuntime(matrix);
  assert.deepEqual(
    validation,
    { duplicate_keys: 0, missing_legacy_anchors: 0, missing_regression_gates: 0 },
    "default mechanics capability validation mismatch"
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

function testCapabilityEvidencePathsExist() {
  const matrix = buildMechanicsCapabilityMatrixRuntime({});
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
  for (const entry of matrix) {
    const anchor = path.resolve(root, entry.legacy_anchor);
    assert.equal(
      fs.existsSync(anchor),
      true,
      `missing legacy anchor file for ${entry.key}: ${entry.legacy_anchor}`
    );
    for (const gate of entry.regression_gates) {
      const gatePath = path.resolve(root, gate);
      assert.equal(
        fs.existsSync(gatePath),
        true,
        `missing regression gate path for ${entry.key}: ${gate}`
      );
    }
  }
}

testDefaultMatrix();
testQuestExtensionPromotion();
testCapabilityEvidencePathsExist();

console.log("ui_mechanics_capability_runtime_test: ok");

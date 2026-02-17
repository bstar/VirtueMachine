import assert from "node:assert/strict";
import { buildMechanicsCapabilityMatrixRuntime } from "../gameplay/mechanics_capability_runtime.ts";
import {
  buildVerbCapabilityBindingsRuntime,
  summarizeVerbCapabilityBindingsRuntime
} from "../gameplay/verb_capability_runtime.ts";

function testVerbCapabilityBindings() {
  const capabilities = buildMechanicsCapabilityMatrixRuntime({});
  const bindings = buildVerbCapabilityBindingsRuntime(capabilities);
  assert.equal(bindings.length, 10, "verb capability binding count mismatch");
  const talk = bindings.find((b) => b.verb === "t");
  assert.ok(talk, "talk verb binding missing");
  assert.equal(talk!.capability_key, "conversation_opcode_engine", "talk capability key mismatch");
  assert.equal(talk!.status, "partial", "talk capability status mismatch");
}

function testVerbCapabilitySummary() {
  const capabilities = buildMechanicsCapabilityMatrixRuntime({});
  const bindings = buildVerbCapabilityBindingsRuntime(capabilities);
  const summary = summarizeVerbCapabilityBindingsRuntime(bindings);
  assert.deepEqual(
    summary,
    { total: 10, implemented: 7, partial: 1, planned: 2, unknown: 0 },
    "verb capability summary mismatch"
  );
}

testVerbCapabilityBindings();
testVerbCapabilitySummary();

console.log("ui_verb_capability_runtime_test: ok");

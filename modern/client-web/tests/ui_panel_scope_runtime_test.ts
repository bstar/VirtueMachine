import assert from "node:assert/strict";
import { buildUiProbeContract } from "../ui_probe_contract.ts";
import {
  CANONICAL_UI_PANEL_KEYS,
  MODERN_UI_PANEL_KEYS,
  validatePanelScopeRuntime
} from "../ui/panel_scope_runtime.ts";

function testScopeListProjection() {
  const probe = buildUiProbeContract({ mode: "sample" });
  assert.deepEqual(
    probe.ui_scope.canonical_ui,
    [...CANONICAL_UI_PANEL_KEYS],
    "canonical scope list mismatch"
  );
  assert.deepEqual(
    probe.ui_scope.modern_ui,
    [...MODERN_UI_PANEL_KEYS],
    "modern scope list mismatch"
  );
}

function testScopeValidatorPassesProbe() {
  const probe = buildUiProbeContract({ mode: "sample" });
  const result = validatePanelScopeRuntime({
    canonical_ui: probe.canonical_ui,
    modern_ui: probe.modern_ui
  });
  assert.equal(result.ok, true, "sample probe should satisfy panel scope contract");
}

function testScopeValidatorCatchesUnclassifiedPanels() {
  const probe = buildUiProbeContract({ mode: "sample" });
  const bad = {
    canonical_ui: {
      ...probe.canonical_ui,
      debug_panel: {}
    },
    modern_ui: {
      ...probe.modern_ui
    }
  };
  const result = validatePanelScopeRuntime(bad);
  assert.equal(result.ok, false, "unclassified canonical panel should fail validation");
  assert.equal(result.canonical_unclassified.includes("debug_panel"), true, "missing unclassified panel report");
}

testScopeListProjection();
testScopeValidatorPassesProbe();
testScopeValidatorCatchesUnclassifiedPanels();

console.log("ui_panel_scope_runtime_test: ok");

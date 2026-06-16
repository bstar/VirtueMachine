import assert from "node:assert/strict";
import path from "node:path";
import {
  assertObjectBaselineDirRuntime,
  buildWorldObjectStateFromBaselineRuntime,
  loadBaseTileMapForWorldObjectsRuntime,
  loadWorldObjectBaselineRuntime
} from "../world_object_baseline_runtime.ts";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const RUNTIME_DIR = path.join(ROOT, "modern", "assets", "runtime");
const BASELINE_DIR = path.join(ROOT, "modern", "assets", "pristine", "savegame");

assert.equal(assertObjectBaselineDirRuntime(BASELINE_DIR), BASELINE_DIR);

const baseTileMap = loadBaseTileMapForWorldObjectsRuntime(RUNTIME_DIR);
assert.equal(baseTileMap.length, 0x400);

const baseline = loadWorldObjectBaselineRuntime({
  nowIso: () => "2026-06-14T00:00:00.000Z",
  objectBaselineDir: BASELINE_DIR,
  runtimeDir: RUNTIME_DIR
});
assert.equal(baseline.loaded_at, "2026-06-14T00:00:00.000Z");
assert.equal(baseline.files_loaded, 64);
assert.ok(baseline.baseline_count > 8000, "expected full pristine object baseline");
assert.equal(baseline.objects.length, baseline.baseline_count);

const state = buildWorldObjectStateFromBaselineRuntime({
  nowIso: () => "2026-06-14T00:00:00.000Z",
  nowMs: () => 1000,
  objectBaselineDir: BASELINE_DIR,
  rawDeltas: null,
  runtimeDir: RUNTIME_DIR
});
assert.ok(state.baseline);
assert.equal(state.baseline.files_loaded, 64);
assert.equal(state.active.length, state.baseline.baseline_count);
assert.ok(state.activeByAnchor instanceof Map);

console.log("world_object_baseline_runtime_test: ok");

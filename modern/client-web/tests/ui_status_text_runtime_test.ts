import assert from "node:assert/strict";
import {
  formatAvatarStateRuntime,
  formatClockRuntime,
  formatDateRuntime,
  formatInputModeRuntime,
  formatLayerCountRuntime,
  formatLedgerEntryCountRuntime,
  formatLoopHealthRuntime,
  formatPositionRuntime,
  formatRenderParityRuntime
} from "../ui/status_text_runtime.ts";

assert.deepEqual(formatClockRuntime({ time_h: 9, time_m: 5 }), {
  hh: "09",
  mm: "05",
  text: "09:05"
});
assert.equal(formatDateRuntime({ date_d: 1, date_m: 3, date_y: 99 }), "1 / 3 / 99");
assert.equal(formatPositionRuntime({ map_x: 307, map_y: 347, map_z: 0 }), "307, 347, 0");

assert.equal(formatInputModeRuntime({
  movementMode: "avatar",
  sessionStarted: false,
  targetVerb: "",
  targetVerbLabels: {},
  useCursorActive: false
}), "Title Menu");
assert.equal(formatInputModeRuntime({
  movementMode: "avatar",
  sessionStarted: true,
  targetVerb: "look",
  targetVerbLabels: { look: "Look" },
  useCursorActive: true
}), "Look Target");
assert.equal(formatInputModeRuntime({
  movementMode: "ghost",
  sessionStarted: true,
  targetVerb: "",
  targetVerbLabels: {},
  useCursorActive: false
}), "Ghost");

assert.equal(formatLayerCountRuntime(3, 12, true), "3 / 12");
assert.equal(formatLayerCountRuntime(3, 12, false), "0 / 0");
assert.equal(formatRenderParityRuntime({ mismatchCount: 2, interactionProbeTile: null }), "warn (2)");
assert.equal(formatRenderParityRuntime({ mismatchCount: 0, interactionProbeTile: 0x2a }), "ok (probe 0x2a)");
assert.equal(formatRenderParityRuntime({ mismatchCount: 0, interactionProbeTile: null }), "ok");

assert.equal(formatAvatarStateRuntime({ facingDx: -1, facingDy: 0, movementMode: "avatar", pose: "sit" }), "avatar (W, sit)");
assert.equal(formatAvatarStateRuntime({ facingDx: 0, facingDy: -1, movementMode: "avatar", pose: "sleep" }), "avatar (N, sleep)");
assert.equal(formatAvatarStateRuntime({ facingDx: 0, facingDy: 1, movementMode: "avatar", pose: "other" }), "avatar (S, stand)");
assert.equal(formatAvatarStateRuntime({ facingDx: 1, facingDy: 0, movementMode: "ghost", pose: "sleep" }), "ghost");

assert.equal(formatLoopHealthRuntime({
  backlogDrops: 2,
  frameErrors: 1,
  lastDtMs: 12.6,
  maxDtMs: 99.2,
  paused: true,
  visibilityResets: 3
}), "paused | dt 13ms / max 99ms | drop 2 | vis 3 | err 1");

assert.equal(formatLedgerEntryCountRuntime(0), "0 entries");
assert.equal(formatLedgerEntryCountRuntime(1), "1 entry");
assert.equal(formatLedgerEntryCountRuntime(2), "2 entries");

console.log("ui_status_text_runtime_test: ok");

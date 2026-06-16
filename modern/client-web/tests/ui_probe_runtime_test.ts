import assert from "node:assert/strict";
import { LEGACY_COMMAND_TYPE_RUNTIME } from "../sim/legacy_command_runtime.ts";
import {
  buildUiProbeRuntimePayloadRuntime,
  installUiProbeDebugHooksRuntime,
  nextUiProbeModeRuntime,
  normalizeUiProbeModeRuntime,
  uiProbeCapturePresentationRuntime,
  uiProbeCapturedTextRuntime,
  uiProbeCopyStatusRuntime,
  uiProbeFilenameRuntime,
  uiProbeModePresentationRuntime,
  uiProbeModeTextRuntime
} from "../ui/probe_runtime.ts";

assert.equal(normalizeUiProbeModeRuntime("sample"), "sample");
assert.equal(normalizeUiProbeModeRuntime("live"), "live");
assert.equal(normalizeUiProbeModeRuntime("bad"), "live");
assert.equal(nextUiProbeModeRuntime("live"), "sample");
assert.equal(nextUiProbeModeRuntime("sample"), "live");
assert.equal(nextUiProbeModeRuntime("bad"), "sample");
assert.equal(uiProbeFilenameRuntime(123), "virtuemachine-ui-probe-123.json");
assert.equal(uiProbeFilenameRuntime(-1), "virtuemachine-ui-probe-4294967295.json");
assert.equal(uiProbeCopyStatusRuntime("abc123"), "probe abc123");
assert.equal(
  uiProbeCapturedTextRuntime({ digest: "abc123", filename: "probe.json" }),
  "UI probe captured (abc123) and downloaded as probe.json."
);
assert.deepEqual(uiProbeCapturePresentationRuntime({ digest: "abc123", filename: "probe.json" }), {
  copyStatusText: "probe abc123",
  diagClass: "diag ok",
  diagText: "UI probe captured (abc123) and downloaded as probe.json."
});
assert.equal(uiProbeModeTextRuntime("sample"), "Canonical UI probe mode: sample.");
assert.equal(uiProbeModeTextRuntime("bad"), "Canonical UI probe mode: live.");
assert.deepEqual(uiProbeModePresentationRuntime("sample"), {
  diagClass: "diag ok",
  diagText: "Canonical UI probe mode: sample."
});

{
  const target: {
    __vmCaptureUiProbe?: () => { digest: string; probe: { tick: number } };
    __vmGetUiProbe?: () => { tick: number };
    __vmLastUiProbe?: { tick: number };
    __vmLastUiProbeDigest?: string;
  } = {};
  let tick = 0;
  installUiProbeDebugHooksRuntime({
    target,
    buildProbe: () => ({ tick: ++tick }),
    digestProbe: (probe) => `digest-${probe.tick}`
  });
  assert.deepEqual(target.__vmGetUiProbe?.(), { tick: 1 });
  assert.equal(target.__vmLastUiProbe, undefined);
  assert.deepEqual(target.__vmCaptureUiProbe?.(), {
    digest: "digest-2",
    probe: { tick: 2 }
  });
  assert.deepEqual(target.__vmLastUiProbe, { tick: 2 });
  assert.equal(target.__vmLastUiProbeDigest, "digest-2");
}

{
  const runtimeExtensions = { authoritativeWorldObjects: true };
  const partyNameById = { "1": "Avatar" };
  const equipmentSlots = [{ tile_id: 0x220 }];
  const partyMembers = [1, 12];
  const payload = buildUiProbeRuntimePayloadRuntime({
    sim: { tick: 7 },
    commandLog: [{ tick: 1, kind: "move" }],
    runtimeProfile: "canonical_plus",
    runtimeExtensions,
    movement: {
      mode: "avatar",
      facingDx: -1,
      facingDy: 0,
      lastMoveTick: 6,
      nowMs: 1000,
      sessionStarted: true,
      queue: [
        { type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, tick: 8 },
        { type: LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING, tick: 8 },
        { type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, tick: 9 }
      ],
      walkAnimUntilMs: 1280
    },
    conversation: {
      active: 1,
      targetName: "Lord British",
      targetObjNum: 0x123,
      targetObjType: 0x456,
      portraitTile: 0x12345,
      showInventory: true,
      equipmentSlots
    },
    partyMembers,
    partyNameById
  });
  assert.deepEqual(payload.conversation, {
    active: true,
    target_name: "Lord British",
    target_obj_num: 0x123,
    target_obj_type: 0x456,
    portrait_tile_hex: "0x2345",
    show_inventory: true,
    equipment: equipmentSlots
  });
  assert.deepEqual(payload.partyMembers, [1, 12]);
  assert.notEqual(payload.partyMembers, partyMembers);
  assert.deepEqual(payload.partyNameById, { "1": "Avatar" });
  assert.notEqual(payload.partyNameById, partyNameById);
  assert.deepEqual(payload.runtimeExtensions, { authoritativeWorldObjects: true });
  assert.notEqual(payload.runtimeExtensions, runtimeExtensions);
  assert.deepEqual(payload.movement, {
    mode: "avatar",
    facing_dx: -1,
    facing_dy: 0,
    last_move_tick: 6,
    queue_depth: 3,
    queued_move_count: 2,
    session_started: true,
    probe_now_ms: 1000,
    walk_anim_until_ms: 1280,
    walk_anim_active: true
  });
}

{
  const payload = buildUiProbeRuntimePayloadRuntime({
    sim: { tick: 8 },
    commandLog: [],
    runtimeProfile: "canonical_plus",
    movement: {
      mode: "avatar",
      nowMs: 2000,
      queue: [
        { type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, tick: 9 }
      ],
      walkAnimUntilMs: 1000
    },
    conversation: {},
    partyMembers: []
  });
  assert.equal(payload.movement.queued_move_count, 1);
  assert.equal(payload.movement.walk_anim_active, false);
}

{
  const payload = buildUiProbeRuntimePayloadRuntime({
    sim: null,
    commandLog: ["bad", { tick: 2, kind: "move" }],
    runtimeProfile: null,
    conversation: {
      portraitTile: null,
      equipmentSlots: "bad"
    },
    movement: null,
    partyMembers: [],
    partyNameById: null,
    runtimeExtensions: null
  });
  assert.deepEqual(payload.conversation, {
    active: false,
    target_name: "",
    target_obj_num: 0,
    target_obj_type: 0,
    portrait_tile_hex: null,
    show_inventory: false,
    equipment: []
  });
  assert.deepEqual(payload.partyNameById, {});
  assert.deepEqual(payload.runtimeExtensions, {});
  assert.deepEqual(payload.commandLog, [{}, { tick: 2, kind: "move" }]);
  assert.deepEqual(payload.sim, {});
  assert.deepEqual(payload.movement, {
    mode: "ghost",
    facing_dx: 0,
    facing_dy: 0,
    last_move_tick: 0,
    queue_depth: 0,
    queued_move_count: 0,
    session_started: false,
    probe_now_ms: 0,
    walk_anim_until_ms: -1,
    walk_anim_active: false
  });
}

console.log("ui_probe_runtime_test: ok");

import assert from "node:assert/strict";
import {
  applyDiagPresentationRuntime,
  buildStatusPanelTextRuntime,
  formatAudioStatusRuntime,
  formatAvatarStateRuntime,
  formatCenterTilesRuntime,
  formatClockRuntime,
  formatDateRuntime,
  formatInputModeRuntime,
  formatLayerCountRuntime,
  formatLedgerEntryCountRuntime,
  formatLoopHealthRuntime,
  formatNetPlayerCountRuntime,
  formatPalettePhaseRuntime,
  formatPositionRuntime,
  formatRenderParityRuntime,
  formatSimpleCountRuntime,
  formatSimLoopStateRuntime,
  formatTopTimeOfDayRuntime,
  normalizeDiagKindPresentationRuntime,
  serverStatusOverlayLayoutRuntime
} from "../ui/status_text_runtime.ts";

{
  const target = { className: "", textContent: "" };
  applyDiagPresentationRuntime(null, { diagClass: "diag ok", diagText: "ignored" });
  applyDiagPresentationRuntime(target, null);
  assert.deepEqual(target, { className: "", textContent: "" });
  applyDiagPresentationRuntime(target, { diagClass: "diag ok", diagText: "Ready." });
  assert.deepEqual(target, { className: "diag ok", textContent: "Ready." });
  applyDiagPresentationRuntime(target, { diagClass: "", diagText: null });
  assert.deepEqual(target, { className: "", textContent: "" });
}

assert.equal(normalizeDiagKindPresentationRuntime(null), null);
assert.deepEqual(normalizeDiagKindPresentationRuntime({ diagClass: "ok", diagText: "Ready." }), {
  diagClass: "diag ok",
  diagText: "Ready."
});
assert.deepEqual(normalizeDiagKindPresentationRuntime({ diagClass: "diag warn", text: "Careful." }), {
  diagClass: "diag warn",
  diagText: "Careful."
});
assert.deepEqual(normalizeDiagKindPresentationRuntime({ diagClass: "", message: "Fallback." }), {
  diagClass: "diag ok",
  diagText: "Fallback."
});
assert.deepEqual(normalizeDiagKindPresentationRuntime({ diagClass: "warn" }), {
  diagClass: "diag warn",
  diagText: ""
});

assert.deepEqual(serverStatusOverlayLayoutRuntime({
  scale: 2,
  text: "SERVER LOST"
}), {
  background: {
    h: 24,
    w: 192,
    x: 224,
    y: 28
  },
  drawScale: 2,
  text: "SERVER LOST",
  textX: 232,
  textY: 32
});
assert.deepEqual(serverStatusOverlayLayoutRuntime({
  offsetX: 8,
  offsetY: 16,
  scale: 1,
  text: "RECONNECTED"
}), {
  background: {
    h: 12,
    w: 96,
    x: 104,
    y: -2
  },
  drawScale: 1,
  text: "RECONNECTED",
  textX: 108,
  textY: 0
});
assert.equal(serverStatusOverlayLayoutRuntime({
  scale: 0,
  text: "X"
}).drawScale, 1);

assert.deepEqual(formatClockRuntime({ time_h: 9, time_m: 5 }), {
  hh: "09",
  mm: "05",
  text: "09:05"
});
assert.equal(formatDateRuntime({ date_d: 1, date_m: 3, date_y: 99 }), "1 / 3 / 99");
assert.equal(formatPositionRuntime({ map_x: 307, map_y: 347, map_z: 0 }), "307, 347, 0");
assert.equal(formatTopTimeOfDayRuntime("morning", "09:05"), "morning (09:05)");
assert.equal(formatSimpleCountRuntime(3.8), "3");
assert.equal(formatSimpleCountRuntime("bad"), "0");
assert.equal(formatNetPlayerCountRuntime([{ id: 1 }, { id: 2 }]), "3");
assert.equal(formatNetPlayerCountRuntime(null), "1");
assert.equal(formatPalettePhaseRuntime(true, 0x123), "35");
assert.equal(formatPalettePhaseRuntime(false, 0x123), "off");
assert.equal(formatCenterTilesRuntime(0x2d2, 0x2d3), "0x2d2 -> 0x2d3");
assert.equal(formatSimLoopStateRuntime(true), "paused");
assert.equal(formatSimLoopStateRuntime(false), "running");

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

assert.equal(formatAudioStatusRuntime({
  backendMode: "adlib",
  soundEnabled: true,
  outputMuted: false,
  musicPlaying: true,
  musicSong: "ultima.m",
  ambientTriggerCount: 3,
  ambientLastSfx: "0xea:2"
}), "adlib music:ultima.m ambient:3 0xea:2");
assert.equal(formatAudioStatusRuntime({
  backendMode: "pc",
  soundEnabled: false,
  outputMuted: true,
  musicAwaitingGesture: true,
  musicSong: "bootup.m",
  ambientTriggerCount: 0,
  lastError: "blocked"
}), "pc sound-off output-muted gesture:bootup.m ambient:0 - err:blocked");
assert.equal(formatAudioStatusRuntime({
  backendMode: "pc",
  soundEnabled: true,
  musicLoading: true,
  musicSong: "stones.m"
}), "pc load:stones.m ambient:0 -");

assert.equal(formatLedgerEntryCountRuntime(0), "0 entries");
assert.equal(formatLedgerEntryCountRuntime(1), "1 entry");
assert.equal(formatLedgerEntryCountRuntime(2), "2 entries");

assert.deepEqual(buildStatusPanelTextRuntime({
  audioAmbientLastSfx: "bell",
  audioAmbientTriggerCount: 4,
  audioStatus: {
    backendMode: "adlib",
    lastError: "",
    musicAwaitingGesture: false,
    musicLoading: false,
    musicPlaying: true,
    musicSong: "stones.m",
    muted: false
  },
  avatarFacingDx: 1,
  avatarFacingDy: 0,
  avatarPose: "sit",
  centerAnimatedTile: 0x2d3,
  centerPaletteBand: "static",
  centerRawTile: 0x2d2,
  enablePaletteFx: true,
  entityLayerLoaded: true,
  entityLayerTotalLoaded: 9,
  entityOverlayCount: 3,
  hashText: "0xabc",
  interactionProbeTile: 0x222,
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 2,
    lastDtMs: 16.4,
    maxDtMs: 44.6,
    visibilityResets: 3
  },
  movementMode: "avatar",
  netRemotePlayers: [{ id: 2 }],
  npcOcclusionBlockedMoves: 5,
  objectLayerLoaded: true,
  objectLayerTotalLoaded: 12,
  objectOverlayCount: 4,
  palettePhase: 0x123,
  queueLength: 2,
  renderParityMismatches: 0,
  sessionStarted: true,
  simPaused: false,
  soundEnabled: true,
  targetVerb: "look",
  targetVerbLabels: { look: "Look" },
  tick: 77,
  tileId: 0x2d2,
  timeOfDayLabel: "morning",
  useCursorActive: true,
  world: {
    date_d: 1,
    date_m: 3,
    date_y: 99,
    map_x: 307,
    map_y: 347,
    map_z: 0,
    time_h: 9,
    time_m: 5
  }
}), {
  audio: "adlib music:stones.m ambient:4 bell",
  avatarState: "avatar (E, sit)",
  centerBand: "static",
  centerTiles: "0x2d2 -> 0x2d3",
  clock: "09:05",
  date: "1 / 3 / 99",
  entities: "3 / 9",
  hash: "0xabc",
  inputMode: "Look Target",
  loopHealth: "dt 16ms / max 45ms | drop 1 | vis 3 | err 2",
  netPlayers: "2",
  npcOcclusionBlocks: "5",
  objects: "4 / 12",
  palettePhase: "35",
  position: "307, 347, 0",
  queued: "2",
  renderParity: "ok (probe 0x222)",
  simLoop: "running",
  tick: "77",
  tile: "0x2d2",
  topTimeOfDay: "morning (09:05)"
});

console.log("ui_status_text_runtime_test: ok");

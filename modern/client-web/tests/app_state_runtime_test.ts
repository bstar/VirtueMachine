import assert from "node:assert/strict";
import {
  animationTickPatchRuntime,
  applyPauseLoopStateRuntime,
  bindBrowserLifecycleRuntime,
  bindPauseLoopButtonRuntime,
  createInitialAppSimState,
  frameLoopRecoveryRuntime,
  loadedSimSnapshotPatchRuntime,
  loopFrameTimingPatchRuntime,
  loopVisibilityResetPatchRuntime,
  pauseLoopReasonDiagRuntime,
  pauseLoopStatePatchRuntime,
  pauseLoopUiModelRuntime,
  renderPauseLoopUiRuntime,
  resetRunPatchRuntime,
  returnToTitlePatchRuntime,
  returnToTitleSaveFailureRuntime,
  runtimeAssetFallbackPatchRuntime,
  startSessionPatchRuntime,
  toAppSimStateRuntime
} from "../sim/app_state_runtime.ts";
import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";

const world: SimSnapshotRuntime["world"] = {
  is_on_quest: 0,
  next_sleep: 0,
  time_m: 1,
  time_h: 2,
  date_d: 3,
  date_m: 4,
  date_y: 5,
  wind_dir: 0,
  active: 0,
  map_x: 10,
  map_y: 20,
  map_z: 0,
  in_combat: 0,
  sound_enabled: 1
};

const initial = createInitialAppSimState(world, 0x12345678);
assert.equal(initial.rngState, 0x12345678);
assert.equal(initial.partySize, 1);
assert.deepEqual(initial.partyMembers, [1]);
assert.deepEqual(initial.doorOpenStates, {});
assert.deepEqual(pauseLoopUiModelRuntime(false), {
  buttonText: "Pause Loop",
  statText: "running"
});
assert.deepEqual(pauseLoopUiModelRuntime(true), {
  buttonText: "Resume Loop",
  statText: "paused"
});
{
  const pauseLoopButton = { textContent: "" } as HTMLElement;
  const statSimLoop = { textContent: "" } as HTMLElement;
  assert.deepEqual(renderPauseLoopUiRuntime({
    paused: true,
    pauseLoopButton,
    statSimLoop
  }), {
    buttonText: "Resume Loop",
    statText: "paused"
  });
  assert.equal(pauseLoopButton.textContent, "Resume Loop");
  assert.equal(statSimLoop.textContent, "paused");
  assert.deepEqual(renderPauseLoopUiRuntime({ paused: false }), {
    buttonText: "Pause Loop",
    statText: "running"
  });
}
assert.deepEqual(pauseLoopStatePatchRuntime(true), {
  accMs: 0,
  backgroundSyncPaused: true,
  simPaused: true
});
assert.deepEqual(pauseLoopStatePatchRuntime(false), {
  accMs: 0,
  backgroundSyncPaused: false,
  simPaused: false
});
{
  const state = {
    accMs: 42,
    lastTs: 7,
    simPaused: false
  };
  const net = {
    backgroundSyncPaused: false
  };
  assert.deepEqual(applyPauseLoopStateRuntime({
    backgroundSyncTarget: net,
    nowMs: () => 1234,
    paused: true,
    state
  }), {
    accMs: 0,
    backgroundSyncPaused: true,
    simPaused: true
  });
  assert.deepEqual(state, {
    accMs: 0,
    lastTs: 1234,
    simPaused: true
  });
  assert.deepEqual(net, {
    backgroundSyncPaused: true
  });
}
assert.deepEqual(pauseLoopReasonDiagRuntime("Loop paused."), {
  diagClass: "diag ok",
  diagText: "Loop paused."
});
assert.equal(pauseLoopReasonDiagRuntime(""), null);
{
  let listener: (() => void) | null = null;
  const button = {
    addEventListener(type: "click", nextListener: () => void) {
      assert.equal(type, "click");
      listener = nextListener;
    }
  };
  let paused = false;
  const transitions: Array<{ paused: boolean; reason: string }> = [];
  assert.equal(bindPauseLoopButtonRuntime({
    button,
    isPaused: () => paused,
    setPaused: (nextPaused, reason) => {
      paused = nextPaused;
      transitions.push({ paused: nextPaused, reason });
    }
  }), true);
  listener?.();
  listener?.();
  assert.deepEqual(transitions, [
    {
      paused: true,
      reason: "Simulation loop paused. Background polling disabled."
    },
    {
      paused: false,
      reason: "Simulation loop resumed. Background polling enabled."
    }
  ]);
  assert.equal(bindPauseLoopButtonRuntime({
    button: null,
    isPaused: () => false,
    setPaused: () => {}
  }), false);
}
{
  let resizeListener: (() => void) | null = null;
  let visibilityListener: (() => void) | null = null;
  let resizeCount = 0;
  let visibilityCount = 0;
  const result = bindBrowserLifecycleRuntime({
    window: {
      addEventListener(type: "resize", listener: () => void) {
        assert.equal(type, "resize");
        resizeListener = listener;
      }
    },
    document: {
      addEventListener(type: "visibilitychange", listener: () => void) {
        assert.equal(type, "visibilitychange");
        visibilityListener = listener;
      }
    },
    onResize: () => {
      resizeCount += 1;
    },
    onVisibilityChange: () => {
      visibilityCount += 1;
    }
  });
  assert.deepEqual(result, {
    boundResize: true,
    boundVisibilityChange: true
  });
  resizeListener?.();
  visibilityListener?.();
  assert.equal(resizeCount, 1);
  assert.equal(visibilityCount, 1);
  assert.deepEqual(bindBrowserLifecycleRuntime({
    window: null,
    document: null,
    onResize: () => {},
    onVisibilityChange: () => {}
  }), {
    boundResize: false,
    boundVisibilityChange: false
  });
}
initial.world.time_h = 9;
assert.equal(world.time_h, 2);

const snapshot: SimSnapshotRuntime = {
  tick: initial.tick,
  rngState: initial.rngState,
  worldFlags: initial.worldFlags,
  commandsApplied: initial.commandsApplied,
  doorOpenStates: {
    open: true,
    closed: 0,
    count: 3
  },
  removedObjectKeys: {},
  removedObjectAtTick: {},
  removedObjectCount: 0,
  inventory: {},
  spawnedWorldObjects: [],
  spawnedWorldSeq: 0,
  partyMembers: [1, 12, 23],
  avatarPose: "stand",
  avatarPoseSetTick: -1,
  avatarPoseAnchor: null,
  world
};

const adapted = toAppSimStateRuntime(snapshot, 4);
assert.deepEqual(adapted.doorOpenStates, { open: 1, closed: 0, count: 3 });
assert.deepEqual(adapted.partyMembers, [1, 12, 23]);
assert.equal(adapted.partySize, 4);

const partySnapshot = {
  ...snapshot,
  partySize: 2
} as SimSnapshotRuntime & { partySize: number };
assert.equal(toAppSimStateRuntime(partySnapshot, 4).partySize, 3);

const legacySnapshot = {
  ...snapshot,
  partyMembers: []
};
assert.deepEqual(toAppSimStateRuntime(legacySnapshot, 4).partyMembers, [1]);

const snapshotPatch = loadedSimSnapshotPatchRuntime({
  ...snapshot,
  inventory: { "0x120:0x00": 2 },
  partyMembers: []
}, 4);
assert.equal(snapshotPatch.accMs, 0);
assert.equal(snapshotPatch.avatarLastMoveTick, -1);
assert.equal(snapshotPatch.avatarWalkAnimUntilMs, -1);
assert.equal(snapshotPatch.interactionProbeTile, null);
assert.deepEqual(snapshotPatch.queue, []);
assert.deepEqual(snapshotPatch.commandLog, []);
assert.deepEqual(snapshotPatch.sim.partyMembers, [1]);
assert.deepEqual(snapshotPatch.sim.inventory, { "0x120:0x00": 2 });
assert.deepEqual(snapshotPatch.sim.inventoryObjects, []);

const resetPatch = resetRunPatchRuntime({
  animationFrozen: false,
  initialSeed: 0x87654321,
  initialWorld: world
});
assert.equal(resetPatch.sim.rngState, 0x87654321);
assert.deepEqual(resetPatch.queue, []);
assert.deepEqual(resetPatch.commandLog, []);
assert.equal(resetPatch.paletteFrameTick, -1);
assert.equal(resetPatch.paletteFrame, null);
assert.equal(resetPatch.centerRawTile, 0);
assert.equal(resetPatch.centerAnimatedTile, 0);
assert.equal(resetPatch.centerPaletteBand, "none");
assert.equal(resetPatch.renderParityMismatches, 0);
assert.equal(resetPatch.interactionProbeTile, null);
assert.equal(resetPatch.useCursorActive, false);
assert.equal(resetPatch.targetVerb, "");
assert.deepEqual(resetPatch.legacyLedgerLines, []);
assert.equal(resetPatch.legacyLedgerPrompt, false);
assert.equal(resetPatch.avatarLastMoveTick, -1);
assert.equal(resetPatch.avatarWalkAnimUntilMs, -1);
assert.equal(resetPatch.npcOcclusionBlockedMoves, 0);
assert.equal(resetPatch.frozenAnimationTick, null);
assert.equal(resetRunPatchRuntime({
  animationFrozen: true,
  initialSeed: 0,
  initialWorld: world
}).frozenAnimationTick, 0);

assert.deepEqual(animationTickPatchRuntime({
  animationFrozen: false,
  currentTick: 42,
  frozenAnimationTick: null
}), {
  frozenAnimationTick: null,
  tick: 42
});
assert.deepEqual(animationTickPatchRuntime({
  animationFrozen: true,
  currentTick: 42,
  frozenAnimationTick: null
}), {
  frozenAnimationTick: 42,
  tick: 42
});
assert.deepEqual(animationTickPatchRuntime({
  animationFrozen: true,
  currentTick: 99,
  frozenAnimationTick: 42
}), {
  frozenAnimationTick: 42,
  tick: 42
});
assert.deepEqual(animationTickPatchRuntime({
  animationFrozen: false,
  currentTick: 99,
  frozenAnimationTick: 42
}), {
  frozenAnimationTick: 42,
  tick: 99
});

const baseLoopHealth = {
  backlogDrops: 1,
  frameErrors: 2,
  lastDtMs: 10,
  maxDtMs: 20,
  visibilityResets: 3
};
assert.deepEqual(loopFrameTimingPatchRuntime({
  accMs: 5,
  lastTs: 100,
  loopHealth: baseLoopHealth,
  maxAccMs: 50,
  timestampMs: 130
}), {
  accMs: 35,
  lastTs: 130,
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 2,
    lastDtMs: 30,
    maxDtMs: 30,
    visibilityResets: 3
  }
});
assert.deepEqual(loopFrameTimingPatchRuntime({
  accMs: 40,
  lastTs: 100,
  loopHealth: baseLoopHealth,
  maxAccMs: 50,
  timestampMs: 130
}), {
  accMs: 50,
  lastTs: 130,
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 2,
    lastDtMs: 30,
    maxDtMs: 30,
    visibilityResets: 3
  }
});
assert.equal(loopFrameTimingPatchRuntime({
  accMs: 5,
  lastTs: 130,
  loopHealth: baseLoopHealth,
  maxAccMs: 50,
  timestampMs: 100
}).loopHealth.lastDtMs, 0);
assert.deepEqual(loopVisibilityResetPatchRuntime({
  loopHealth: baseLoopHealth,
  nowMs: 500
}), {
  accMs: 0,
  lastTs: 500,
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 2,
    lastDtMs: 0,
    maxDtMs: 20,
    visibilityResets: 4
  }
});
assert.deepEqual(frameLoopRecoveryRuntime({
  errorMessage: "render failed",
  loopHealth: baseLoopHealth,
  nowMs: 600
}), {
  accMs: 0,
  diagClass: "diag warn",
  diagText: "Frame loop recovered from error: render failed",
  lastTs: 600,
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 3,
    lastDtMs: 10,
    maxDtMs: 20,
    visibilityResets: 3
  }
});

assert.deepEqual(returnToTitlePatchRuntime(), {
  diagClass: "diag ok",
  diagText: "Returned to title menu.",
  legacyLedgerLines: [],
  legacyLedgerPrompt: false,
  queue: [],
  resumeFromSnapshot: true,
  sessionStarted: false,
  startupMenuIndex: 0,
  targetVerb: "",
  useCursorActive: false
});
assert.deepEqual(startSessionPatchRuntime({
  loopHealth: baseLoopHealth,
  nowMs: 700
}), {
  accMs: 0,
  lastTs: 700,
  legacyLedgerLines: [],
  loopHealth: {
    backlogDrops: 1,
    frameErrors: 2,
    lastDtMs: 0,
    maxDtMs: 0,
    visibilityResets: 3
  },
  musicPhase: "",
  musicSong: "",
  queue: [],
  resumeFromSnapshot: false,
  sessionStarted: true
});
assert.deepEqual(returnToTitleSaveFailureRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "Return-to-title save failed: offline",
  statusLevel: "error",
  statusText: "Save failed: offline"
});

assert.deepEqual(runtimeAssetFallbackPatchRuntime(), {
  animData: null,
  avatarPortraitCanvas: null,
  basePalette: null,
  bootIntroActive: false,
  bootIntroBanks: null,
  bootIntroBlocks: null,
  bootIntroFont: null,
  bootIntroPalettes: null,
  cursorPixmaps: null,
  entityLayer: null,
  legacyPaperPixmap: null,
  lookStringEntries: null,
  mapCtx: null,
  objectLayer: null,
  palette: null,
  portraitArchiveA: null,
  portraitArchiveB: null,
  pristineBaselineLastPollTick: -1,
  pristineBaselineVersion: "",
  startupMenuPixmap: null,
  startupTitlePixmaps: null,
  terrainType: null,
  tileFlags: null,
  tileFlags2: null,
  tileSet: null,
  typeWeights: null,
  u6MainFont: null
});

console.log("app_state_runtime_test: ok");

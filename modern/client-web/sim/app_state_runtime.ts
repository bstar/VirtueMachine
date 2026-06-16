import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";
import type { WorldRuntimeInventoryObject } from "../net/world_runtime.ts";
import { normalizePartyMemberIdsRuntime } from "./party_runtime.ts";
import {
  partitionCommandsForTickRuntime,
  type SimCommandRuntime
} from "./queue_runtime.ts";
import {
  advanceWorldMinuteRuntime,
  expireRemovedWorldPropsRuntime,
  xorshift32Runtime
} from "./sim_utils_runtime.ts";

export type AppSimState = Omit<SimSnapshotRuntime, "doorOpenStates"> & {
  doorOpenStates: Record<string, number>;
  inventoryObjects?: WorldRuntimeInventoryObject[];
  inventoryTiles?: Record<string, number>;
  partySize: number;
};

export type LoadedSimSnapshotPatchRuntime = {
  accMs: 0;
  avatarLastMoveTick: -1;
  avatarWalkAnimUntilMs: -1;
  commandLog: [];
  interactionProbeTile: null;
  queue: [];
  sim: AppSimState;
};

export type ResetRunPatchRuntime = {
  avatarLastMoveTick: -1;
  avatarWalkAnimUntilMs: -1;
  centerAnimatedTile: 0;
  centerPaletteBand: "none";
  centerRawTile: 0;
  commandLog: [];
  frozenAnimationTick: number | null;
  interactionProbeTile: null;
  legacyLedgerLines: [];
  legacyLedgerPrompt: false;
  npcOcclusionBlockedMoves: 0;
  paletteFrame: null;
  paletteFrameTick: -1;
  queue: [];
  renderParityMismatches: 0;
  sim: AppSimState;
  targetVerb: "";
  useCursorActive: false;
};

export type AnimationTickPatchRuntime = {
  frozenAnimationTick: number | null;
  tick: number;
};

export type LoopHealthRuntime = {
  backlogDrops: number;
  frameErrors: number;
  lastDtMs: number;
  maxDtMs: number;
  visibilityResets: number;
};

export type LoopFrameTimingPatchRuntime = {
  accMs: number;
  lastTs: number;
  loopHealth: LoopHealthRuntime;
};

export type AdvanceSimTickOptionsRuntime = {
  daysPerMonth: number;
  hoursPerDay: number;
  isNetAuthenticated: () => boolean;
  minutesPerHour: number;
  monthsPerYear: number;
  ticksPerMinute: number;
  worldPropResetTicks: number;
};

export type AdvanceSimTickResultRuntime = {
  appliedCount: number;
  nextTick: number;
  pending: SimCommandRuntime[];
};

export type LoopVisibilityResetPatchRuntime = {
  accMs: 0;
  lastTs: number;
  loopHealth: LoopHealthRuntime;
};

export type FrameLoopRecoveryRuntime = {
  accMs: 0;
  diagClass: "diag warn";
  diagText: string;
  lastTs: number;
  loopHealth: LoopHealthRuntime;
};

export type RuntimeAssetFallbackPatchRuntime = {
  animData: null;
  avatarPortraitCanvas: null;
  basePalette: null;
  bootIntroActive: false;
  bootIntroBanks: null;
  bootIntroBlocks: null;
  bootIntroFont: null;
  bootIntroPalettes: null;
  cursorPixmaps: null;
  entityLayer: null;
  legacyPaperPixmap: null;
  lookStringEntries: null;
  mapCtx: null;
  objectLayer: null;
  palette: null;
  portraitArchiveA: null;
  portraitArchiveB: null;
  pristineBaselineLastPollTick: -1;
  pristineBaselineVersion: "";
  startupMenuPixmap: null;
  startupTitlePixmaps: null;
  terrainType: null;
  tileFlags: null;
  tileFlags2: null;
  tileSet: null;
  typeWeights: null;
  u6MainFont: null;
};

export type ReturnToTitlePatchRuntime = {
  diagClass: "diag ok";
  diagText: "Returned to title menu.";
  legacyLedgerLines: [];
  legacyLedgerPrompt: false;
  queue: [];
  resumeFromSnapshot: true;
  sessionStarted: false;
  startupMenuIndex: 0;
  targetVerb: "";
  useCursorActive: false;
};

export type StartSessionPatchRuntime = {
  accMs: 0;
  lastTs: number;
  legacyLedgerLines: [];
  loopHealth: LoopHealthRuntime;
  musicPhase: "";
  musicSong: "";
  queue: [];
  resumeFromSnapshot: false;
  sessionStarted: true;
};

export type ReturnToTitleSaveFailureRuntime = {
  diagClass: "diag warn";
  diagText: string;
  statusLevel: "error";
  statusText: string;
};

export function pauseLoopUiModelRuntime(paused: unknown): {
  buttonText: "Resume Loop" | "Pause Loop";
  statText: "paused" | "running";
} {
  return !!paused
    ? { buttonText: "Resume Loop", statText: "paused" }
    : { buttonText: "Pause Loop", statText: "running" };
}

export function renderPauseLoopUiRuntime(args: {
  pauseLoopButton?: HTMLElement | null;
  paused: unknown;
  statSimLoop?: HTMLElement | null;
}): ReturnType<typeof pauseLoopUiModelRuntime> {
  const model = pauseLoopUiModelRuntime(args.paused);
  if (args.pauseLoopButton) {
    args.pauseLoopButton.textContent = model.buttonText;
  }
  if (args.statSimLoop) {
    args.statSimLoop.textContent = model.statText;
  }
  return model;
}

export function pauseLoopStatePatchRuntime(paused: unknown): {
  accMs: 0;
  backgroundSyncPaused: boolean;
  simPaused: boolean;
} {
  const next = !!paused;
  return {
    accMs: 0,
    backgroundSyncPaused: next,
    simPaused: next
  };
}

export function applyPauseLoopStateRuntime(args: {
  backgroundSyncTarget: { backgroundSyncPaused: boolean };
  nowMs: () => number;
  paused: unknown;
  state: {
    accMs: number;
    lastTs: number;
    simPaused: boolean;
  };
}): ReturnType<typeof pauseLoopStatePatchRuntime> {
  const patch = pauseLoopStatePatchRuntime(args.paused);
  args.state.simPaused = patch.simPaused;
  args.backgroundSyncTarget.backgroundSyncPaused = patch.backgroundSyncPaused;
  args.state.accMs = patch.accMs;
  args.state.lastTs = args.nowMs();
  return patch;
}

export type PauseLoopDiagRuntime = {
  diagClass: "diag ok";
  diagText: string;
};

export function pauseLoopReasonDiagRuntime(reason: unknown): PauseLoopDiagRuntime | null {
  const text = String(reason || "").trim();
  if (!text) {
    return null;
  }
  return {
    diagClass: "diag ok",
    diagText: text
  };
}

export function bindPauseLoopButtonRuntime(args: {
  button?: { addEventListener: (type: "click", listener: () => void) => void } | null;
  isPaused: () => boolean;
  setPaused: (paused: boolean, reason: string) => void;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    const next = !args.isPaused();
    args.setPaused(
      next,
      next
        ? "Simulation loop paused. Background polling disabled."
        : "Simulation loop resumed. Background polling enabled."
    );
  });
  return true;
}

export function bindBrowserLifecycleRuntime(args: {
  document?: { addEventListener: (type: "visibilitychange", listener: () => void) => void } | null;
  onResize: () => void;
  onVisibilityChange: () => void;
  window?: { addEventListener: (type: "resize", listener: () => void) => void } | null;
}): {
  boundResize: boolean;
  boundVisibilityChange: boolean;
} {
  let boundResize = false;
  if (args.window) {
    args.window.addEventListener("resize", () => {
      args.onResize();
    });
    boundResize = true;
  }
  let boundVisibilityChange = false;
  if (args.document) {
    args.document.addEventListener("visibilitychange", () => {
      args.onVisibilityChange();
    });
    boundVisibilityChange = true;
  }
  return { boundResize, boundVisibilityChange };
}

export function createInitialAppSimState(
  initialWorld: SimSnapshotRuntime["world"],
  initialSeed: number
): AppSimState {
  return {
    tick: 0,
    rngState: initialSeed >>> 0,
    worldFlags: 0,
    commandsApplied: 0,
    doorOpenStates: {},
    removedObjectKeys: {},
    removedObjectAtTick: {},
    removedObjectCount: 0,
    inventory: {},
    inventoryObjects: [],
    inventoryTiles: {},
    spawnedWorldObjects: [],
    spawnedWorldSeq: 0,
    partyMembers: [1],
    avatarPose: "stand",
    avatarPoseSetTick: -1,
    avatarPoseAnchor: null,
    partySize: 1,
    world: { ...initialWorld }
  };
}

export function advanceSimTickRuntime(args: {
  applyCommand: (sim: AppSimState, command: SimCommandRuntime) => void;
  options: AdvanceSimTickOptionsRuntime;
  queue: readonly SimCommandRuntime[];
  sim: AppSimState;
}): AdvanceSimTickResultRuntime {
  const sim = args.sim;
  const nextTick = (sim.tick + 1) >>> 0;
  const { due, pending } = partitionCommandsForTickRuntime(args.queue, nextTick);
  for (const cmd of due) {
    args.applyCommand(sim, cmd);
  }

  sim.rngState = xorshift32Runtime(sim.rngState);
  sim.worldFlags ^= sim.rngState & 1;
  expireRemovedWorldPropsRuntime(sim, nextTick, args.options.worldPropResetTicks);
  if (!args.options.isNetAuthenticated() && (nextTick % Math.max(1, Number(args.options.ticksPerMinute) | 0)) === 0) {
    advanceWorldMinuteRuntime(sim.world, {
      minutesPerHour: args.options.minutesPerHour,
      hoursPerDay: args.options.hoursPerDay,
      daysPerMonth: args.options.daysPerMonth,
      monthsPerYear: args.options.monthsPerYear
    });
  }
  sim.tick = nextTick;

  return {
    appliedCount: due.length,
    nextTick,
    pending
  };
}

export function toAppSimStateRuntime(
  snapshot: SimSnapshotRuntime,
  fallbackPartySize = 1
): AppSimState {
  const maybePartySize = Number((snapshot as { partySize?: number }).partySize);
  const partyMembers = normalizePartyMemberIdsRuntime(snapshot.partyMembers, 1);
  return {
    ...snapshot,
    doorOpenStates: Object.fromEntries(
      Object.entries(snapshot.doorOpenStates ?? {}).map(([key, value]) => [key, Number(value) | 0])
    ),
    partyMembers,
    partySize: Math.max(partyMembers.length, Number.isFinite(maybePartySize) && maybePartySize > 0
      ? maybePartySize
      : Number(fallbackPartySize) || 1)
  };
}

export function loadedSimSnapshotPatchRuntime(
  snapshot: SimSnapshotRuntime,
  fallbackPartySize = 1
): LoadedSimSnapshotPatchRuntime {
  const sim = toAppSimStateRuntime(snapshot, fallbackPartySize);
  sim.inventoryObjects = [];
  sim.partyMembers = normalizePartyMemberIdsRuntime(sim.partyMembers, 1);
  return {
    accMs: 0,
    avatarLastMoveTick: -1,
    avatarWalkAnimUntilMs: -1,
    commandLog: [],
    interactionProbeTile: null,
    queue: [],
    sim
  };
}

export function resetRunPatchRuntime(args: {
  animationFrozen?: unknown;
  initialSeed: number;
  initialWorld: SimSnapshotRuntime["world"];
}): ResetRunPatchRuntime {
  const sim = createInitialAppSimState(args.initialWorld, args.initialSeed);
  return {
    avatarLastMoveTick: -1,
    avatarWalkAnimUntilMs: -1,
    centerAnimatedTile: 0,
    centerPaletteBand: "none",
    centerRawTile: 0,
    commandLog: [],
    frozenAnimationTick: args.animationFrozen ? (sim.tick >>> 0) : null,
    interactionProbeTile: null,
    legacyLedgerLines: [],
    legacyLedgerPrompt: false,
    npcOcclusionBlockedMoves: 0,
    paletteFrame: null,
    paletteFrameTick: -1,
    queue: [],
    renderParityMismatches: 0,
    sim,
    targetVerb: "",
    useCursorActive: false
  };
}

export function animationTickPatchRuntime(args: {
  animationFrozen?: unknown;
  currentTick: unknown;
  frozenAnimationTick?: unknown;
}): AnimationTickPatchRuntime {
  const tick = Number(args.currentTick) >>> 0;
  if (!args.animationFrozen) {
    return {
      frozenAnimationTick: args.frozenAnimationTick === null || args.frozenAnimationTick === undefined
        ? null
        : Number(args.frozenAnimationTick) >>> 0,
      tick
    };
  }
  const frozen = args.frozenAnimationTick === null || args.frozenAnimationTick === undefined
    ? tick
    : Number(args.frozenAnimationTick) >>> 0;
  return {
    frozenAnimationTick: frozen,
    tick: frozen
  };
}

export function loopFrameTimingPatchRuntime(args: {
  accMs: unknown;
  lastTs: unknown;
  loopHealth: LoopHealthRuntime;
  maxAccMs: unknown;
  timestampMs: unknown;
}): LoopFrameTimingPatchRuntime {
  const lastTs = Number(args.lastTs);
  const ts = Number(args.timestampMs);
  const dtMs = Math.max(0, (Number.isFinite(ts) ? ts : 0) - (Number.isFinite(lastTs) ? lastTs : 0));
  const maxAccMs = Math.max(0, Number(args.maxAccMs) || 0);
  const accMs = Math.min(Math.max(0, Number(args.accMs) || 0) + dtMs, maxAccMs);
  return {
    accMs,
    lastTs: Number.isFinite(ts) ? ts : 0,
    loopHealth: {
      ...args.loopHealth,
      lastDtMs: dtMs,
      maxDtMs: Math.max(Number(args.loopHealth.maxDtMs) || 0, dtMs)
    }
  };
}

export function loopVisibilityResetPatchRuntime(args: {
  loopHealth: LoopHealthRuntime;
  nowMs: unknown;
}): LoopVisibilityResetPatchRuntime {
  const nowMs = Number(args.nowMs);
  return {
    accMs: 0,
    lastTs: Number.isFinite(nowMs) ? nowMs : 0,
    loopHealth: {
      ...args.loopHealth,
      lastDtMs: 0,
      visibilityResets: (Number(args.loopHealth.visibilityResets) || 0) + 1
    }
  };
}

export function frameLoopRecoveryRuntime(args: {
  errorMessage: string;
  loopHealth: LoopHealthRuntime;
  nowMs: unknown;
}): FrameLoopRecoveryRuntime {
  const nowMs = Number(args.nowMs);
  return {
    accMs: 0,
    diagClass: "diag warn",
    diagText: `Frame loop recovered from error: ${String(args.errorMessage || "unknown error")}`,
    lastTs: Number.isFinite(nowMs) ? nowMs : 0,
    loopHealth: {
      ...args.loopHealth,
      frameErrors: (Number(args.loopHealth.frameErrors) || 0) + 1
    }
  };
}

export function returnToTitlePatchRuntime(): ReturnToTitlePatchRuntime {
  return {
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
  };
}

export function startSessionPatchRuntime(args: {
  loopHealth: LoopHealthRuntime;
  nowMs: unknown;
}): StartSessionPatchRuntime {
  const nowMs = Number(args.nowMs);
  return {
    accMs: 0,
    lastTs: Number.isFinite(nowMs) ? nowMs : 0,
    legacyLedgerLines: [],
    loopHealth: {
      ...args.loopHealth,
      lastDtMs: 0,
      maxDtMs: 0
    },
    musicPhase: "",
    musicSong: "",
    queue: [],
    resumeFromSnapshot: false,
    sessionStarted: true
  };
}

export function returnToTitleSaveFailureRuntime(reason: unknown): ReturnToTitleSaveFailureRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Return-to-title save failed: ${text}`,
    statusLevel: "error",
    statusText: `Save failed: ${text}`
  };
}

export function runtimeAssetFallbackPatchRuntime(): RuntimeAssetFallbackPatchRuntime {
  return {
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
  };
}

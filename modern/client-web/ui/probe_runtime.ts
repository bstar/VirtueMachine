import {
  avatarWalkPresentationActiveRuntime,
  countQueuedAvatarMoveCommandsRuntime
} from "../sim/avatar_move_runtime.ts";

export type UiProbeModeRuntime = "live" | "sample";

export type UiProbeConversationSourceRuntime = {
  active?: unknown;
  equipmentSlots?: unknown;
  portraitTile?: unknown;
  showInventory?: unknown;
  targetName?: unknown;
  targetObjNum?: unknown;
  targetObjType?: unknown;
};

export type UiProbeRuntimePayloadRuntime = {
  commandLog: Array<{ kind?: unknown; tick?: unknown }>;
  conversation: {
    active: boolean;
    equipment: unknown[];
    portrait_tile_hex: string | null;
    show_inventory: boolean;
    target_name: string;
    target_obj_num: number;
    target_obj_type: number;
  };
  movement: {
    facing_dx: number;
    facing_dy: number;
    last_move_tick: number;
    mode: string;
    probe_now_ms: number;
    queue_depth: number;
    queued_move_count: number;
    session_started: boolean;
    walk_anim_active: boolean;
    walk_anim_until_ms: number;
  };
  partyMembers: readonly number[];
  partyNameById: Record<string, string>;
  runtimeExtensions: Record<string, unknown>;
  runtimeProfile: unknown;
  sim: {
    inventory?: Record<string, number>;
    partyMembers?: unknown;
    tick?: unknown;
    world?: {
      active?: unknown;
      map_x?: unknown;
      map_y?: unknown;
      map_z?: unknown;
    };
  };
};

export function normalizeUiProbeModeRuntime(mode: unknown): UiProbeModeRuntime {
  return String(mode || "") === "sample" ? "sample" : "live";
}

export function nextUiProbeModeRuntime(mode: unknown): UiProbeModeRuntime {
  return normalizeUiProbeModeRuntime(mode) === "live" ? "sample" : "live";
}

export function uiProbeFilenameRuntime(tick: unknown): string {
  return `virtuemachine-ui-probe-${Number(tick) >>> 0}.json`;
}

export function uiProbeCopyStatusRuntime(digest: unknown): string {
  return `probe ${String(digest || "")}`;
}

export function uiProbeCapturedTextRuntime(args: {
  digest: unknown;
  filename: unknown;
}): string {
  return `UI probe captured (${String(args.digest || "")}) and downloaded as ${String(args.filename || "")}.`;
}

export type UiProbeCapturePresentationRuntime = {
  copyStatusText: string;
  diagClass: "diag ok";
  diagText: string;
};

export type UiProbeDebugWindowRuntime<TProbe = unknown> = {
  __vmCaptureUiProbe?: () => { digest: string; probe: TProbe };
  __vmGetUiProbe?: () => TProbe;
  __vmLastUiProbe?: TProbe;
  __vmLastUiProbeDigest?: string;
};

export function installUiProbeDebugHooksRuntime<TProbe>(args: {
  buildProbe: () => TProbe;
  digestProbe: (probe: TProbe) => string;
  target: UiProbeDebugWindowRuntime<TProbe>;
}): void {
  args.target.__vmGetUiProbe = () => args.buildProbe();
  args.target.__vmCaptureUiProbe = () => {
    const probe = args.buildProbe();
    const digest = args.digestProbe(probe);
    args.target.__vmLastUiProbe = probe;
    args.target.__vmLastUiProbeDigest = digest;
    return { digest, probe };
  };
}

export function uiProbeCapturePresentationRuntime(args: {
  digest: unknown;
  filename: unknown;
}): UiProbeCapturePresentationRuntime {
  return {
    copyStatusText: uiProbeCopyStatusRuntime(args.digest),
    diagClass: "diag ok",
    diagText: uiProbeCapturedTextRuntime(args)
  };
}

export function uiProbeModeTextRuntime(mode: unknown): string {
  return `Canonical UI probe mode: ${normalizeUiProbeModeRuntime(mode)}.`;
}

export type UiProbeModePresentationRuntime = {
  diagClass: "diag ok";
  diagText: string;
};

export function uiProbeModePresentationRuntime(mode: unknown): UiProbeModePresentationRuntime {
  return {
    diagClass: "diag ok",
    diagText: uiProbeModeTextRuntime(mode)
  };
}

export function buildUiProbeRuntimePayloadRuntime(args: {
  commandLog: unknown;
  conversation: UiProbeConversationSourceRuntime;
  movement?: {
    facingDx?: unknown;
    facingDy?: unknown;
    lastMoveTick?: unknown;
    mode?: unknown;
    nowMs?: unknown;
    queue?: unknown;
    sessionStarted?: unknown;
    walkAnimUntilMs?: unknown;
  } | null;
  partyMembers: readonly number[];
  partyNameById?: Record<string, string> | null;
  runtimeExtensions?: Record<string, unknown> | null;
  runtimeProfile: unknown;
  sim: unknown;
}): UiProbeRuntimePayloadRuntime {
  const portraitTile = args.conversation.portraitTile;
  const sim = args.sim && typeof args.sim === "object"
    ? args.sim as UiProbeRuntimePayloadRuntime["sim"]
    : {};
  const commandLog = Array.isArray(args.commandLog)
    ? args.commandLog.map((entry) => (entry && typeof entry === "object" ? entry as { kind?: unknown; tick?: unknown } : {}))
    : [];
  const movement = args.movement || {};
  const movementQueue = Array.isArray(movement.queue) ? movement.queue : [];
  const queuedMoveCount = countQueuedAvatarMoveCommandsRuntime(movementQueue);
  const movementNowMs = Number(movement.nowMs);
  const walkAnimUntilMs = Number(movement.walkAnimUntilMs);
  return {
    sim,
    commandLog,
    runtimeProfile: args.runtimeProfile,
    runtimeExtensions: { ...(args.runtimeExtensions || {}) },
    conversation: {
      active: !!args.conversation.active,
      target_name: String(args.conversation.targetName || ""),
      target_obj_num: Number(args.conversation.targetObjNum) | 0,
      target_obj_type: Number(args.conversation.targetObjType) | 0,
      portrait_tile_hex: portraitTile == null
        ? null
        : `0x${(Number(portraitTile) & 0xffff).toString(16)}`,
      show_inventory: !!args.conversation.showInventory,
      equipment: Array.isArray(args.conversation.equipmentSlots)
        ? args.conversation.equipmentSlots
        : []
    },
    movement: {
      mode: String(movement.mode || "ghost"),
      facing_dx: Number(movement.facingDx) | 0,
      facing_dy: Number(movement.facingDy) | 0,
      last_move_tick: Number(movement.lastMoveTick) | 0,
      queue_depth: movementQueue.length >>> 0,
      queued_move_count: queuedMoveCount >>> 0,
      session_started: !!movement.sessionStarted,
      probe_now_ms: Number.isFinite(movementNowMs) ? movementNowMs : 0,
      walk_anim_until_ms: Number.isFinite(walkAnimUntilMs) ? walkAnimUntilMs : -1,
      walk_anim_active: avatarWalkPresentationActiveRuntime({
        queuedMoveCount,
        nowMs: Number.isFinite(movementNowMs) ? movementNowMs : 0,
        walkAnimUntilMs
      })
    },
    partyMembers: args.partyMembers.slice(),
    partyNameById: { ...(args.partyNameById || {}) }
  };
}

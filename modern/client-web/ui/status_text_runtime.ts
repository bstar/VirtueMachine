export type StatusWorldRuntime = {
  date_d: number;
  date_m: number;
  date_y: number;
  map_x: number;
  map_y: number;
  map_z: number;
  time_h: number;
  time_m: number;
};

export type DiagPresentationRuntime = {
  diagClass?: unknown;
  diagText?: unknown;
};

export type DiagKindPresentationRuntime = DiagPresentationRuntime & {
  message?: unknown;
  text?: unknown;
};

export type DiagTargetRuntime = {
  className: string;
  textContent: string | null;
};

export type StatusPanelTextRuntime = {
  audio: string;
  avatarState: string;
  centerBand: string;
  centerTiles: string;
  clock: string;
  date: string;
  entities: string;
  hash: string;
  inputMode: string;
  loopHealth: string;
  netPlayers: string;
  npcOcclusionBlocks: string;
  objects: string;
  palettePhase: string;
  position: string;
  queued: string;
  renderParity: string;
  simLoop: string;
  tick: string;
  tile: string;
  topTimeOfDay: string;
};

export type ServerStatusOverlayLayoutRuntime = {
  background: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  drawScale: number;
  text: string;
  textX: number;
  textY: number;
};

export type ServerStatusOverlayCanvasRuntime = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
};

export type ServerStatusOverlayTextRendererRuntime = (
  canvas: ServerStatusOverlayCanvasRuntime,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string
) => void;

export function serverStatusOverlayLayoutRuntime(args: {
  logicalWidth?: unknown;
  logicalY?: unknown;
  offsetX?: unknown;
  offsetY?: unknown;
  scale?: unknown;
  text?: unknown;
}): ServerStatusOverlayLayoutRuntime {
  const text = String(args.text || "");
  const scale = Math.max(1, Number(args.scale) | 0);
  const logicalWidth = Math.max(1, Number(args.logicalWidth ?? 320) | 0);
  const logicalY = Number(args.logicalY ?? 16) | 0;
  const offsetX = Number(args.offsetX ?? 0) | 0;
  const offsetY = Number(args.offsetY ?? 0) | 0;
  const textW = text.length * 8;
  const logicalX = Math.floor((logicalWidth - textW) / 2);
  const textX = (logicalX - offsetX) * scale;
  const textY = (logicalY - offsetY) * scale;
  return {
    background: {
      h: 12 * scale,
      w: (textW + 8) * scale,
      x: textX - (4 * scale),
      y: textY - (2 * scale)
    },
    drawScale: scale,
    text,
    textX,
    textY
  };
}

export function drawServerStatusOverlayRuntime(args: {
  backgroundColor?: unknown;
  canvas: ServerStatusOverlayCanvasRuntime;
  color: string;
  drawText: ServerStatusOverlayTextRendererRuntime;
  logicalWidth?: unknown;
  logicalY?: unknown;
  offsetX?: unknown;
  offsetY?: unknown;
  scale?: unknown;
  text: string;
}): ServerStatusOverlayLayoutRuntime {
  const layout = serverStatusOverlayLayoutRuntime(args);
  args.canvas.fillStyle = String(args.backgroundColor || "#1f0f0a");
  args.canvas.fillRect(
    layout.background.x,
    layout.background.y,
    layout.background.w,
    layout.background.h
  );
  args.drawText(args.canvas, layout.text, layout.textX, layout.textY, layout.drawScale, args.color);
  return layout;
}

export function normalizeDiagKindPresentationRuntime(
  presentation: DiagKindPresentationRuntime | null | undefined
): DiagPresentationRuntime | null {
  if (!presentation) {
    return null;
  }
  const kind = String(presentation.diagClass || "ok").trim() || "ok";
  return {
    diagClass: kind.startsWith("diag ") ? kind : `diag ${kind}`,
    diagText: presentation.diagText ?? presentation.text ?? presentation.message ?? ""
  };
}

export function applyDiagPresentationRuntime(
  target: DiagTargetRuntime | null | undefined,
  presentation: DiagPresentationRuntime | null | undefined
): void {
  if (!target || !presentation) {
    return;
  }
  target.className = String(presentation.diagClass || "");
  target.textContent = String(presentation.diagText || "");
}

export function formatClockRuntime(world: Pick<StatusWorldRuntime, "time_h" | "time_m">): {
  hh: string;
  mm: string;
  text: string;
} {
  const hh = String(Number(world.time_h) | 0).padStart(2, "0");
  const mm = String(Number(world.time_m) | 0).padStart(2, "0");
  return { hh, mm, text: `${hh}:${mm}` };
}

export function formatDateRuntime(world: Pick<StatusWorldRuntime, "date_d" | "date_m" | "date_y">): string {
  return `${Number(world.date_d) | 0} / ${Number(world.date_m) | 0} / ${Number(world.date_y) | 0}`;
}

export function formatPositionRuntime(world: Pick<StatusWorldRuntime, "map_x" | "map_y" | "map_z">): string {
  return `${Number(world.map_x) | 0}, ${Number(world.map_y) | 0}, ${Number(world.map_z) | 0}`;
}

export function formatTopTimeOfDayRuntime(label: unknown, clockText: unknown): string {
  return `${String(label || "")} (${String(clockText || "")})`;
}

export function formatInputModeRuntime(args: {
  movementMode: string;
  sessionStarted: boolean;
  targetVerb: string;
  targetVerbLabels: Record<string, string>;
  useCursorActive: boolean;
}): string {
  if (!args.sessionStarted) {
    return "Title Menu";
  }
  if (args.useCursorActive) {
    const label = args.targetVerbLabels[String(args.targetVerb || "")] || "Target";
    return `${label} Target`;
  }
  return args.movementMode === "avatar" ? "World" : "Ghost";
}

export function formatLayerCountRuntime(activeCount: unknown, totalCount: unknown, hasLayer: boolean): string {
  if (!hasLayer) {
    return "0 / 0";
  }
  return `${Number(activeCount) | 0} / ${Number(totalCount) | 0}`;
}

export function formatSimpleCountRuntime(count: unknown): string {
  return String(Number(count) | 0);
}

export function formatNetPlayerCountRuntime(remotePlayers: unknown): string {
  const remote = Array.isArray(remotePlayers) ? remotePlayers.length : 0;
  return String(1 + remote);
}

export function formatPalettePhaseRuntime(enabled: unknown, phase: unknown): string {
  return enabled ? String(Number(phase) & 0xff) : "off";
}

export function formatCenterTilesRuntime(rawTile: unknown, animatedTile: unknown): string {
  return `0x${(Number(rawTile) >>> 0).toString(16)} -> 0x${(Number(animatedTile) >>> 0).toString(16)}`;
}

export function formatSimLoopStateRuntime(paused: unknown): "paused" | "running" {
  return paused ? "paused" : "running";
}

export function formatRenderParityRuntime(args: {
  interactionProbeTile: number | null | undefined;
  mismatchCount: number;
}): string {
  if ((Number(args.mismatchCount) | 0) > 0) {
    return `warn (${Number(args.mismatchCount) | 0})`;
  }
  if (args.interactionProbeTile != null) {
    return `ok (probe 0x${(Number(args.interactionProbeTile) & 0xffff).toString(16)})`;
  }
  return "ok";
}

export function formatAvatarStateRuntime(args: {
  facingDx: number;
  facingDy: number;
  movementMode: string;
  pose: string;
}): string {
  if (args.movementMode !== "avatar") {
    return "ghost";
  }
  const facing = args.facingDx < 0 ? "W"
    : args.facingDx > 0 ? "E"
      : args.facingDy < 0 ? "N" : "S";
  const pose = args.pose === "sleep" ? "sleep" : (args.pose === "sit" ? "sit" : "stand");
  return `avatar (${facing}, ${pose})`;
}

export function formatLoopHealthRuntime(args: {
  backlogDrops: number;
  frameErrors: number;
  lastDtMs: number;
  maxDtMs: number;
  paused: boolean;
  visibilityResets: number;
}): string {
  const last = Math.round(Math.max(0, Number(args.lastDtMs) || 0));
  const max = Math.round(Math.max(0, Number(args.maxDtMs) || 0));
  const prefix = args.paused ? "paused | " : "";
  return `${prefix}dt ${last}ms / max ${max}ms | drop ${Number(args.backlogDrops) | 0} | vis ${Number(args.visibilityResets) | 0} | err ${Number(args.frameErrors) | 0}`;
}

export function formatAudioStatusRuntime(args: {
  ambientLastSfx?: unknown;
  ambientTriggerCount?: unknown;
  backendMode?: unknown;
  lastError?: unknown;
  musicAwaitingGesture?: unknown;
  musicLoading?: unknown;
  musicPlaying?: unknown;
  musicSong?: unknown;
  outputMuted?: unknown;
  soundEnabled?: unknown;
}): string {
  const muted = args.soundEnabled ? "" : " sound-off";
  const outputMuted = args.outputMuted ? " output-muted" : "";
  const song = String(args.musicSong || "");
  const err = args.lastError ? ` err:${String(args.lastError)}` : "";
  const music = args.musicAwaitingGesture
    ? ` gesture:${song}`
    : args.musicLoading
      ? ` load:${song}`
      : args.musicPlaying
        ? ` music:${song}`
        : "";
  return `${String(args.backendMode || "")}${muted}${outputMuted}${music} ambient:${Number(args.ambientTriggerCount) | 0} ${String(args.ambientLastSfx || "-")}${err}`;
}

export function formatLedgerEntryCountRuntime(count: number): string {
  const n = Math.max(0, Number(count) | 0);
  return `${n} entr${n === 1 ? "y" : "ies"}`;
}

export function buildStatusPanelTextRuntime(args: {
  audioStatus?: {
    backendMode?: unknown;
    lastError?: unknown;
    musicAwaitingGesture?: unknown;
    musicLoading?: unknown;
    musicPlaying?: unknown;
    musicSong?: unknown;
    muted?: unknown;
  } | null;
  audioAmbientLastSfx?: unknown;
  audioAmbientTriggerCount?: unknown;
  avatarFacingDx: unknown;
  avatarFacingDy: unknown;
  avatarPose: unknown;
  centerAnimatedTile: unknown;
  centerPaletteBand: unknown;
  centerRawTile: unknown;
  enablePaletteFx: unknown;
  entityLayerLoaded: boolean;
  entityLayerTotalLoaded?: unknown;
  entityOverlayCount: unknown;
  hashText: unknown;
  interactionProbeTile: number | null | undefined;
  loopHealth: {
    backlogDrops?: unknown;
    frameErrors?: unknown;
    lastDtMs?: unknown;
    maxDtMs?: unknown;
    visibilityResets?: unknown;
  };
  movementMode: string;
  netRemotePlayers: unknown;
  npcOcclusionBlockedMoves: unknown;
  objectLayerTotalLoaded?: unknown;
  objectLayerLoaded: boolean;
  objectOverlayCount: unknown;
  palettePhase: unknown;
  queueLength: unknown;
  renderParityMismatches: unknown;
  sessionStarted: boolean;
  simPaused: boolean;
  soundEnabled?: unknown;
  targetVerb: string;
  targetVerbLabels: Record<string, string>;
  tick: unknown;
  tileId: unknown;
  timeOfDayLabel: unknown;
  useCursorActive: boolean;
  world: StatusWorldRuntime;
}): StatusPanelTextRuntime {
  const clock = formatClockRuntime(args.world);
  const audio = args.audioStatus || {};
  return {
    audio: formatAudioStatusRuntime({
      ambientLastSfx: args.audioAmbientLastSfx,
      ambientTriggerCount: args.audioAmbientTriggerCount,
      backendMode: audio.backendMode,
      lastError: audio.lastError,
      musicAwaitingGesture: audio.musicAwaitingGesture,
      musicLoading: audio.musicLoading,
      musicPlaying: audio.musicPlaying,
      musicSong: audio.musicSong,
      outputMuted: audio.muted,
      soundEnabled: args.soundEnabled
    }),
    avatarState: formatAvatarStateRuntime({
      facingDx: Number(args.avatarFacingDx) | 0,
      facingDy: Number(args.avatarFacingDy) | 0,
      movementMode: args.movementMode,
      pose: String(args.avatarPose || "")
    }),
    centerBand: String(args.centerPaletteBand || ""),
    centerTiles: formatCenterTilesRuntime(args.centerRawTile, args.centerAnimatedTile),
    clock: clock.text,
    date: formatDateRuntime(args.world),
    entities: formatLayerCountRuntime(args.entityOverlayCount, args.entityLayerTotalLoaded, args.entityLayerLoaded),
    hash: String(args.hashText || ""),
    inputMode: formatInputModeRuntime({
      movementMode: args.movementMode,
      sessionStarted: args.sessionStarted,
      targetVerb: args.targetVerb,
      targetVerbLabels: args.targetVerbLabels,
      useCursorActive: args.useCursorActive
    }),
    loopHealth: formatLoopHealthRuntime({
      backlogDrops: Number(args.loopHealth.backlogDrops) | 0,
      frameErrors: Number(args.loopHealth.frameErrors) | 0,
      lastDtMs: Number(args.loopHealth.lastDtMs) || 0,
      maxDtMs: Number(args.loopHealth.maxDtMs) || 0,
      paused: args.simPaused,
      visibilityResets: Number(args.loopHealth.visibilityResets) | 0
    }),
    netPlayers: formatNetPlayerCountRuntime(args.netRemotePlayers),
    npcOcclusionBlocks: formatSimpleCountRuntime(args.npcOcclusionBlockedMoves),
    objects: formatLayerCountRuntime(args.objectOverlayCount, args.objectLayerTotalLoaded, args.objectLayerLoaded),
    palettePhase: formatPalettePhaseRuntime(args.enablePaletteFx, args.palettePhase),
    position: formatPositionRuntime(args.world),
    queued: formatSimpleCountRuntime(args.queueLength),
    renderParity: formatRenderParityRuntime({
      interactionProbeTile: args.interactionProbeTile,
      mismatchCount: Number(args.renderParityMismatches) | 0
    }),
    simLoop: formatSimLoopStateRuntime(args.simPaused),
    tick: String(Number(args.tick) | 0),
    tile: `0x${(Number(args.tileId) >>> 0).toString(16).padStart(2, "0")}`,
    topTimeOfDay: formatTopTimeOfDayRuntime(args.timeOfDayLabel, clock.text)
  };
}

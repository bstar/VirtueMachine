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

export function formatLedgerEntryCountRuntime(count: number): string {
  const n = Math.max(0, Number(count) | 0);
  return `${n} entr${n === 1 ? "y" : "ies"}`;
}

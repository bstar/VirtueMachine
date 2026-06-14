import nodeCrypto from "node:crypto";
import {
  normalizeRuntimeProfile,
  parseRuntimeExtensionsHeader
} from "../common/runtime_contract.ts";

export type WorldClockRuntime = {
  date_d: number;
  date_m: number;
  date_y: number;
  last_advanced_at_ms: number;
  tick: number;
  time_h: number;
  time_m: number;
};

export type WorldInteractionEventRuntime = {
  actor_id: string;
  container_key: string;
  holder_id: string;
  holder_key: string;
  holder_kind: string;
  runtime_extensions: string[];
  runtime_profile: string;
  seq: number;
  status: number;
  target_key: string;
  verb: string;
  x: number;
  y: number;
  z: number;
};

export type WorldInteractionLogRuntime = {
  checkpoint_hash: string;
  events: WorldInteractionEventRuntime[];
  schema_version: 1;
  seq: number;
};

export type PresenceRowRuntime = {
  character_name: string;
  facing_dx: number;
  facing_dy: number;
  map_x: number;
  map_y: number;
  map_z: number;
  mode: string;
  runtime_extensions: string[];
  runtime_profile: string;
  session_id: string;
  tick: number;
  updated_at_ms: number;
  user_id: string;
  username: string;
};

export type CriticalItemPolicyRuntime = {
  anchor_locations?: Array<{ x?: unknown; y?: unknown; z?: unknown }>;
  cooldown_ticks?: unknown;
  item_id?: unknown;
  min_count?: unknown;
  policy_type?: unknown;
  quest_gate?: unknown;
};

export type CriticalWorldItemRuntime = {
  item_id?: unknown;
  reachable?: unknown;
};

export type CriticalRecoveryEventRuntime = {
  at: string;
  item_id: string;
  kind: "critical_item_recovery";
  reason: "below_min_count" | "missing_or_unreachable";
  restored_to: {
    x: number;
    y: number;
    z: number;
  };
  tick: number | null;
};

export function defaultWorldClockRuntime(nowMs = Date.now()): WorldClockRuntime {
  return {
    tick: 0,
    time_m: 0,
    time_h: 0,
    date_d: 1,
    date_m: 1,
    date_y: 1,
    last_advanced_at_ms: nowMs
  };
}

export function normalizeWorldClockRuntime(raw: unknown, nowMs = Date.now()): WorldClockRuntime {
  const base = defaultWorldClockRuntime(nowMs);
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const row = raw as Partial<WorldClockRuntime>;
  return {
    tick: Number(row.tick) >>> 0,
    time_m: Number(row.time_m) >>> 0,
    time_h: Number(row.time_h) >>> 0,
    date_d: Number(row.date_d) >>> 0 || 1,
    date_m: Number(row.date_m) >>> 0 || 1,
    date_y: Number(row.date_y) >>> 0 || 1,
    last_advanced_at_ms: Number(row.last_advanced_at_ms) || nowMs
  };
}

export function parseU16LERuntime(bytes: Uint8Array | Buffer, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

export function decodePackedCoordRuntime(raw0: number, raw1: number, raw2: number): { x: number; y: number; z: number } {
  return {
    x: (raw0 | ((raw1 & 0x03) << 8)) >>> 0,
    y: ((raw1 >> 2) | ((raw2 & 0x0f) << 6)) >>> 0,
    z: ((raw2 >> 4) & 0x0f) >>> 0
  };
}

export function clampIntRuntime(n: unknown, lo: number, hi: number): number {
  const v = Number(n) | 0;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function queryIntOrRuntime(url: URL, key: string, fallback: number): number {
  if (!url.searchParams.has(key)) {
    return fallback;
  }
  const v = Number(url.searchParams.get(key));
  if (!Number.isFinite(v)) {
    return fallback;
  }
  return v | 0;
}

export function advanceWorldClockMinuteRuntime(clock: WorldClockRuntime, args: {
  daysPerMonth: number;
  hoursPerDay: number;
  minutesPerHour: number;
  monthsPerYear: number;
}): void {
  clock.time_m += 1;
  if (clock.time_m < args.minutesPerHour) return;
  clock.time_m = 0;
  clock.time_h += 1;
  if (clock.time_h < args.hoursPerDay) return;
  clock.time_h = 0;
  clock.date_d += 1;
  if (clock.date_d <= args.daysPerMonth) return;
  clock.date_d = 1;
  clock.date_m += 1;
  if (clock.date_m <= args.monthsPerYear) return;
  clock.date_m = 1;
  clock.date_y += 1;
}

export function computeSnapshotHashRuntime(snapshotBase64: unknown): string {
  return nodeCrypto.createHash("sha256").update(String(snapshotBase64 || "")).digest("hex");
}

export function deterministicRecoveryTickLastRuntime(
  events: readonly { item_id?: unknown; tick?: unknown }[],
  itemId: unknown
): number | null {
  const wanted = String(itemId);
  const filtered = events
    .filter((e) => String(e.item_id) === wanted)
    .map((e) => Number(e.tick))
    .filter((tick) => Number.isFinite(tick))
    .sort((a, b) => b - a);
  return filtered.length ? filtered[0] : null;
}

export function defaultCriticalPolicyRuntime(): CriticalItemPolicyRuntime[] {
  return [
    {
      item_id: "item_moonstone",
      policy_type: "regenerative_unique",
      anchor_locations: [{ x: 307, y: 347, z: 0 }],
      cooldown_ticks: 120,
      min_count: 1,
      quest_gate: null
    }
  ];
}

export function runCriticalItemMaintenanceRuntime(args: {
  criticalPolicy: readonly CriticalItemPolicyRuntime[];
  nowIso: string;
  payload: unknown;
  recoveryEvents: readonly { item_id?: unknown; tick?: unknown }[];
}): CriticalRecoveryEventRuntime[] {
  const payload = args.payload && typeof args.payload === "object"
    ? args.payload as { tick?: unknown; world_items?: unknown }
    : {};
  const tick = Number(payload.tick);
  const worldItems = Array.isArray(payload.world_items) ? payload.world_items as CriticalWorldItemRuntime[] : [];
  const emitted: CriticalRecoveryEventRuntime[] = [];

  const sortedPolicy = [...args.criticalPolicy].sort((a, b) => String(a.item_id).localeCompare(String(b.item_id)));

  for (const policy of sortedPolicy) {
    const itemId = String(policy.item_id || "");
    if (!itemId) {
      continue;
    }
    const existing = worldItems.filter((w) => String(w.item_id) === itemId && w.reachable !== false);
    const minCount = Number.isFinite(Number(policy.min_count)) ? Math.max(1, Number(policy.min_count) | 0) : 1;
    const cooldown = Number.isFinite(Number(policy.cooldown_ticks)) ? Math.max(0, Number(policy.cooldown_ticks) | 0) : 0;
    const lastTick = deterministicRecoveryTickLastRuntime(args.recoveryEvents, itemId);
    const cooldownReady = lastTick == null || !Number.isFinite(tick) || ((tick - lastTick) >= cooldown);

    let needsRecovery = false;
    if (policy.policy_type === "instance_quota") {
      needsRecovery = existing.length < minCount;
    } else {
      needsRecovery = existing.length < 1;
    }

    if (!needsRecovery || !cooldownReady) {
      continue;
    }

    const anchor = Array.isArray(policy.anchor_locations) && policy.anchor_locations.length
      ? policy.anchor_locations[0]
      : { x: 0, y: 0, z: 0 };

    emitted.push({
      kind: "critical_item_recovery",
      at: args.nowIso,
      tick: Number.isFinite(tick) ? tick : null,
      item_id: itemId,
      reason: existing.length ? "below_min_count" : "missing_or_unreachable",
      restored_to: {
        x: Number(anchor.x) | 0,
        y: Number(anchor.y) | 0,
        z: Number(anchor.z) | 0
      }
    });
  }

  return emitted;
}

function parseRuntimeExtensionsRuntime(raw: unknown): string[] {
  return parseRuntimeExtensionsHeader(
    Array.isArray(raw)
      ? raw.join(",")
      : raw
  );
}

export function defaultWorldInteractionLogRuntime(): WorldInteractionLogRuntime {
  return {
    schema_version: 1,
    seq: 0,
    checkpoint_hash: "",
    events: []
  };
}

export function normalizeWorldInteractionLogRuntime(raw: unknown): WorldInteractionLogRuntime {
  const base = defaultWorldInteractionLogRuntime();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const row = raw as {
    checkpoint_hash?: unknown;
    events?: unknown;
    schema_version?: unknown;
    seq?: unknown;
  };
  base.schema_version = Number(row.schema_version) === 1 ? 1 : 1;
  base.seq = Math.max(0, Number(row.seq) | 0);
  base.checkpoint_hash = String(row.checkpoint_hash || "");
  if (Array.isArray(row.events)) {
    base.events = row.events.slice(-512).map((e) => normalizeWorldInteractionEventRuntime(e, 0));
  }
  return base;
}

export function normalizeWorldInteractionEventRuntime(raw: unknown, seq: number): WorldInteractionEventRuntime {
  const event = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    seq: Number(seq || event.seq) | 0,
    verb: String(event.verb || ""),
    actor_id: String(event.actor_id || ""),
    target_key: String(event.target_key || ""),
    container_key: String(event.container_key || ""),
    status: Number(event.status) & 0xff,
    x: Number(event.x) | 0,
    y: Number(event.y) | 0,
    z: Number(event.z) | 0,
    holder_kind: String(event.holder_kind || "none"),
    holder_id: String(event.holder_id || ""),
    holder_key: String(event.holder_key || ""),
    runtime_profile: normalizeRuntimeProfile(event.runtime_profile),
    runtime_extensions: parseRuntimeExtensionsRuntime(event.runtime_extensions)
  };
}

export function hashInteractionEventRuntime(prevHash: unknown, event: Partial<WorldInteractionEventRuntime>): string {
  const stable = [
    String(prevHash || ""),
    String(Number(event.seq) | 0),
    String(event.verb || ""),
    String(event.actor_id || ""),
    String(event.target_key || ""),
    String(event.container_key || ""),
    String(Number(event.status) & 0xff),
    String(Number(event.x) | 0),
    String(Number(event.y) | 0),
    String(Number(event.z) | 0),
    String(event.holder_kind || "none"),
    String(event.holder_id || ""),
    String(event.holder_key || "")
  ].join("|");
  return nodeCrypto.createHash("sha256").update(stable, "utf8").digest("hex");
}

export function recordWorldInteractionEventRuntime(
  state: { worldInteractionLog?: WorldInteractionLogRuntime | null },
  event: unknown
): WorldInteractionEventRuntime {
  const log = state.worldInteractionLog || defaultWorldInteractionLogRuntime();
  const nextSeq = (Number(log.seq) | 0) + 1;
  const row = normalizeWorldInteractionEventRuntime(event, nextSeq);
  log.checkpoint_hash = hashInteractionEventRuntime(log.checkpoint_hash, row);
  log.seq = nextSeq | 0;
  log.events = Array.isArray(log.events) ? log.events : [];
  log.events.push(row);
  if (log.events.length > 512) {
    log.events = log.events.slice(log.events.length - 512);
  }
  state.worldInteractionLog = log;
  return row;
}

export function normalizePresenceRowsRuntime(raw: unknown): PresenceRowRuntime[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((p) => ({
    user_id: String(p?.user_id || ""),
    username: String(p?.username || ""),
    session_id: String(p?.session_id || ""),
    character_name: String(p?.character_name || ""),
    map_x: Number(p?.map_x) | 0,
    map_y: Number(p?.map_y) | 0,
    map_z: Number(p?.map_z) | 0,
    facing_dx: Number(p?.facing_dx) | 0,
    facing_dy: Number(p?.facing_dy) | 0,
    tick: Number(p?.tick) >>> 0,
    mode: String(p?.mode || "avatar"),
    runtime_profile: normalizeRuntimeProfile(p?.runtime_profile),
    runtime_extensions: parseRuntimeExtensionsRuntime(p?.runtime_extensions),
    updated_at_ms: Number(p?.updated_at_ms || 0)
  }));
}

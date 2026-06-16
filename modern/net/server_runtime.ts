import nodeCrypto from "node:crypto";
import {
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILES,
  normalizeRuntimeProfile,
  parseRuntimeExtensionsHeader
} from "../common/runtime_contract.ts";
import {
  normalizeWorldRouteInteractionVerbRuntime,
  type WorldRouteInteractionVerb
} from "../common/world_interaction_contract.ts";
import {
  normalizeWorldObjectHolderKindRuntime,
  type WorldObjectHolderKind
} from "../common/world_object_contract.ts";

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
  holder_kind: WorldObjectHolderKind;
  runtime_extensions: string[];
  runtime_profile: string;
  seq: number;
  status: number;
  target_key: string;
  verb: WorldRouteInteractionVerb | "";
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

export type WorldSnapshotRuntime = {
  snapshot_base64: string | null;
  snapshot_meta: {
    saved_tick: number;
    schema_version: number;
    sim_core_version: string;
    snapshot_hash: string | null;
  };
  updated_at: string;
};

export type RuntimeContractHeaderSourceRuntime = {
  "x-vm-runtime-extensions"?: unknown;
  "x-vm-runtime-profile"?: unknown;
};

export type RuntimeContractRuntime = {
  extensions: string[];
  profile: string;
};

export type WorldClockPayloadRuntime = {
  date_d: number;
  date_m: number;
  date_y: number;
  intro_state: unknown;
  npc_overrides: unknown[];
  npc_states: unknown[];
  runtime_contract: RuntimeContractRuntime;
  tick: number;
  time_h: number;
  time_m: number;
};

export type RuntimeContractSpecRuntime = {
  default_profile: string;
  extension_header_format: string;
  notes: string[];
  profiles: string[];
};

export type RuntimeContractPayloadRuntime = {
  runtime_contract: RuntimeContractSpecRuntime;
};

export type ServerHealthPayloadRuntime = {
  email_mode: string;
  now: string;
  ok: true;
  service: string;
  tick: number;
  world_objects: unknown;
};

export type ServerRouteAuthRequirementRuntime = "authenticated" | "preflight" | "public";

export type CriticalMaintenancePayloadRuntime = {
  events: unknown[];
};

export type PresenceHeartbeatAckPayloadRuntime = {
  now: string;
  ok: true;
  runtime_contract: RuntimeContractRuntime;
  tick: number;
};

export type PresenceLeaveAckPayloadRuntime = {
  ok: true;
  removed: string;
};

export type PresenceListPayloadRuntime = {
  players: PresenceRowRuntime[];
};

export type IntroStatePayloadRuntime = {
  intro_state: unknown;
};

export type IntroStateSavedPayloadRuntime = IntroStatePayloadRuntime & {
  ok: true;
};

export type WorldObjectsQueryRuntime = {
  hasX: boolean;
  hasY: boolean;
  hasZ: boolean;
  includeFootprint: boolean;
  limit: number;
  projection: "anchor" | "footprint";
  radius: number;
  responseQuery: {
    include_footprint: boolean;
    limit: number;
    projection: "anchor" | "footprint";
    radius: number;
    x: number | null;
    y: number | null;
    z: number | null;
  };
  x: number;
  y: number;
  z: number;
};

export type WorldObjectPositionRuntime = {
  x: number;
  y: number;
  z: number;
};

export type WorldObjectDropValidationRuntime = {
  error?: ValidationErrorRuntime;
  ok: boolean;
};

export type ValidationErrorRuntime = {
  code: string;
  http: number;
  message: string;
};

type WorldSnapshotSourceRuntime = {
  snapshot_base64?: unknown;
  snapshot_meta?: {
    saved_tick?: unknown;
    schema_version?: unknown;
    sim_core_version?: unknown;
    snapshot_hash?: unknown;
  };
  updated_at?: unknown;
};

export function runtimeContractFromHeadersRuntime(
  headers: RuntimeContractHeaderSourceRuntime | null | undefined
): RuntimeContractRuntime {
  return {
    profile: normalizeRuntimeProfile(headers?.["x-vm-runtime-profile"]),
    extensions: parseRuntimeExtensionsHeader(headers?.["x-vm-runtime-extensions"])
  };
}

export function runtimeContractSpecRuntime(): RuntimeContractSpecRuntime {
  return {
    profiles: [...RUNTIME_PROFILES].sort(),
    default_profile: RUNTIME_PROFILE_CANONICAL_STRICT,
    extension_header_format: "comma-separated ids or 'none'",
    notes: [
      "unknown/invalid profile falls back to canonical_strict",
      "unknown/invalid extension tokens are ignored"
    ]
  };
}

export function runtimeContractPayloadRuntime(): RuntimeContractPayloadRuntime {
  return {
    runtime_contract: runtimeContractSpecRuntime()
  };
}

export function serverRouteAuthRequirementRuntime(args: {
  method?: unknown;
  pathname?: unknown;
}): ServerRouteAuthRequirementRuntime {
  const method = String(args.method || "").trim().toUpperCase();
  const pathname = String(args.pathname || "/").trim() || "/";
  if (method === "OPTIONS") {
    return "preflight";
  }
  if (method === "GET" && (pathname === "/health" || pathname === "/api/runtime/contract")) {
    return "public";
  }
  if (method === "POST" && pathname === "/api/auth/login") {
    return "public";
  }
  if (method === "GET" && pathname === "/api/auth/recover-password") {
    return "public";
  }
  return "authenticated";
}

export function characterSnapshotRouteIdRuntime(pathname: unknown): string | null {
  const match = String(pathname || "").match(/^\/api\/characters\/([0-9a-fA-F-]+)\/snapshot$/);
  return match ? match[1] : null;
}

type WorldInteractionEventSourceRuntime = {
  actor_id?: unknown;
  container_key?: unknown;
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  runtime_extensions?: unknown;
  runtime_profile?: unknown;
  seq?: unknown;
  status?: unknown;
  target_key?: unknown;
  verb?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type PresenceHeartbeatBodyRuntime = {
  character_name?: unknown;
  facing_dx?: unknown;
  facing_dy?: unknown;
  map_x?: unknown;
  map_y?: unknown;
  map_z?: unknown;
  mode?: unknown;
  session_id?: unknown;
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

export function defaultWorldSnapshotRuntime(nowIso = new Date().toISOString()): WorldSnapshotRuntime {
  return {
    snapshot_meta: {
      schema_version: 1,
      sim_core_version: "unknown",
      saved_tick: 0,
      snapshot_hash: null
    },
    snapshot_base64: null,
    updated_at: nowIso
  };
}

function asWorldSnapshotSourceRuntime(raw: unknown): WorldSnapshotSourceRuntime | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as {
    snapshot_base64?: unknown;
    snapshot_meta?: unknown;
    updated_at?: unknown;
  };
  return {
    snapshot_base64: row.snapshot_base64,
    snapshot_meta: row.snapshot_meta && typeof row.snapshot_meta === "object"
      ? row.snapshot_meta as WorldSnapshotSourceRuntime["snapshot_meta"]
      : undefined,
    updated_at: row.updated_at
  };
}

export function normalizeWorldSnapshotRuntime(raw: unknown, nowIso = new Date().toISOString()): WorldSnapshotRuntime {
  const base = defaultWorldSnapshotRuntime(nowIso);
  const row = asWorldSnapshotSourceRuntime(raw);
  if (!row) {
    return base;
  }
  const meta = row.snapshot_meta ?? {};
  return {
    snapshot_meta: {
      schema_version: Number(meta.schema_version) || 1,
      sim_core_version: String(meta.sim_core_version || "unknown"),
      saved_tick: Number(meta.saved_tick) >>> 0,
      snapshot_hash: meta.snapshot_hash == null ? null : String(meta.snapshot_hash || "")
    },
    snapshot_base64: row.snapshot_base64 == null ? null : String(row.snapshot_base64 || ""),
    updated_at: String(row.updated_at || nowIso)
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

export function worldObjectsQueryRuntime(url: URL): WorldObjectsQueryRuntime {
  const hasX = url.searchParams.has("x");
  const hasY = url.searchParams.has("y");
  const x = queryIntOrRuntime(url, "x", 0);
  const y = queryIntOrRuntime(url, "y", 0);
  const zRaw = queryIntOrRuntime(url, "z", Number.NaN);
  const hasZ = Number.isFinite(zRaw);
  const radius = clampIntRuntime(queryIntOrRuntime(url, "radius", 0), 0, 16);
  const limit = clampIntRuntime(queryIntOrRuntime(url, "limit", 4096), 1, 200000);
  const projection = String(url.searchParams.get("projection") || "anchor").trim().toLowerCase() === "footprint"
    ? "footprint"
    : "anchor";
  const includeFootprintRaw = String(url.searchParams.get("include_footprint") || "").trim().toLowerCase();
  const includeFootprint = includeFootprintRaw === "1" || includeFootprintRaw === "true" || includeFootprintRaw === "on";
  return {
    hasX,
    hasY,
    hasZ,
    includeFootprint,
    limit,
    projection,
    radius,
    x,
    y,
    z: zRaw,
    responseQuery: {
      x: hasX ? (x | 0) : null,
      y: hasY ? (y | 0) : null,
      z: hasZ ? (zRaw | 0) : null,
      radius: radius | 0,
      limit: limit | 0,
      projection,
      include_footprint: includeFootprint
    }
  };
}

export function validateWorldObjectDropPositionRuntime(args: {
  actorPos: WorldObjectPositionRuntime;
  canStepInto: (step: { to_x: number; to_y: number; to_z: number }) => boolean;
  dropPos: WorldObjectPositionRuntime;
}): WorldObjectDropValidationRuntime {
  const actor = args.actorPos;
  const drop = args.dropPos;
  const dropDistance = Math.max(
    Math.abs((Number(actor.x) | 0) - (Number(drop.x) | 0)),
    Math.abs((Number(actor.y) | 0) - (Number(drop.y) | 0))
  );
  if (dropDistance > 5 || (Number(actor.z) | 0) !== (Number(drop.z) | 0)) {
    return {
      ok: false,
      error: {
        http: 409,
        code: "drop_out_of_range",
        message: "drop target is out of range"
      }
    };
  }
  if (!args.canStepInto({ to_x: Number(drop.x) | 0, to_y: Number(drop.y) | 0, to_z: Number(drop.z) | 0 })) {
    return {
      ok: false,
      error: {
        http: 409,
        code: "drop_blocked",
        message: "drop target is blocked"
      }
    };
  }
  return { ok: true };
}

export function worldClockPayloadRuntime(args: {
  clock: WorldClockRuntime;
  introState: unknown;
  npcOverrides?: unknown;
  npcStates?: unknown;
  runtimeContract: RuntimeContractRuntime;
}): WorldClockPayloadRuntime {
  return {
    tick: args.clock.tick >>> 0,
    time_m: args.clock.time_m >>> 0,
    time_h: args.clock.time_h >>> 0,
    date_d: args.clock.date_d >>> 0,
    date_m: args.clock.date_m >>> 0,
    date_y: args.clock.date_y >>> 0,
    intro_state: args.introState,
    npc_states: Array.isArray(args.npcStates) ? args.npcStates : [],
    npc_overrides: Array.isArray(args.npcOverrides) ? args.npcOverrides : [],
    runtime_contract: args.runtimeContract
  };
}

export function serverHealthPayloadRuntime(args: {
  emailMode: unknown;
  now: string;
  service?: unknown;
  tick: unknown;
  worldObjects: unknown;
}): ServerHealthPayloadRuntime {
  return {
    ok: true,
    service: String(args.service || "virtuemachine-net"),
    now: String(args.now || ""),
    tick: Number(args.tick) >>> 0,
    email_mode: String(args.emailMode || ""),
    world_objects: args.worldObjects
  };
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

export function snapshotSaveRuntime(args: {
  body: {
    saved_tick?: unknown;
    schema_version?: unknown;
    sim_core_version?: unknown;
    snapshot_base64?: unknown;
  } | null | undefined;
  nowIso: string;
  sanitizeSnapshotBase64?: (snapshotBase64: string) => string;
}): WorldSnapshotRuntime | null {
  const rawSnapshotBase64 = String(args.body?.snapshot_base64 || "").trim();
  const snapshotBase64 = args.sanitizeSnapshotBase64
    ? args.sanitizeSnapshotBase64(rawSnapshotBase64)
    : rawSnapshotBase64;
  if (!snapshotBase64) {
    return null;
  }
  return {
    snapshot_base64: snapshotBase64,
    snapshot_meta: {
      schema_version: Number(args.body?.schema_version) || 1,
      sim_core_version: String(args.body?.sim_core_version || "unknown"),
      saved_tick: Number(args.body?.saved_tick) || 0,
      snapshot_hash: computeSnapshotHashRuntime(snapshotBase64)
    },
    updated_at: String(args.nowIso || "")
  };
}

export function worldSnapshotReadPayloadRuntime(snapshot: WorldSnapshotRuntime): {
  snapshot_base64: string | null;
  snapshot_meta: WorldSnapshotRuntime["snapshot_meta"];
  updated_at: string;
} {
  return {
    snapshot_meta: snapshot.snapshot_meta,
    snapshot_base64: snapshot.snapshot_base64,
    updated_at: snapshot.updated_at
  };
}

export function worldSnapshotSavedPayloadRuntime(snapshot: WorldSnapshotRuntime): {
  snapshot_meta: WorldSnapshotRuntime["snapshot_meta"];
  updated_at: string;
} {
  return {
    snapshot_meta: snapshot.snapshot_meta,
    updated_at: snapshot.updated_at
  };
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

export function normalizeCriticalPolicyRuntime(raw: unknown): CriticalItemPolicyRuntime[] {
  if (!Array.isArray(raw)) {
    return defaultCriticalPolicyRuntime();
  }
  const out: CriticalItemPolicyRuntime[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const row = value as CriticalItemPolicyRuntime;
    const itemId = String(row.item_id || "").trim();
    if (!itemId || seen.has(itemId)) {
      continue;
    }
    seen.add(itemId);
    const anchors = Array.isArray(row.anchor_locations)
      ? row.anchor_locations
        .filter((anchor) => anchor && typeof anchor === "object")
        .map((anchor) => ({
          x: Number((anchor as { x?: unknown }).x) | 0,
          y: Number((anchor as { y?: unknown }).y) | 0,
          z: Number((anchor as { z?: unknown }).z) | 0
        }))
      : [];
    out.push({
      item_id: itemId,
      policy_type: String(row.policy_type || "regenerative_unique"),
      anchor_locations: anchors,
      cooldown_ticks: Number.isFinite(Number(row.cooldown_ticks)) ? Math.max(0, Number(row.cooldown_ticks) | 0) : 0,
      min_count: Number.isFinite(Number(row.min_count)) ? Math.max(1, Number(row.min_count) | 0) : 1,
      quest_gate: row.quest_gate ?? null
    });
  }
  return out.length ? out : defaultCriticalPolicyRuntime();
}

export function criticalPolicyPayloadRuntime(policy: unknown): {
  critical_item_policy: unknown;
} {
  return {
    critical_item_policy: policy
  };
}

export function criticalMaintenancePayloadRuntime(events: unknown): CriticalMaintenancePayloadRuntime {
  return {
    events: Array.isArray(events) ? events : []
  };
}

export function validateCriticalPolicyBodyRuntime(
  body: unknown
): { ok: true; policy: unknown[] } | { ok: false; error: ValidationErrorRuntime } {
  const source = body && typeof body === "object" ? body as { critical_item_policy?: unknown } : {};
  if (!Array.isArray(source.critical_item_policy)) {
    return {
      ok: false,
      error: {
        http: 400,
        code: "bad_policy",
        message: "critical_item_policy array is required"
      }
    };
  }
  return {
    ok: true,
    policy: source.critical_item_policy
  };
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

function asWorldInteractionEventSourceRuntime(raw: unknown): WorldInteractionEventSourceRuntime {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as WorldInteractionEventSourceRuntime;
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
  const event = asWorldInteractionEventSourceRuntime(raw);
  return {
    seq: Number(seq || event.seq) | 0,
    verb: normalizeWorldRouteInteractionVerbRuntime(event.verb) || "",
    actor_id: String(event.actor_id || ""),
    target_key: String(event.target_key || ""),
    container_key: String(event.container_key || ""),
    status: Number(event.status) & 0xff,
    x: Number(event.x) | 0,
    y: Number(event.y) | 0,
    z: Number(event.z) | 0,
    holder_kind: normalizeWorldObjectHolderKindRuntime(event.holder_kind),
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
    normalizeWorldObjectHolderKindRuntime(event.holder_kind),
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

export function worldObjectBaselineMutationResponseRuntime(args: {
  at: string;
  kind: "reset" | "reload";
  meta: unknown;
  worldInteractionLog?: Partial<WorldInteractionLogRuntime> | null;
}): {
  interaction_checkpoint: {
    hash: string;
    seq: number;
  };
  meta: unknown;
  ok: true;
  reloaded_at?: string;
  reset_at?: string;
} {
  const response = {
    ok: true as const,
    interaction_checkpoint: {
      seq: Number(args.worldInteractionLog?.seq || 0) >>> 0,
      hash: String(args.worldInteractionLog?.checkpoint_hash || "")
    },
    meta: args.meta
  };
  const at = String(args.at || "");
  return args.kind === "reload"
    ? { ...response, reloaded_at: at }
    : { ...response, reset_at: at };
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

export function prunePresenceRowsRuntime(
  rows: readonly PresenceRowRuntime[],
  args: { nowMs: number; ttlMs: number }
): PresenceRowRuntime[] {
  const cutoff = (Number(args.nowMs) || 0) - Math.max(0, Number(args.ttlMs) || 0);
  return rows.filter((p) => Number(p.updated_at_ms || 0) >= cutoff);
}

export function upsertPresenceRowRuntime(
  rows: readonly PresenceRowRuntime[],
  row: PresenceRowRuntime,
  args: { nowMs: number; ttlMs: number }
): PresenceRowRuntime[] {
  const userId = String(row.user_id || "");
  const sessionId = String(row.session_id || "");
  const replaced = rows.filter((p) => {
    const pUserId = String(p.user_id || "");
    const pSessionId = String(p.session_id || "");
    return pUserId !== userId && pSessionId !== sessionId;
  });
  return prunePresenceRowsRuntime([...replaced, row], args);
}

export function removePresenceForUserRuntime(
  rows: readonly PresenceRowRuntime[],
  userId: unknown,
  args: { nowMs: number; ttlMs: number }
): PresenceRowRuntime[] {
  const wanted = String(userId || "");
  return prunePresenceRowsRuntime(rows.filter((p) => String(p.user_id || "") !== wanted), args);
}

export function removePresenceSessionRuntime(
  rows: readonly PresenceRowRuntime[],
  args: { nowMs: number; sessionId: unknown; ttlMs: number; userId: unknown }
): { key: string; rows: PresenceRowRuntime[] } {
  const userId = String(args.userId || "");
  const sessionId = String(args.sessionId || "");
  const key = `${userId}:${sessionId}`;
  const rowsOut = rows.filter((p) => {
    const pKey = `${String(p.user_id || "")}:${String(p.session_id || "")}`;
    return pKey !== key;
  });
  return {
    key,
    rows: prunePresenceRowsRuntime(rowsOut, args)
  };
}

function asPresenceHeartbeatBodyRuntime(raw: unknown): PresenceHeartbeatBodyRuntime {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as PresenceHeartbeatBodyRuntime;
}

export function buildPresenceHeartbeatRowRuntime(args: {
  body: unknown;
  characterName?: unknown;
  clockTick: unknown;
  nowMs: number;
  runtimeContract: { extensions?: unknown; profile?: unknown };
  userId: unknown;
  username: unknown;
}): PresenceRowRuntime {
  const body = asPresenceHeartbeatBodyRuntime(args.body);
  const contract = args.runtimeContract || {};
  return {
    user_id: String(args.userId || ""),
    username: String(args.username || ""),
    session_id: String(body.session_id || "").trim(),
    character_name: String(body.character_name ?? args.characterName ?? "").trim(),
    map_x: Number(body.map_x) | 0,
    map_y: Number(body.map_y) | 0,
    map_z: Number(body.map_z) | 0,
    facing_dx: Number(body.facing_dx) | 0,
    facing_dy: Number(body.facing_dy) | 0,
    tick: Number(args.clockTick) >>> 0,
    mode: String(body.mode || "avatar"),
    runtime_profile: normalizeRuntimeProfile(contract.profile),
    runtime_extensions: parseRuntimeExtensionsRuntime(contract.extensions),
    updated_at_ms: Number(args.nowMs) || 0
  };
}

export function presenceRowsPayloadRuntime(rows: readonly PresenceRowRuntime[]): PresenceRowRuntime[] {
  return rows.map((p) => ({
    user_id: String(p.user_id || ""),
    username: String(p.username || ""),
    session_id: String(p.session_id || ""),
    character_name: String(p.character_name || ""),
    map_x: Number(p.map_x) | 0,
    map_y: Number(p.map_y) | 0,
    map_z: Number(p.map_z) | 0,
    facing_dx: Number(p.facing_dx) | 0,
    facing_dy: Number(p.facing_dy) | 0,
    tick: Number(p.tick) >>> 0,
    mode: String(p.mode || "avatar"),
    runtime_profile: normalizeRuntimeProfile(p.runtime_profile),
    runtime_extensions: parseRuntimeExtensionsRuntime(p.runtime_extensions),
    updated_at_ms: Number(p.updated_at_ms || 0)
  }));
}

export function presenceListPayloadRuntime(rows: readonly PresenceRowRuntime[]): PresenceListPayloadRuntime {
  return {
    players: presenceRowsPayloadRuntime(rows)
  };
}

export function presenceHeartbeatAckPayloadRuntime(args: {
  now: string;
  runtimeContract: RuntimeContractRuntime;
  tick: unknown;
}): PresenceHeartbeatAckPayloadRuntime {
  return {
    ok: true,
    now: String(args.now || ""),
    tick: Number(args.tick) >>> 0,
    runtime_contract: args.runtimeContract
  };
}

export function presenceLeaveAckPayloadRuntime(removed: unknown): PresenceLeaveAckPayloadRuntime {
  return {
    ok: true,
    removed: String(removed || "")
  };
}

export function introStatePayloadRuntime(introState: unknown): IntroStatePayloadRuntime {
  return {
    intro_state: introState
  };
}

export function introStateSavedPayloadRuntime(introState: unknown): IntroStateSavedPayloadRuntime {
  return {
    ok: true,
    intro_state: introState
  };
}

export function validateIntroPhaseRuntime(
  body: unknown,
  prePhase: string,
  postPhase: string
): { ok: true; phase: string } | { ok: false; error: ValidationErrorRuntime } {
  const source = body && typeof body === "object" ? body as { phase?: unknown } : {};
  const phase = String(source.phase || "").trim().toLowerCase();
  if (phase !== prePhase && phase !== postPhase) {
    return {
      ok: false,
      error: {
        http: 400,
        code: "bad_intro_phase",
        message: `phase must be one of: ${prePhase}, ${postPhase}`
      }
    };
  }
  return {
    ok: true,
    phase
  };
}

export function validatePresenceSessionIdRuntime(
  body: unknown,
  minLength = 8
): { ok: true; sessionId: string } | { ok: false; error: ValidationErrorRuntime } {
  const source = body && typeof body === "object" ? body as { session_id?: unknown } : {};
  const sessionId = String(source.session_id || "").trim();
  if (!sessionId || sessionId.length < minLength) {
    return {
      ok: false,
      error: {
        http: 400,
        code: "bad_session_id",
        message: "session_id is required"
      }
    };
  }
  return {
    ok: true,
    sessionId
  };
}

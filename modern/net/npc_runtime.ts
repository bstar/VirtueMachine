import fs from "node:fs";
import path from "node:path";
import {
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_LOCXYZ
} from "../common/u6_object_constants.ts";

const OBJ_STATUS_OFF = 0x0000;
const OBJ_POS_OFF = 0x0100;
const OBJ_SHAPE_OFF = 0x0400;
const OBJ_QUAL_OFF = 0x0700;
const NPC_STATUS_OFF = 0x0800;
const PARTY_OFF = 0x0fe0;
const PARTY_SIZE_OFF = 0x0ff0;
const LEVEL_OFF = 0x0ff1;
const SCHED_INDEX_OFF = 0x10f1;
const NPC_MODE_OFF = 0x11f1;
const NPC_COM_MODE_OFF = 0x12f1;
const MOVE_PTS_OFF = 0x14f1;
const ORIG_SHAPE_OFF = 0x15f1;
const TALK_FLAGS_OFF = 0x17f1;
const LEADER_OFF = 0x18f1;
const NPC_FLAG_OFF = 0x19f1;
const OBJLIST_MIN_SIZE = 0x1bf1;

export const CASTLE_PILOT_NPC_IDS = Object.freeze([2, 5, 6]);
export const INTRO_PHASE_PRE_RUNTIME = "pre_intro";
export const INTRO_PHASE_POST_RUNTIME = "post_intro";

const AI_FINDPATH = 0x81;
const AI_SCHEDULE = 0x86;
const AI_STAND_N = 0x87;
const AI_STAND_E = 0x88;
const AI_STAND_S = 0x89;
const AI_STAND_W = 0x8a;
const AI_GUARD_N = 0x8b;
const AI_GUARD_E = 0x8c;
const AI_GUARD_S = 0x8d;
const AI_GUARD_W = 0x8e;
const AI_WANDER = 0x8f;
const AI_LOITER = 0x90;
const AI_SLEEP = 0x91;
const AI_SIT = 0x92;
const AI_EAT = 0x93;
const AI_FARM = 0x94;
const AI_PLAY = 0x95;
const AI_CONVERSE = 0x96;
const AI_THIEF = 0x97;
const AI_RINGBELL = 0x98;
const AI_BRAWL = 0x99;
const SCHEDULE_MOVE_TICK_INTERVAL = 8;

const UNSUPPORTED_ACTIONS = new Set([AI_THIEF, AI_BRAWL]);

export type NpcRenderableEntry = {
  id: number;
  x: number;
  y: number;
  z: number;
  status: number;
  npcStatus: number;
  qual: number;
  type: number;
  frame: number;
  baseTile: number;
  tileId: number;
  order: number;
  source: "objlist";
};

export type NpcBaselineRuntime = {
  entries: NpcRenderableEntry[];
  assocEntries: Array<{ id: number; assocIndex: number; type: number; frame: number; baseTile: number; tileId: number; order: number }>;
  talkFlags: number[];
  schedIndex: number[];
  npcMode: number[];
  npcComMode: number[];
  movePts: number[];
  leader: number[];
  npcFlag: number[];
  level: number[];
  party: number[];
  partySize: number;
  origShapeType: number[];
};

export type NpcRuntimePersistRuntime = {
  intro_phase: string;
  talk_flags: number[];
};

export type U6ScheduleEntryRuntime = {
  time: number;
  action: number;
  xyz_raw: number;
  x: number;
  y: number;
  z: number;
};

export type U6ScheduleTableRuntime = {
  npcOffsets: number[];
  entryCount: number;
  entries: U6ScheduleEntryRuntime[];
};

export type ScheduledNpcStateRuntime = {
  npc_id: number;
  x: number;
  y: number;
  z: number;
  target_x: number;
  target_y: number;
  target_z: number;
  action: number;
  mode: number;
  direction: number;
  pose: "stand" | "walk" | "sleep" | "sit" | "eat" | "play";
  schedule_index: number;
  source: "schedule";
  path_status: "idle" | "walking" | "blocked" | "unsupported";
  unsupported_action: boolean;
  last_schedule_hour: number;
  last_schedule_date_d: number;
};

export type ScheduledNpcStepRuntime = {
  npc_id: number;
  from_x: number;
  from_y: number;
  from_z: number;
  to_x: number;
  to_y: number;
  to_z: number;
  target_x: number;
  target_y: number;
  target_z: number;
  action: number;
};

export type ScheduledNpcBuildOptionsRuntime = {
  canStep?: (step: ScheduledNpcStepRuntime) => boolean;
};

export type CastlePilotNpcOverrideRuntime = {
  action: number;
  npc_id: number;
  schedule_index: number;
  source: "objlist" | "schedule";
  x: number;
  y: number;
  z: number;
};

export function defaultNpcRuntimeStateRuntime(
  baseline: Pick<NpcBaselineRuntime, "talkFlags"> | null | undefined
): NpcRuntimePersistRuntime {
  return {
    intro_phase: INTRO_PHASE_POST_RUNTIME,
    talk_flags: Array.isArray(baseline?.talkFlags) ? baseline.talkFlags.slice(0, 0x100) : new Array(0x100).fill(0)
  };
}

export function normalizeNpcRuntimeStateRuntime(
  raw: unknown,
  baseline: Pick<NpcBaselineRuntime, "talkFlags"> | null | undefined
): NpcRuntimePersistRuntime {
  const out = defaultNpcRuntimeStateRuntime(baseline);
  if (raw && typeof raw === "object") {
    const row = raw as { intro_phase?: unknown; talk_flags?: unknown };
    const phase = String(row.intro_phase || "").trim().toLowerCase();
    if (phase === INTRO_PHASE_PRE_RUNTIME || phase === INTRO_PHASE_POST_RUNTIME) {
      out.intro_phase = phase;
    }
    if (Array.isArray(row.talk_flags)) {
      for (let i = 0; i < 0x100; i += 1) {
        out.talk_flags[i] = Number(row.talk_flags[i]) & 0xff;
      }
    }
  }
  return out;
}

function parseU16LE(bytes: Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

function decodePackedCoord(raw0: number, raw1: number, raw2: number): { x: number; y: number; z: number } {
  return {
    x: (raw0 | ((raw1 & 0x03) << 8)) >>> 0,
    y: ((raw1 >> 2) | ((raw2 & 0x0f) << 6)) >>> 0,
    z: ((raw2 >> 4) & 0x0f) >>> 0
  };
}

function buildBaseTileTable(bytes: Uint8Array): Uint16Array {
  const out = new Uint16Array(0x400);
  const n = Math.min(0x400, Math.floor(bytes.length / 2));
  for (let i = 0; i < n; i += 1) {
    out[i] = parseU16LE(bytes, i * 2) & 0xffff;
  }
  return out;
}

export function loadBaseTileTable(runtimeDir: string): Uint16Array {
  const full = path.join(runtimeDir, "basetile");
  return buildBaseTileTable(new Uint8Array(fs.readFileSync(full)));
}

export function parseObjlistNpcRuntime(bytes: Uint8Array, baseTiles: Uint16Array): NpcBaselineRuntime {
  if (!(bytes instanceof Uint8Array) || bytes.length < OBJLIST_MIN_SIZE) {
    throw new Error("objlist too small for npc runtime parse");
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: NpcRenderableEntry[] = [];
  const assocEntries: NpcBaselineRuntime["assocEntries"] = [];
  for (let id = 0; id < 0x100; id += 1) {
    const status = bytes[OBJ_STATUS_OFF + id] & 0xff;
    const npcStatus = bytes[NPC_STATUS_OFF + id] & 0xff;
    const shapeType = dv.getUint16(OBJ_SHAPE_OFF + (id * 2), true) >>> 0;
    if (!shapeType) {
      continue;
    }
    const coordUse = status & 0x18;
    const type = shapeType & 0x03ff;
    const frame = (shapeType >>> 10) & 0x3f;
    const qual = bytes[OBJ_QUAL_OFF + id] & 0xff;
    const pos = OBJ_POS_OFF + (id * 3);
    const baseTile = baseTiles[type] ?? 0;
    if (!baseTile) {
      continue;
    }
    if (coordUse !== OBJ_COORD_USE_LOCXYZ) {
      if (coordUse === OBJ_COORD_USE_EQUIP) {
        const assocIndex = (bytes[pos] | (bytes[pos + 1] << 8)) & 0xffff;
        assocEntries.push({
          id,
          assocIndex,
          type,
          frame,
          baseTile,
          tileId: (baseTile + frame) & 0xffff,
          order: id
        });
      }
      continue;
    }
    if (!(type >= 0x178 && type <= 0x19f)) {
      continue;
    }
    const coord = decodePackedCoord(bytes[pos], bytes[pos + 1], bytes[pos + 2]);
    entries.push({
      id,
      x: coord.x & 0x3ff,
      y: coord.y & 0x3ff,
      z: coord.z & 0x0f,
      status,
      npcStatus,
      qual,
      type,
      frame,
      baseTile,
      tileId: (baseTile + frame) & 0xffff,
      order: id,
      source: "objlist"
    });
  }
  entries.sort((a, b) => a.order - b.order);
  assocEntries.sort((a, b) => a.order - b.order);
  return {
    entries,
    assocEntries,
    talkFlags: Array.from(bytes.slice(TALK_FLAGS_OFF, TALK_FLAGS_OFF + 0x100)),
    schedIndex: Array.from(bytes.slice(SCHED_INDEX_OFF, SCHED_INDEX_OFF + 0x100)),
    npcMode: Array.from(bytes.slice(NPC_MODE_OFF, NPC_MODE_OFF + 0x100)),
    npcComMode: Array.from(bytes.slice(NPC_COM_MODE_OFF, NPC_COM_MODE_OFF + 0x100)),
    movePts: Array.from(bytes.slice(MOVE_PTS_OFF, MOVE_PTS_OFF + 0x100)),
    leader: Array.from(bytes.slice(LEADER_OFF, LEADER_OFF + 0x100)),
    npcFlag: Array.from(bytes.slice(NPC_FLAG_OFF, NPC_FLAG_OFF + 0x100)),
    level: Array.from(bytes.slice(LEVEL_OFF, LEVEL_OFF + 0x100)),
    party: Array.from(bytes.slice(PARTY_OFF, PARTY_OFF + 0x10)),
    partySize: bytes[PARTY_SIZE_OFF] & 0xff,
    origShapeType: new Array(0x100).fill(0).map((_, idx) => dv.getUint16(ORIG_SHAPE_OFF + (idx * 2), true) >>> 0)
  };
}

export function loadNpcBaselineRuntime(runtimeDir: string): NpcBaselineRuntime {
  const baseTiles = loadBaseTileTable(runtimeDir);
  const objlistPath = path.join(runtimeDir, "savegame", "objlist");
  const objlist = new Uint8Array(fs.readFileSync(objlistPath));
  return parseObjlistNpcRuntime(objlist, baseTiles);
}

export function parseScheduleRuntime(bytes: Uint8Array): U6ScheduleTableRuntime {
  if (!(bytes instanceof Uint8Array) || bytes.length < ((0x100 + 1) * 2)) {
    throw new Error("schedule asset too small");
  }
  const npcOffsets = new Array(0x101).fill(0).map((_, idx) => parseU16LE(bytes, idx * 2));
  const entryCount = npcOffsets[0x100] >>> 0;
  const entries: U6ScheduleEntryRuntime[] = [];
  const baseOff = (0x100 + 1) * 2;
  const maxEntries = Math.min(entryCount, Math.floor((bytes.length - baseOff) / 5));
  for (let i = 0; i < maxEntries; i += 1) {
    const off = baseOff + (i * 5);
    const time = bytes[off] & 0xff;
    const action = bytes[off + 1] & 0xff;
    const xyzRaw = ((bytes[off + 2] & 0xff) | ((bytes[off + 3] & 0xff) << 8) | ((bytes[off + 4] & 0xff) << 16)) >>> 0;
    const coord = decodePackedCoord(bytes[off + 2], bytes[off + 3], bytes[off + 4]);
    entries.push({
      time,
      action,
      xyz_raw: xyzRaw,
      x: coord.x & 0x3ff,
      y: coord.y & 0x3ff,
      z: coord.z & 0x0f
    });
  }
  return {
    npcOffsets,
    entryCount: entries.length >>> 0,
    entries
  };
}

export function loadScheduleRuntime(runtimeDir: string): U6ScheduleTableRuntime {
  return parseScheduleRuntime(new Uint8Array(fs.readFileSync(path.join(runtimeDir, "schedule"))));
}

export function scheduleWeekdayRuntime(dateD: number): number {
  return (((Number(dateD) | 0) - 1) % 7 + 7) % 7 + 1;
}

export function selectScheduleEntryRuntime(
  schedule: U6ScheduleTableRuntime,
  npcId: number,
  clock: { time_h: number; date_d: number }
): { index: number; entry: U6ScheduleEntryRuntime } | null {
  const npc = Number(npcId) & 0xff;
  const start = Number(schedule?.npcOffsets?.[npc]) | 0;
  const end = (Number(schedule?.npcOffsets?.[npc + 1]) | 0) - 1;
  if (start < 0 || end < start) {
    return null;
  }
  const hour = Number(clock?.time_h) & 0x1f;
  const weekday = scheduleWeekdayRuntime(Number(clock?.date_d) | 0);
  for (let idx = end; idx >= start; idx -= 1) {
    const entry = schedule.entries[idx];
    if (!entry) continue;
    const time = Number(entry.time) & 0xff;
    const entryHour = time & 0x1f;
    const dayMask = (time >> 5) & 0x07;
    if (entryHour !== hour) continue;
    if (dayMask !== 0 && dayMask !== weekday) continue;
    return {
      index: idx - start,
      entry
    };
  }
  return null;
}

export function selectActiveScheduleEntryRuntime(
  schedule: U6ScheduleTableRuntime,
  npcId: number,
  clock: { time_h: number; date_d: number }
): { index: number; entry: U6ScheduleEntryRuntime } | null {
  const exact = selectScheduleEntryRuntime(schedule, npcId, clock);
  if (exact) {
    return exact;
  }
  const npc = Number(npcId) & 0xff;
  const start = Number(schedule?.npcOffsets?.[npc]) | 0;
  const end = (Number(schedule?.npcOffsets?.[npc + 1]) | 0) - 1;
  if (start < 0 || end < start) {
    return null;
  }
  const hour = Number(clock?.time_h) & 0x1f;
  const weekday = scheduleWeekdayRuntime(Number(clock?.date_d) | 0);
  let fallback: { index: number; entry: U6ScheduleEntryRuntime } | null = null;
  for (let idx = end; idx >= start; idx -= 1) {
    const entry = schedule.entries[idx];
    if (!entry) continue;
    const time = Number(entry.time) & 0xff;
    const entryHour = time & 0x1f;
    const dayMask = (time >> 5) & 0x07;
    if (dayMask !== 0 && dayMask !== weekday) continue;
    if (entryHour <= hour) {
      return {
        index: idx - start,
        entry
      };
    }
    if (!fallback) {
      fallback = {
        index: idx - start,
        entry
      };
    }
  }
  return fallback;
}

function hasScheduleForNpc(schedule: U6ScheduleTableRuntime, npcId: number): boolean {
  const npc = Number(npcId) & 0xff;
  const start = Number(schedule?.npcOffsets?.[npc]) | 0;
  const end = Number(schedule?.npcOffsets?.[npc + 1]) | 0;
  return start >= 0 && end > start && end <= Number(schedule?.entryCount || 0);
}

function scheduleDirectionForAction(action: number, currentX: number, currentY: number, targetX: number, targetY: number): number {
  const a = Number(action) & 0xff;
  if (a >= AI_STAND_N && a <= AI_GUARD_W) {
    return (((a - AI_STAND_N) & 0x03) << 1) & 0x07;
  }
  const dx = (Number(targetX) | 0) - (Number(currentX) | 0);
  const dy = (Number(targetY) | 0) - (Number(currentY) | 0);
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 2 : 6;
  if (dy !== 0) return dy > 0 ? 4 : 0;
  return 4;
}

function schedulePoseForAction(action: number, atTarget: boolean): ScheduledNpcStateRuntime["pose"] {
  if (!atTarget) return "walk";
  switch (Number(action) & 0xff) {
    case AI_SLEEP: return "sleep";
    case AI_SIT: return "sit";
    case AI_EAT: return "eat";
    case AI_PLAY: return "play";
    default: return "stand";
  }
}

function makeStepProbe(state: ScheduledNpcStateRuntime, x: number, y: number): ScheduledNpcStepRuntime {
  return {
    npc_id: state.npc_id | 0,
    from_x: state.x | 0,
    from_y: state.y | 0,
    from_z: state.z | 0,
    to_x: x | 0,
    to_y: y | 0,
    to_z: state.z | 0,
    target_x: state.target_x | 0,
    target_y: state.target_y | 0,
    target_z: state.target_z | 0,
    action: state.action & 0xff
  };
}

function findCollisionAwareNextStep(
  state: ScheduledNpcStateRuntime,
  canStep: ((step: ScheduledNpcStepRuntime) => boolean) | null
): { x: number; y: number } | null {
  const startX = state.x | 0;
  const startY = state.y | 0;
  const targetX = state.target_x | 0;
  const targetY = state.target_y | 0;
  if (!canStep) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      return { x: startX + (dx > 0 ? 1 : -1), y: startY };
    }
    if (dy !== 0) {
      return { x: startX, y: startY + (dy > 0 ? 1 : -1) };
    }
    return null;
  }

  const key = (x: number, y: number) => `${x | 0},${y | 0}`;
  const maxRadius = 32;
  const startKey = key(startX, startY);
  const cameFrom = new Map<string, string>();
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  cameFrom.set(startKey, "");
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  let foundKey: string | null = null;
  for (let qi = 0; qi < queue.length; qi += 1) {
    const cur = queue[qi];
    if ((cur.x | 0) === targetX && (cur.y | 0) === targetY) {
      foundKey = key(cur.x, cur.y);
      break;
    }
    for (const d of dirs) {
      const nx = (cur.x + d.x) | 0;
      const ny = (cur.y + d.y) | 0;
      if (Math.abs(nx - startX) > maxRadius || Math.abs(ny - startY) > maxRadius) {
        continue;
      }
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) {
        continue;
      }
      if (!canStep(makeStepProbe(state, nx, ny))) {
        continue;
      }
      cameFrom.set(nk, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  if (!foundKey) {
    return null;
  }
  let stepKey = foundKey;
  let prevKey = cameFrom.get(stepKey) || "";
  while (prevKey && prevKey !== startKey) {
    stepKey = prevKey;
    prevKey = cameFrom.get(stepKey) || "";
  }
  const [xRaw, yRaw] = stepKey.split(",");
  return { x: Number(xRaw) | 0, y: Number(yRaw) | 0 };
}

function makeScheduledNpcState(
  base: NpcRenderableEntry,
  selected: { index: number; entry: U6ScheduleEntryRuntime },
  previous: ScheduledNpcStateRuntime | null,
  clock: { time_h: number; date_d: number }
): ScheduledNpcStateRuntime {
  const prev = previous && Number(previous.npc_id) === Number(base.id) ? previous : null;
  const action = Number(selected.entry.action) & 0xff;
  const changed = !prev
    || Number(prev.schedule_index) !== Number(selected.index)
    || Number(prev.action) !== action
    || Number(prev.target_x) !== (selected.entry.x | 0)
    || Number(prev.target_y) !== (selected.entry.y | 0)
    || Number(prev.target_z) !== (selected.entry.z | 0);
  const x = changed ? (prev ? (prev.x | 0) : (selected.entry.x | 0)) : (prev.x | 0);
  const y = changed ? (prev ? (prev.y | 0) : (selected.entry.y | 0)) : (prev.y | 0);
  const z = changed ? (prev ? (prev.z | 0) : (selected.entry.z | 0)) : (prev.z | 0);
  const atTarget = x === (selected.entry.x | 0) && y === (selected.entry.y | 0) && z === (selected.entry.z | 0);
  const unsupported = UNSUPPORTED_ACTIONS.has(action);
  return {
    npc_id: Number(base.id) | 0,
    x,
    y,
    z,
    target_x: selected.entry.x | 0,
    target_y: selected.entry.y | 0,
    target_z: selected.entry.z | 0,
    action,
    mode: atTarget ? action : AI_FINDPATH,
    direction: scheduleDirectionForAction(action, x, y, selected.entry.x, selected.entry.y),
    pose: schedulePoseForAction(action, atTarget),
    schedule_index: selected.index & 0xff,
    source: "schedule",
    path_status: unsupported ? "unsupported" : (atTarget ? "idle" : "walking"),
    unsupported_action: unsupported,
    last_schedule_hour: Number(clock?.time_h) & 0x1f,
    last_schedule_date_d: Number(clock?.date_d) | 0
  };
}

function stepScheduledNpc(
  state: ScheduledNpcStateRuntime,
  tick: number,
  options: ScheduledNpcBuildOptionsRuntime = {}
): ScheduledNpcStateRuntime {
  if ((Number(tick) % SCHEDULE_MOVE_TICK_INTERVAL) !== 0) {
    return state;
  }
  if (state.unsupported_action) {
    return { ...state, path_status: "unsupported" };
  }
  if ((state.x | 0) === (state.target_x | 0) && (state.y | 0) === (state.target_y | 0) && (state.z | 0) === (state.target_z | 0)) {
    return {
      ...state,
      mode: state.action & 0xff,
      pose: schedulePoseForAction(state.action, true),
      path_status: "idle"
    };
  }
  if ((state.z | 0) !== (state.target_z | 0)) {
    return {
      ...state,
      x: state.target_x | 0,
      y: state.target_y | 0,
      z: state.target_z | 0,
      direction: scheduleDirectionForAction(state.action, state.x, state.y, state.target_x, state.target_y),
      mode: state.action & 0xff,
      pose: schedulePoseForAction(state.action, true),
      path_status: "idle"
    };
  }
  const canStep = typeof options.canStep === "function" ? options.canStep : null;
  const next = findCollisionAwareNextStep(state, canStep);
  if (!next) {
    return {
      ...state,
      direction: scheduleDirectionForAction(state.action, state.x, state.y, state.target_x, state.target_y),
      mode: AI_FINDPATH,
      pose: "walk",
      path_status: "blocked"
    };
  }
  const x = next.x | 0;
  const y = next.y | 0;
  const atTarget = x === (state.target_x | 0) && y === (state.target_y | 0) && (state.z | 0) === (state.target_z | 0);
  return {
    ...state,
    x: x & 0x3ff,
    y: y & 0x3ff,
    direction: scheduleDirectionForAction(state.action, x, y, state.target_x, state.target_y),
    mode: atTarget ? (state.action & 0xff) : AI_FINDPATH,
    pose: schedulePoseForAction(state.action, atTarget),
    path_status: atTarget ? "idle" : "walking"
  };
}

export function buildScheduledNpcStatesRuntime(
  baseline: NpcBaselineRuntime,
  schedule: U6ScheduleTableRuntime,
  clock: { time_h: number; date_d: number; tick: number },
  previous: ScheduledNpcStateRuntime[] = [],
  elapsedTicks = 0,
  options: ScheduledNpcBuildOptionsRuntime = {}
): ScheduledNpcStateRuntime[] {
  const prevById = new Map<number, ScheduledNpcStateRuntime>();
  for (const row of Array.isArray(previous) ? previous : []) {
    prevById.set(Number(row.npc_id) | 0, row);
  }
  const partyIds = new Set<number>();
  const partySize = Math.max(0, Math.min(Number(baseline?.partySize) | 0, Array.isArray(baseline?.party) ? baseline.party.length : 0));
  for (let i = 0; i < partySize; i += 1) {
    partyIds.add(Number(baseline.party[i]) & 0xff);
  }
  const out: ScheduledNpcStateRuntime[] = [];
  for (const base of baseline.entries) {
    const npcId = Number(base.id) & 0xff;
    if (npcId < 2 || npcId >= 0xe0) continue;
    if (npcId >= 188 && npcId <= 200) continue;
    if (partyIds.has(npcId)) continue;
    if (!hasScheduleForNpc(schedule, npcId)) continue;
    const selected = selectScheduleEntryRuntime(schedule, npcId, clock)
      || (prevById.has(npcId) ? null : selectActiveScheduleEntryRuntime(schedule, npcId, clock));
    if (!selected && prevById.has(npcId)) {
      out.push(prevById.get(npcId)!);
      continue;
    }
    if (!selected) continue;
    let row = makeScheduledNpcState(base, selected, prevById.get(npcId) || null, clock);
    const ticks = Math.max(0, Math.min(Number(elapsedTicks) | 0, 200));
    for (let i = 0; i < ticks; i += 1) {
      row = stepScheduledNpc(row, (Number(clock?.tick) - ticks + i + 1) >>> 0, options);
    }
    out.push(row);
  }
  out.sort((a, b) => (a.npc_id | 0) - (b.npc_id | 0));
  return out;
}

export function buildCastlePilotNpcOverrides(
  baseline: NpcBaselineRuntime,
  schedule: U6ScheduleTableRuntime,
  clock: { time_h: number; date_d: number; tick: number }
): CastlePilotNpcOverrideRuntime[] {
  const out: CastlePilotNpcOverrideRuntime[] = [];
  const byId = new Map<number, NpcRenderableEntry>();
  for (const entry of baseline.entries) {
    byId.set(Number(entry.id) | 0, entry);
  }
  for (const npcId of CASTLE_PILOT_NPC_IDS) {
    const base = byId.get(Number(npcId) | 0);
    if (!base) continue;
    const selected = selectScheduleEntryRuntime(schedule, npcId, clock);
    if (!selected) {
      out.push({
        npc_id: npcId,
        x: base.x | 0,
        y: base.y | 0,
        z: base.z | 0,
        action: Number(baseline.npcMode[npcId] || 0) & 0xff,
        schedule_index: Number(baseline.schedIndex[npcId] || 0) & 0xff,
        source: "objlist"
      });
      continue;
    }
    out.push({
      npc_id: npcId,
      x: selected.entry.x | 0,
      y: selected.entry.y | 0,
      z: selected.entry.z | 0,
      action: Number(selected.entry.action) & 0xff,
      schedule_index: selected.index & 0xff,
      source: "schedule"
    });
  }
  return out;
}

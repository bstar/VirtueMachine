import fs from "node:fs";
import path from "node:path";

const OBJ_COORD_USE_LOCXYZ = 0x00;
const OBJ_COORD_USE_EQUIP = 0x18;

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

export function buildCastlePilotNpcOverrides(
  baseline: NpcBaselineRuntime,
  schedule: U6ScheduleTableRuntime,
  clock: { time_h: number; date_d: number; tick: number }
): Array<Record<string, unknown>> {
  const out = [];
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

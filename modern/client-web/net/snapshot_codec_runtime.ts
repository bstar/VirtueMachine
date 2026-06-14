export interface SnapshotWorldRuntime {
  is_on_quest?: number;
  next_sleep?: number;
  time_m?: number;
  time_h?: number;
  date_d?: number;
  date_m?: number;
  date_y?: number;
  wind_dir?: number;
  active?: number;
  map_x?: number;
  map_y?: number;
  map_z?: number;
  in_combat?: number;
  sound_enabled?: number;
}

export interface SnapshotWorldObjectRuntime {
  x?: number;
  y?: number;
  z?: number;
  type?: number;
  frame?: number;
  order?: number;
  renderable?: boolean;
  sourceKind?: string;
}

export interface SnapshotAnchorRuntime {
  x: number;
  y: number;
  z: number;
  order: number;
  type: number;
}

export interface SimSnapshotRuntime {
  tick: number;
  rngState: number;
  worldFlags: number;
  commandsApplied: number;
  doorOpenStates: Record<string, number | boolean>;
  removedObjectKeys: Record<string, number>;
  removedObjectAtTick: Record<string, number>;
  removedObjectCount: number;
  inventory: Record<string, number>;
  spawnedWorldObjects: SnapshotWorldObjectRuntime[];
  spawnedWorldSeq: number;
  partyMembers: number[];
  avatarPose: string;
  avatarPoseSetTick: number;
  avatarPoseAnchor: SnapshotAnchorRuntime | null;
  world: Required<SnapshotWorldRuntime>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function cloneSimStateRuntime(sim: SimSnapshotRuntime): SimSnapshotRuntime {
  return {
    tick: sim.tick >>> 0,
    rngState: sim.rngState >>> 0,
    worldFlags: sim.worldFlags >>> 0,
    commandsApplied: sim.commandsApplied >>> 0,
    doorOpenStates: { ...(sim.doorOpenStates ?? {}) },
    removedObjectKeys: { ...(sim.removedObjectKeys ?? {}) },
    removedObjectAtTick: { ...(sim.removedObjectAtTick ?? {}) },
    removedObjectCount: Number(sim.removedObjectCount) >>> 0,
    inventory: { ...(sim.inventory ?? {}) },
    spawnedWorldObjects: Array.isArray(sim.spawnedWorldObjects)
      ? sim.spawnedWorldObjects.map((o) => ({ ...o }))
      : [],
    spawnedWorldSeq: Number(sim.spawnedWorldSeq) >>> 0,
    partyMembers: Array.isArray(sim.partyMembers)
      ? sim.partyMembers.map((id) => Number(id) >>> 0).filter((id) => id > 0).slice(0, 10)
      : [1],
    avatarPose: String(sim.avatarPose || "stand"),
    avatarPoseSetTick: Number(sim.avatarPoseSetTick) | 0,
    avatarPoseAnchor: sim.avatarPoseAnchor ? { ...sim.avatarPoseAnchor } : null,
    world: { ...sim.world }
  };
}

export function normalizeLoadedSimStateRuntime(candidate: unknown): SimSnapshotRuntime | null {
  const src = asRecord(candidate);
  if (!src) {
    return null;
  }
  const world = asRecord(src.world);
  if (!world) {
    return null;
  }
  const normalizedInventory: Record<string, number> = {};
  for (const [k, v] of Object.entries(asRecord(src.inventory) ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedInventory[key] = Number(v) >>> 0;
  }
  const normalizedDoorOpenStates: Record<string, number> = {};
  for (const [k, v] of Object.entries(asRecord(src.doorOpenStates) ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedDoorOpenStates[key] = Number(v) ? 1 : 0;
  }
  const normalizedRemoved: Record<string, number> = {};
  for (const [k, v] of Object.entries(asRecord(src.removedObjectKeys) ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemoved[key] = Number(v) ? 1 : 0;
  }
  const normalizedRemovedAtTick: Record<string, number> = {};
  for (const [k, v] of Object.entries(asRecord(src.removedObjectAtTick) ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemovedAtTick[key] = Number(v) >>> 0;
  }
  const snapshotTick = Number(src.tick) >>> 0;
  for (const key of Object.keys(normalizedRemoved)) {
    if (!Object.prototype.hasOwnProperty.call(normalizedRemovedAtTick, key)) {
      normalizedRemovedAtTick[key] = snapshotTick;
    }
  }
  const removedObjectCount = Number(src.removedObjectCount) >>> 0;
  const normalizedRemovedCount = removedObjectCount > 0
    ? removedObjectCount
    : Object.keys(normalizedRemoved).length;
  const normalizedSpawned = Array.isArray(src.spawnedWorldObjects)
    ? src.spawnedWorldObjects.map((value) => {
      const o = asRecord(value) ?? {};
      return {
        x: Number(o.x) | 0,
        y: Number(o.y) | 0,
        z: Number(o.z) | 0,
        type: Number(o.type) & 0x03ff,
        frame: Number(o.frame) & 0x3f,
        order: Number(o.order) | 0,
        renderable: !!o.renderable,
        sourceKind: String(o.sourceKind || "runtime")
      };
    })
    : [];
  const normalizedPartyMembers = Array.isArray(src.partyMembers)
    ? src.partyMembers.map((id) => Number(id) >>> 0).filter((id) => id > 0).slice(0, 10)
    : [];
  const avatarPoseAnchor = asRecord(src.avatarPoseAnchor);
  return {
    tick: Number(src.tick) >>> 0,
    rngState: Number(src.rngState) >>> 0,
    worldFlags: Number(src.worldFlags) >>> 0,
    commandsApplied: Number(src.commandsApplied) >>> 0,
    doorOpenStates: normalizedDoorOpenStates,
    removedObjectKeys: normalizedRemoved,
    removedObjectAtTick: normalizedRemovedAtTick,
    removedObjectCount: normalizedRemovedCount >>> 0,
    inventory: normalizedInventory,
    spawnedWorldObjects: normalizedSpawned,
    spawnedWorldSeq: Number(src.spawnedWorldSeq) >>> 0,
    partyMembers: normalizedPartyMembers.length ? normalizedPartyMembers : [1],
    avatarPose: (src.avatarPose === "sit" || src.avatarPose === "sleep")
      ? String(src.avatarPose)
      : "stand",
    avatarPoseSetTick: Number.isFinite(Number(src.avatarPoseSetTick))
      ? (Number(src.avatarPoseSetTick) | 0)
      : -1,
    avatarPoseAnchor: avatarPoseAnchor
      ? {
        x: Number(avatarPoseAnchor.x) | 0,
        y: Number(avatarPoseAnchor.y) | 0,
        z: Number(avatarPoseAnchor.z) | 0,
        order: Number(avatarPoseAnchor.order) | 0,
        type: Number(avatarPoseAnchor.type) | 0
      }
      : null,
    world: {
      is_on_quest: Number(world.is_on_quest) >>> 0,
      next_sleep: Number(world.next_sleep) >>> 0,
      time_m: Number(world.time_m) >>> 0,
      time_h: Number(world.time_h) >>> 0,
      date_d: Number(world.date_d) >>> 0,
      date_m: Number(world.date_m) >>> 0,
      date_y: Number(world.date_y) >>> 0,
      wind_dir: Number(world.wind_dir) | 0,
      active: Number(world.active) >>> 0,
      map_x: Number(world.map_x) | 0,
      map_y: Number(world.map_y) | 0,
      map_z: Number(world.map_z) | 0,
      in_combat: Number(world.in_combat) >>> 0,
      sound_enabled: Number(world.sound_enabled) >>> 0
    }
  };
}

export function encodeSimSnapshotBase64Runtime(sim: SimSnapshotRuntime): string {
  const raw = JSON.stringify(cloneSimStateRuntime(sim));
  return btoa(unescape(encodeURIComponent(raw)));
}

export function decodeSimSnapshotBase64Runtime(snapshotBase64: string): SimSnapshotRuntime | null {
  const raw = decodeURIComponent(escape(atob(String(snapshotBase64 || ""))));
  return normalizeLoadedSimStateRuntime(JSON.parse(raw));
}

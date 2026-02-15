export function cloneSimStateRuntime(sim: any): any {
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
      ? sim.spawnedWorldObjects.map((o: any) => ({ ...o }))
      : [],
    spawnedWorldSeq: Number(sim.spawnedWorldSeq) >>> 0,
    avatarPose: String(sim.avatarPose || "stand"),
    avatarPoseSetTick: Number(sim.avatarPoseSetTick) | 0,
    avatarPoseAnchor: sim.avatarPoseAnchor ? { ...sim.avatarPoseAnchor } : null,
    world: { ...sim.world }
  };
}

export function normalizeLoadedSimStateRuntime(candidate: any): any | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  if (!candidate.world || typeof candidate.world !== "object") {
    return null;
  }
  const normalizedInventory: Record<string, number> = {};
  for (const [k, v] of Object.entries(candidate.inventory ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedInventory[key] = Number(v) >>> 0;
  }
  const normalizedRemoved: Record<string, number> = {};
  for (const [k, v] of Object.entries(candidate.removedObjectKeys ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemoved[key] = Number(v) ? 1 : 0;
  }
  const normalizedRemovedAtTick: Record<string, number> = {};
  for (const [k, v] of Object.entries(candidate.removedObjectAtTick ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemovedAtTick[key] = Number(v) >>> 0;
  }
  const snapshotTick = Number(candidate.tick) >>> 0;
  for (const key of Object.keys(normalizedRemoved)) {
    if (!Object.prototype.hasOwnProperty.call(normalizedRemovedAtTick, key)) {
      normalizedRemovedAtTick[key] = snapshotTick;
    }
  }
  const removedObjectCount = Number(candidate.removedObjectCount) >>> 0;
  const normalizedRemovedCount = removedObjectCount > 0
    ? removedObjectCount
    : Object.keys(normalizedRemoved).length;
  const normalizedSpawned = Array.isArray(candidate.spawnedWorldObjects)
    ? candidate.spawnedWorldObjects.map((o: any) => ({
      x: Number(o?.x) | 0,
      y: Number(o?.y) | 0,
      z: Number(o?.z) | 0,
      type: Number(o?.type) & 0x03ff,
      frame: Number(o?.frame) & 0x3f,
      order: Number(o?.order) | 0,
      renderable: !!o?.renderable,
      sourceKind: String(o?.sourceKind || "runtime")
    }))
    : [];
  return {
    tick: Number(candidate.tick) >>> 0,
    rngState: Number(candidate.rngState) >>> 0,
    worldFlags: Number(candidate.worldFlags) >>> 0,
    commandsApplied: Number(candidate.commandsApplied) >>> 0,
    doorOpenStates: { ...(candidate.doorOpenStates ?? {}) },
    removedObjectKeys: normalizedRemoved,
    removedObjectAtTick: normalizedRemovedAtTick,
    removedObjectCount: normalizedRemovedCount >>> 0,
    inventory: normalizedInventory,
    spawnedWorldObjects: normalizedSpawned,
    spawnedWorldSeq: Number(candidate.spawnedWorldSeq) >>> 0,
    avatarPose: (candidate.avatarPose === "sit" || candidate.avatarPose === "sleep")
      ? candidate.avatarPose
      : "stand",
    avatarPoseSetTick: Number.isFinite(Number(candidate.avatarPoseSetTick))
      ? (Number(candidate.avatarPoseSetTick) | 0)
      : -1,
    avatarPoseAnchor: candidate.avatarPoseAnchor && typeof candidate.avatarPoseAnchor === "object"
      ? {
        x: Number(candidate.avatarPoseAnchor.x) | 0,
        y: Number(candidate.avatarPoseAnchor.y) | 0,
        z: Number(candidate.avatarPoseAnchor.z) | 0,
        order: Number(candidate.avatarPoseAnchor.order) | 0,
        type: Number(candidate.avatarPoseAnchor.type) | 0
      }
      : null,
    world: {
      is_on_quest: Number(candidate.world.is_on_quest) >>> 0,
      next_sleep: Number(candidate.world.next_sleep) >>> 0,
      time_m: Number(candidate.world.time_m) >>> 0,
      time_h: Number(candidate.world.time_h) >>> 0,
      date_d: Number(candidate.world.date_d) >>> 0,
      date_m: Number(candidate.world.date_m) >>> 0,
      date_y: Number(candidate.world.date_y) >>> 0,
      wind_dir: Number(candidate.world.wind_dir) | 0,
      active: Number(candidate.world.active) >>> 0,
      map_x: Number(candidate.world.map_x) | 0,
      map_y: Number(candidate.world.map_y) | 0,
      map_z: Number(candidate.world.map_z) | 0,
      in_combat: Number(candidate.world.in_combat) >>> 0,
      sound_enabled: Number(candidate.world.sound_enabled) >>> 0
    }
  };
}

export function encodeSimSnapshotBase64Runtime(sim: any): string {
  const raw = JSON.stringify(cloneSimStateRuntime(sim));
  return btoa(unescape(encodeURIComponent(raw)));
}

export function decodeSimSnapshotBase64Runtime(snapshotBase64: string): any | null {
  const raw = decodeURIComponent(escape(atob(String(snapshotBase64 || ""))));
  return normalizeLoadedSimStateRuntime(JSON.parse(raw));
}

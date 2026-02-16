type HashCtx = {
  offset: bigint;
  prime: bigint;
  mask: bigint;
};

export function hashMixU32Runtime(h: bigint, value: number, ctx: HashCtx): bigint {
  const mixed = (h ^ BigInt(value >>> 0)) * ctx.prime;
  return mixed & ctx.mask;
}

export function asU32SignedRuntime(value: number): number {
  return (value | 0) >>> 0;
}

export function simStateHashRuntime(sim: any, ctx: HashCtx): bigint {
  let h = ctx.offset;
  h = hashMixU32Runtime(h, sim.tick, ctx);
  h = hashMixU32Runtime(h, sim.rngState, ctx);
  h = hashMixU32Runtime(h, sim.worldFlags, ctx);
  h = hashMixU32Runtime(h, sim.commandsApplied, ctx);
  h = hashMixU32Runtime(h, sim.world.is_on_quest, ctx);
  h = hashMixU32Runtime(h, sim.world.next_sleep, ctx);
  h = hashMixU32Runtime(h, sim.world.time_m, ctx);
  h = hashMixU32Runtime(h, sim.world.time_h, ctx);
  h = hashMixU32Runtime(h, sim.world.date_d, ctx);
  h = hashMixU32Runtime(h, sim.world.date_m, ctx);
  h = hashMixU32Runtime(h, sim.world.date_y, ctx);
  h = hashMixU32Runtime(h, asU32SignedRuntime(sim.world.wind_dir), ctx);
  h = hashMixU32Runtime(h, sim.world.active, ctx);
  h = hashMixU32Runtime(h, asU32SignedRuntime(sim.world.map_x), ctx);
  h = hashMixU32Runtime(h, asU32SignedRuntime(sim.world.map_y), ctx);
  h = hashMixU32Runtime(h, asU32SignedRuntime(sim.world.map_z), ctx);
  h = hashMixU32Runtime(h, sim.world.in_combat, ctx);
  h = hashMixU32Runtime(h, sim.world.sound_enabled, ctx);
  const avatarPose = sim.avatarPose === "sleep" ? 2 : (sim.avatarPose === "sit" ? 1 : 0);
  h = hashMixU32Runtime(h, avatarPose, ctx);
  if (sim.avatarPoseAnchor) {
    h = hashMixU32Runtime(h, 1, ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(sim.avatarPoseAnchor.x), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(sim.avatarPoseAnchor.y), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(sim.avatarPoseAnchor.z), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(sim.avatarPoseAnchor.order), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(sim.avatarPoseAnchor.type), ctx);
  } else {
    h = hashMixU32Runtime(h, 0, ctx);
  }
  const doorKeys = Object.keys(sim.doorOpenStates ?? {}).sort();
  h = hashMixU32Runtime(h, doorKeys.length, ctx);
  for (const k of doorKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32Runtime(h, k.charCodeAt(i), ctx);
    }
    h = hashMixU32Runtime(h, sim.doorOpenStates[k] ? 1 : 0, ctx);
  }
  const removedKeys = Object.keys(sim.removedObjectKeys ?? {}).sort();
  h = hashMixU32Runtime(h, removedKeys.length, ctx);
  for (const k of removedKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32Runtime(h, k.charCodeAt(i), ctx);
    }
    h = hashMixU32Runtime(h, sim.removedObjectKeys[k] ? 1 : 0, ctx);
  }
  const removedAtTick = sim.removedObjectAtTick ?? {};
  h = hashMixU32Runtime(h, removedKeys.length, ctx);
  for (const k of removedKeys) {
    h = hashMixU32Runtime(h, Number(removedAtTick[k]) >>> 0, ctx);
  }
  h = hashMixU32Runtime(h, Number(sim.removedObjectCount) >>> 0, ctx);
  const inventoryKeys = Object.keys(sim.inventory ?? {}).sort();
  h = hashMixU32Runtime(h, inventoryKeys.length, ctx);
  for (const k of inventoryKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32Runtime(h, k.charCodeAt(i), ctx);
    }
    h = hashMixU32Runtime(h, Number(sim.inventory[k]) >>> 0, ctx);
  }
  const spawned = Array.isArray(sim.spawnedWorldObjects) ? sim.spawnedWorldObjects : [];
  h = hashMixU32Runtime(h, spawned.length, ctx);
  for (const o of spawned) {
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.x), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.y), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.z), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.type), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.frame), ctx);
    h = hashMixU32Runtime(h, asU32SignedRuntime(o?.order), ctx);
  }
  h = hashMixU32Runtime(h, Number(sim.spawnedWorldSeq) >>> 0, ctx);
  return h;
}

export function hashHexRuntime(hashValue: bigint): string {
  return hashValue.toString(16).padStart(16, "0");
}

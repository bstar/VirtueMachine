export function objectAnchorKeyRuntime(obj: {
  x: number;
  y: number;
  z: number;
  order: number;
  type: number;
}): string {
  return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff},${obj.type & 0x3ff}`;
}

export function isObjectRemovedRuntime(sim: any, obj: any): boolean {
  if (!sim || !obj) {
    return false;
  }
  return !!(sim.removedObjectKeys && sim.removedObjectKeys[objectAnchorKeyRuntime(obj)]);
}

export function markObjectRemovedRuntime(sim: any, obj: any): void {
  if (!sim || !obj) {
    return;
  }
  if (!sim.removedObjectKeys) {
    sim.removedObjectKeys = {};
  }
  if (!sim.removedObjectAtTick) {
    sim.removedObjectAtTick = {};
  }
  const key = objectAnchorKeyRuntime(obj);
  if (!sim.removedObjectKeys[key]) {
    sim.removedObjectKeys[key] = 1;
    sim.removedObjectAtTick[key] = Number(sim.tick) >>> 0;
    sim.removedObjectCount = (Number(sim.removedObjectCount) + 1) >>> 0;
  }
}

export function inventoryKeyForObjectRuntime(obj: { type: number; frame: number }): string {
  const typeHex = (obj.type & 0x3ff).toString(16).padStart(3, "0");
  const frameHex = (obj.frame & 0x3f).toString(16).padStart(2, "0");
  return `0x${typeHex}:0x${frameHex}`;
}

export function addObjectToInventoryRuntime(sim: any, obj: { type: number; frame: number }): string {
  if (!sim.inventory) {
    sim.inventory = {};
  }
  const key = inventoryKeyForObjectRuntime(obj);
  const prev = Number(sim.inventory[key]) >>> 0;
  sim.inventory[key] = (prev + 1) >>> 0;
  return key;
}

export function firstInventoryKeyRuntime(sim: any): string {
  const inv = sim && sim.inventory ? sim.inventory : null;
  if (!inv) {
    return "";
  }
  for (const [key, countRaw] of Object.entries(inv)) {
    const count = Number(countRaw) >>> 0;
    if (!key || count <= 0) {
      continue;
    }
    return String(key);
  }
  return "";
}

export function decrementInventoryKeyRuntime(sim: any, key: string): number {
  if (!sim || !sim.inventory || !key) {
    return 0;
  }
  const prev = Number(sim.inventory[key]) >>> 0;
  if (prev <= 1) {
    delete sim.inventory[key];
    return 0;
  }
  const next = (prev - 1) >>> 0;
  sim.inventory[key] = next;
  return next;
}

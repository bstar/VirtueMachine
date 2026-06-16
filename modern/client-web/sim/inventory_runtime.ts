export interface InventoryObjectRuntime {
  x?: number;
  y?: number;
  z?: number;
  order?: number;
  type: number;
  frame?: number;
}

export interface SimInventoryRuntimeState {
  tick?: number;
  inventory?: Record<string, number>;
  removedObjectKeys?: Record<string, number>;
  removedObjectAtTick?: Record<string, number>;
  removedObjectCount?: number;
}

export type InventoryPickupRuntimeResult = {
  count: number;
  inventoryKey: string;
};

export function objectAnchorKeyRuntime(obj: InventoryObjectRuntime): string {
  return `${Number(obj.x) & 0x3ff},${Number(obj.y) & 0x3ff},${Number(obj.z) & 0x0f},${Number(obj.order) & 0xffff},${Number(obj.type) & 0x3ff}`;
}

export function isObjectRemovedRuntime(
  sim: SimInventoryRuntimeState | null | undefined,
  obj: InventoryObjectRuntime | null | undefined
): boolean {
  if (!sim || !obj) {
    return false;
  }
  return !!(sim.removedObjectKeys && sim.removedObjectKeys[objectAnchorKeyRuntime(obj)]);
}

export function markObjectRemovedRuntime(
  sim: SimInventoryRuntimeState | null | undefined,
  obj: InventoryObjectRuntime | null | undefined
): void {
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
    sim.removedObjectCount = ((Number(sim.removedObjectCount) || 0) + 1) >>> 0;
  }
}

export function inventoryKeyForObjectRuntime(obj: { type: number; frame: number }): string {
  const typeHex = (obj.type & 0x3ff).toString(16).padStart(3, "0");
  const frameHex = (obj.frame & 0x3f).toString(16).padStart(2, "0");
  return `0x${typeHex}:0x${frameHex}`;
}

export function addObjectToInventoryRuntime(sim: SimInventoryRuntimeState, obj: { type: number; frame: number }): string {
  if (!sim.inventory) {
    sim.inventory = {};
  }
  const key = inventoryKeyForObjectRuntime(obj);
  const prev = Number(sim.inventory[key]) >>> 0;
  sim.inventory[key] = (prev + 1) >>> 0;
  return key;
}

export function pickObjectIntoInventoryRuntime(
  sim: SimInventoryRuntimeState,
  inventoryObject: { type: number; frame: number },
  removedObject: InventoryObjectRuntime | null | undefined = inventoryObject as InventoryObjectRuntime
): InventoryPickupRuntimeResult {
  const inventoryKey = addObjectToInventoryRuntime(sim, inventoryObject);
  markObjectRemovedRuntime(sim, removedObject);
  return {
    count: Number(sim.inventory?.[inventoryKey]) >>> 0,
    inventoryKey
  };
}

export function resolveObjectByInventoryAnchorRuntime<TObject extends InventoryObjectRuntime>(args: {
  anchor: InventoryObjectRuntime | null | undefined;
  objectsAt: (x: number, y: number, z: number) => readonly TObject[];
  isBedObject?: (obj: InventoryObjectRuntime | null | undefined) => boolean;
  isChairObject?: (obj: InventoryObjectRuntime | null | undefined) => boolean;
}): TObject | null {
  const anchor = args.anchor;
  if (!anchor) {
    return null;
  }
  const overlays = args.objectsAt(
    Number(anchor.x) | 0,
    Number(anchor.y) | 0,
    Number(anchor.z) | 0
  );
  let typeMatch: TObject | null = null;
  const anchorOrder = Number(anchor.order) | 0;
  const anchorType = Number(anchor.type) | 0;
  for (const obj of overlays) {
    if ((Number(obj.order) | 0) === anchorOrder && (Number(obj.type) | 0) === anchorType) {
      return obj;
    }
    if (!typeMatch && (Number(obj.type) | 0) === anchorType) {
      typeMatch = obj;
    }
  }
  /*
    Canonical object order can drift after assoc/overlay normalization. Keep anchor
    resolution stable by falling back to same-cell/same-type when order no longer matches.
  */
  if (typeMatch) {
    return typeMatch;
  }
  const anchorIsFurniture = !!(
    args.isChairObject?.(anchor) ||
    args.isBedObject?.(anchor)
  );
  if (anchorIsFurniture) {
    for (const obj of overlays) {
      if (args.isChairObject?.(obj) || args.isBedObject?.(obj)) {
        return obj;
      }
    }
  }
  return null;
}

export function firstInventoryKeyRuntime(sim: SimInventoryRuntimeState | null | undefined): string {
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

export function decrementInventoryKeyRuntime(sim: SimInventoryRuntimeState | null | undefined, key: string): number {
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

const CLOSEABLE_DOOR_TYPES = new Set([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);

export function isCloseableDoorTypeRuntime(type: number): boolean {
  return CLOSEABLE_DOOR_TYPES.has(type & 0x03ff);
}

export function doorStateKeyRuntime(obj: { x: number; y: number; z: number; order: number }): string {
  return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff}`;
}

export function doorToggleMaskRuntime(type: number): number {
  return (type & 0x03ff) === 0x14e ? 1 : 4;
}

export function isDoorToggledRuntime(
  sim: { doorOpenStates?: Record<string, number> },
  obj: { type: number; x: number; y: number; z: number; order: number }
): boolean {
  if (!isCloseableDoorTypeRuntime(obj.type)) {
    return false;
  }
  return !!(sim.doorOpenStates && sim.doorOpenStates[doorStateKeyRuntime(obj)]);
}

export function toggleDoorStateRuntime(
  sim: { doorOpenStates?: Record<string, number> },
  obj: { type: number; x: number; y: number; z: number; order: number }
): boolean {
  if (!isCloseableDoorTypeRuntime(obj.type)) {
    return false;
  }
  if (!sim.doorOpenStates) {
    sim.doorOpenStates = {};
  }
  const key = doorStateKeyRuntime(obj);
  if (sim.doorOpenStates[key]) {
    delete sim.doorOpenStates[key];
    return false;
  }
  sim.doorOpenStates[key] = 1;
  return true;
}

export function resolvedDoorFrameRuntime(
  sim: { doorOpenStates?: Record<string, number> },
  obj: { type: number; frame: number; x: number; y: number; z: number; order: number }
): number {
  const frame = obj.frame | 0;
  if (!isCloseableDoorTypeRuntime(obj.type)) {
    return frame;
  }
  if (!isDoorToggledRuntime(sim, obj)) {
    return frame;
  }
  return frame ^ doorToggleMaskRuntime(obj.type);
}

export function isDoorFrameOpenRuntime(type: number, frame: number): boolean {
  if (!isCloseableDoorTypeRuntime(type)) {
    return false;
  }
  if ((type & 0x03ff) === 0x14e) {
    return (frame & 1) !== 0;
  }
  return frame >= 0 && frame < 4;
}

export function resolveDoorTileIdRuntime(
  sim: { doorOpenStates?: Record<string, number> },
  obj: { type: number; frame: number; baseTile: number; x: number; y: number; z: number; order: number }
): number {
  const base = obj.baseTile | 0;
  return (base + resolvedDoorFrameRuntime(sim, obj)) & 0xffff;
}

const OBJECT_TYPES_DOOR = new Set([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
const OBJECT_TYPES_CHAIR = new Set([0x0fc]);
const OBJECT_TYPES_BED = new Set([0x0a3]);
const OBJECT_TYPES_TOP_DECOR = new Set([0x05f, 0x060, 0x080, 0x081, 0x084, 0x07a, 0x0d1, 0x0ea]);
const OBJECT_TYPES_SOLID_ENV = new Set([
  0x0a3, 0x0a4, 0x0b0, 0x0b1, 0x0c6, 0x0d8, 0x0d9,
  0x0e4, 0x0e6, 0x0ed, 0x0ef, 0x0fa, 0x117, 0x137,
  0x147
]);
const OBJECT_TYPES_CLOSEABLE_DOOR = new Set([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);

function asType(type: number): number {
  return type & 0x03ff;
}

export function isCloseableDoorTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_CLOSEABLE_DOOR.has(asType(type));
}

export function isCloseableDoorObjectRuntime(obj: any): boolean {
  return !!obj && isCloseableDoorTypeRuntime(obj.type);
}

export function isChairTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_CHAIR.has(asType(type));
}

export function isChairObjectRuntime(obj: any): boolean {
  if (!obj) {
    return false;
  }
  const type = asType(obj.type);
  if (OBJECT_TYPES_CHAIR.has(type)) {
    return true;
  }
  if (type === 0x147) {
    const frame = obj.frame | 0;
    if (frame === 2) {
      return true;
    }
  }
  return false;
}

export function isBedTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_BED.has(asType(type));
}

export function isBedObjectRuntime(obj: any): boolean {
  return !!obj && isBedTypeRuntime(obj.type);
}

export function isSolidEnvTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_SOLID_ENV.has(asType(type));
}

export function isSolidEnvObjectRuntime(obj: any): boolean {
  return !!obj && isSolidEnvTypeRuntime(obj.type);
}

export function isLikelyPickupObjectTypeRuntime(type: number): boolean {
  const t = asType(type);
  if (OBJECT_TYPES_DOOR.has(t)) return false;
  if (OBJECT_TYPES_CHAIR.has(t)) return false;
  if (OBJECT_TYPES_BED.has(t)) return false;
  if (OBJECT_TYPES_SOLID_ENV.has(t)) return false;
  if (OBJECT_TYPES_TOP_DECOR.has(t)) return false;
  return true;
}

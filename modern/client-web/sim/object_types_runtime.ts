import {
  OBJECT_TYPE_BED_VALUES,
  OBJECT_TYPE_CHAIR_VALUES,
  OBJECT_TYPE_CLOSEABLE_DOOR_VALUES,
  OBJECT_TYPE_DOOR_VALUES,
  OBJECT_TYPE_SOLID_ENV_VALUES,
  OBJECT_TYPE_TOP_DECOR_VALUES,
  u6ObjectTypeSet
} from "../../common/u6_object_constants.ts";

const OBJECT_TYPES_DOOR = u6ObjectTypeSet(OBJECT_TYPE_DOOR_VALUES);
const OBJECT_TYPES_CHAIR = u6ObjectTypeSet(OBJECT_TYPE_CHAIR_VALUES);
const OBJECT_TYPES_BED = u6ObjectTypeSet(OBJECT_TYPE_BED_VALUES);
const OBJECT_TYPES_TOP_DECOR = u6ObjectTypeSet(OBJECT_TYPE_TOP_DECOR_VALUES);
const OBJECT_TYPES_SOLID_ENV = u6ObjectTypeSet(OBJECT_TYPE_SOLID_ENV_VALUES);
const OBJECT_TYPES_CLOSEABLE_DOOR = u6ObjectTypeSet(OBJECT_TYPE_CLOSEABLE_DOOR_VALUES);

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

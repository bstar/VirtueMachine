import {
  OBJECT_TYPE_BED_VALUES,
  OBJECT_TYPE_CHAIR_VALUES,
  OBJECT_TYPE_CLOSEABLE_DOOR_VALUES,
  OBJECT_TYPE_SOLID_ENV_VALUES,
  isU6PortableObjectTypeRuntime,
  u6ObjectTypeSet
} from "../../common/u6_object_constants.ts";

const OBJECT_TYPES_CHAIR = u6ObjectTypeSet(OBJECT_TYPE_CHAIR_VALUES);
const OBJECT_TYPES_BED = u6ObjectTypeSet(OBJECT_TYPE_BED_VALUES);
const OBJECT_TYPES_SOLID_ENV = u6ObjectTypeSet(OBJECT_TYPE_SOLID_ENV_VALUES);
const OBJECT_TYPES_CLOSEABLE_DOOR = u6ObjectTypeSet(OBJECT_TYPE_CLOSEABLE_DOOR_VALUES);

function asType(type: number): number {
  return type & 0x03ff;
}

export interface ObjectTypeRuntimeObject {
  type?: number;
  frame?: number;
}

export function isCloseableDoorTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_CLOSEABLE_DOOR.has(asType(type));
}

export function isCloseableDoorObjectRuntime(obj: ObjectTypeRuntimeObject | null | undefined): boolean {
  return !!obj && isCloseableDoorTypeRuntime(Number(obj.type));
}

export function isChairTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_CHAIR.has(asType(type));
}

export function isChairObjectRuntime(obj: ObjectTypeRuntimeObject | null | undefined): boolean {
  if (!obj) {
    return false;
  }
  const type = asType(Number(obj.type));
  if (OBJECT_TYPES_CHAIR.has(type)) {
    return true;
  }
  if (type === 0x147) {
    const frame = Number(obj.frame) | 0;
    if (frame === 2) {
      return true;
    }
  }
  return false;
}

export function isBedTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_BED.has(asType(type));
}

export function isBedObjectRuntime(obj: ObjectTypeRuntimeObject | null | undefined): boolean {
  return !!obj && isBedTypeRuntime(Number(obj.type));
}

export function isSolidEnvTypeRuntime(type: number): boolean {
  return OBJECT_TYPES_SOLID_ENV.has(asType(type));
}

export function isSolidEnvObjectRuntime(obj: ObjectTypeRuntimeObject | null | undefined): boolean {
  return !!obj && isSolidEnvTypeRuntime(Number(obj.type));
}

export function isLikelyPickupObjectTypeRuntime(type: number, typeWeights?: ArrayLike<number> | null): boolean {
  return isU6PortableObjectTypeRuntime(type, typeWeights);
}

export const OBJ_COORD_USE_MASK = 0x18;
export const OBJ_COORD_USE_LOCXYZ = 0x00;
export const OBJ_COORD_USE_CONTAINED = 0x08;
export const OBJ_COORD_USE_INVEN = 0x10;
export const OBJ_COORD_USE_EQUIP = 0x18;

export const OBJECT_TYPE_DOOR_VALUES = Object.freeze([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
export const OBJECT_TYPE_CLOSEABLE_DOOR_VALUES = Object.freeze([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);
export const OBJECT_TYPE_CHAIR_VALUES = Object.freeze([0x0fc]);
export const OBJECT_TYPE_BED_VALUES = Object.freeze([0x0a3]);
export const OBJECT_TYPE_TOP_DECOR_VALUES = Object.freeze([0x05f, 0x060, 0x080, 0x081, 0x084, 0x07a, 0x0d1, 0x0ea]);
export const OBJECT_TYPE_SOLID_ENV_VALUES = Object.freeze([
  0x0a3, 0x0a4, 0x0b0, 0x0b1, 0x0c6, 0x0d8, 0x0d9,
  0x0e4, 0x0e6, 0x0ed, 0x0ef, 0x0fa, 0x117, 0x137,
  0x147
]);

export function u6ObjectTypeSet(values: readonly number[]): Set<number> {
  return new Set(values.map((v) => Number(v) & 0x03ff));
}

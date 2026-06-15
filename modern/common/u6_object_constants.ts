export const OBJ_COORD_USE_MASK = 0x18;
export const OBJ_COORD_USE_LOCXYZ = 0x00;
export const OBJ_COORD_USE_CONTAINED = 0x08;
export const OBJ_COORD_USE_INVEN = 0x10;
export const OBJ_COORD_USE_EQUIP = 0x18;

export function coordUseOfStatus(status: unknown): number {
  return (Number(status) & OBJ_COORD_USE_MASK) >>> 0;
}

export const OBJECT_TYPE_DOOR_VALUES = Object.freeze([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
export const OBJECT_TYPE_CLOSEABLE_DOOR_VALUES = Object.freeze([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);
export const OBJECT_TYPE_CHAIR_VALUES = Object.freeze([0x0fc]);
export const OBJECT_TYPE_BED_VALUES = Object.freeze([0x0a3]);
export const OBJECT_TYPE_SIGN_VALUES = Object.freeze([0x14b, 0x14c, 0x14d]);
export const OBJECT_TYPE_TOP_DECOR_VALUES = Object.freeze([0x05f, 0x060, 0x080, 0x081, 0x084, 0x07a, 0x0d1, 0x0ea]);
export const OBJECT_TYPE_ENV_FIXTURE_VALUES = Object.freeze([
  0x0e0, /* foot rail */
  0x12f  /* carpet */
]);
export const OBJECT_TYPE_ZERO_WEIGHT_TAKEABLE_VALUES = Object.freeze([
  0x058, /* gold */
  0x041, /* reagent */
  0x042, /* reagent */
  0x043, /* reagent */
  0x044, /* reagent */
  0x045, /* reagent */
  0x046, /* reagent */
  0x047, /* reagent */
  0x048  /* reagent */
]);
export const OBJECT_TYPE_STACKABLE_INVENTORY_VALUES = Object.freeze([
  0x037, /* arrow */
  0x038, /* bolt */
  0x03f, /* lock pick */
  0x041, /* black pearl */
  0x042, /* blood moss */
  0x043, /* garlic */
  0x044, /* ginseng */
  0x045, /* mandrake root */
  0x046, /* nightshade */
  0x047, /* spider silk */
  0x048, /* sulfurous ash */
  0x04d, /* gem */
  0x053, /* flask of oil */
  0x058, /* gold */
  0x059, /* gold nugget */
  0x05a, /* torch, unlit only */
  0x05b, /* zu ylem */
  0x05c, /* silver snake venom */
  0x080, /* bread */
  0x081, /* meat */
  0x151  /* effect */
]);
export const OBJECT_TYPE_SOLID_ENV_VALUES = Object.freeze([
  0x097, /* table */
  0x0a3, 0x0a4, 0x0b0, 0x0b1, 0x0c6, 0x0d8, 0x0d9,
  0x0e4, 0x0e6, 0x0ed, 0x0ef, 0x0fa, 0x117, 0x137,
  0x147
]);

export function u6ObjectTypeSet(values: readonly number[]): Set<number> {
  return new Set(values.map((v) => Number(v) & 0x03ff));
}

const OBJECT_TYPE_STACKABLE_INVENTORY_SET = u6ObjectTypeSet(OBJECT_TYPE_STACKABLE_INVENTORY_VALUES);

export function isU6InventoryStackableObjectType(type: unknown, frame: unknown = 0): boolean {
  const objectType = Number(type) & 0x03ff;
  if (objectType === 0x05a && (Number(frame) & 0x3f) === 1) {
    return false;
  }
  return OBJECT_TYPE_STACKABLE_INVENTORY_SET.has(objectType);
}

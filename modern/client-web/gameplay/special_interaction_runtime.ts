import { U6_SFX } from "../audio/sfx_ids_runtime.ts";

export const OBJ_U6_RUBBER_DUCKY_RUNTIME = 0x0a9;
export const OBJ_U6_BELL_RUNTIME = 0x0ec;

export type SpecialInteractionObjectRuntime = {
  type?: unknown;
};

export function specialUseSfxForObjectTypeRuntime(type: unknown): number | null {
  const objectType = Number(type) & 0x03ff;
  if (objectType === OBJ_U6_BELL_RUNTIME) {
    return U6_SFX.BELL;
  }
  if (objectType === OBJ_U6_RUBBER_DUCKY_RUNTIME) {
    return U6_SFX.RUBBER_DUCK;
  }
  return null;
}

export function specialUseSfxAtCellRuntime(
  objects: Iterable<SpecialInteractionObjectRuntime> | null | undefined
): number | null {
  for (const obj of objects || []) {
    const sfxId = specialUseSfxForObjectTypeRuntime(obj?.type);
    if (sfxId !== null) {
      return sfxId;
    }
  }
  return null;
}

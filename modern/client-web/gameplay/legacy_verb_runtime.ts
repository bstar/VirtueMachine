import { firstInventoryKeyRuntime, decrementInventoryKeyRuntime } from "../sim/inventory_runtime.ts";
import { isWithinChebyshevRangeRuntime } from "../sim/range_runtime.ts";
import { U6_SFX } from "../audio/sfx_ids_runtime.ts";

export type LegacyVerbRuntimeResult = {
  diagClass: "ok" | "warn";
  ok: boolean;
  playSfx?: string;
  text: string;
};

export type LegacyVerbSimRuntime = {
  inventory?: Record<string, number>;
  world: {
    map_x: number;
    map_y: number;
    map_z: number;
  };
};

export type LegacyDropValidationRuntimeResult = LegacyVerbRuntimeResult & {
  inventoryKey?: string;
  tz?: number;
};

export function legacyCastVerbRuntime(tx: number, ty: number, tz: number): LegacyVerbRuntimeResult {
  return {
    diagClass: "ok",
    ok: true,
    playSfx: "casting_magic_p1",
    text: `Cast: target ${tx},${ty},${tz} accepted (spell system pending).`
  };
}

export function legacyVerbSfxIdRuntime(playSfx: unknown): number | null {
  switch (String(playSfx || "")) {
    case "attack_swing":
      return U6_SFX.ATTACK_SWING;
    case "casting_magic_p1":
      return U6_SFX.CASTING_MAGIC_P1;
    default:
      return null;
  }
}

export function legacyMoveVerbRuntime(tx: number, ty: number, tz: number): LegacyVerbRuntimeResult {
  return {
    diagClass: "ok",
    ok: true,
    text: `Move: target ${tx},${ty},${tz} accepted (object move semantics pending).`
  };
}

export function legacyAttackVerbRuntime(
  actor: { type?: unknown } | null | undefined,
  tx: number,
  ty: number,
  tz: number
): LegacyVerbRuntimeResult {
  if (actor) {
    return {
      diagClass: "ok",
      ok: true,
      playSfx: "attack_swing",
      text: `Attack: target 0x${(Number(actor.type) & 0x3ff).toString(16)} at ${tx},${ty},${tz} (combat resolution pending).`
    };
  }
  return {
    diagClass: "warn",
    ok: false,
    text: `Attack: no valid target at ${tx},${ty},${tz}.`
  };
}

export function legacyDropVerbRuntime(
  sim: LegacyVerbSimRuntime,
  tx: number,
  ty: number
): LegacyVerbRuntimeResult {
  const validation = legacyDropVerbValidationRuntime(sim, tx, ty);
  if (!validation.ok) {
    return validation;
  }
  const key = String(validation.inventoryKey || "");
  const remaining = decrementInventoryKeyRuntime(sim, key);
  return {
    diagClass: "ok",
    ok: true,
    text: `Drop: ${key} at ${tx},${ty},${Number(validation.tz) | 0} (remaining ${remaining}).`
  };
}

export function legacyDropVerbValidationRuntime(
  sim: LegacyVerbSimRuntime,
  tx: number,
  ty: number
): LegacyDropValidationRuntimeResult {
  const sx = Number(sim?.world?.map_x) | 0;
  const sy = Number(sim?.world?.map_y) | 0;
  const tz = Number(sim?.world?.map_z) | 0;
  if (!isWithinChebyshevRangeRuntime(sx, sy, tx | 0, ty | 0, 5)) {
    return {
      diagClass: "warn",
      ok: false,
      text: `Drop: target out of range (${tx},${ty}).`
    };
  }
  const key = firstInventoryKeyRuntime(sim);
  if (!key) {
    return {
      diagClass: "warn",
      ok: false,
      text: "Drop: inventory is empty."
    };
  }
  return {
    diagClass: "ok",
    ok: true,
    inventoryKey: key,
    text: `Drop: ${key} at ${tx},${ty},${tz}.`,
    tz
  };
}

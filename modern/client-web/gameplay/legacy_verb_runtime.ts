import { firstInventoryKeyRuntime, decrementInventoryKeyRuntime } from "../sim/inventory_runtime.ts";
import { isWithinChebyshevRangeRuntime } from "../sim/range_runtime.ts";

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

export function legacyCastVerbRuntime(tx: number, ty: number, tz: number): LegacyVerbRuntimeResult {
  return {
    diagClass: "ok",
    ok: true,
    playSfx: "casting_magic_p1",
    text: `Cast: target ${tx},${ty},${tz} accepted (spell system pending).`
  };
}

export function legacyMoveVerbRuntime(tx: number, ty: number, tz: number): LegacyVerbRuntimeResult {
  return {
    diagClass: "ok",
    ok: true,
    text: `Move: target ${tx},${ty},${tz} accepted (object move semantics pending).`
  };
}

export function legacyDropVerbRuntime(
  sim: LegacyVerbSimRuntime,
  tx: number,
  ty: number
): LegacyVerbRuntimeResult {
  const sx = Number(sim?.world?.map_x) | 0;
  const sy = Number(sim?.world?.map_y) | 0;
  const tz = Number(sim?.world?.map_z) | 0;
  if (!isWithinChebyshevRangeRuntime(sx, sy, tx | 0, ty | 0, 1)) {
    return {
      diagClass: "warn",
      ok: false,
      text: `Drop: target must be adjacent (${tx},${ty}).`
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
  const remaining = decrementInventoryKeyRuntime(sim, key);
  return {
    diagClass: "ok",
    ok: true,
    text: `Drop: ${key} at ${tx},${ty},${tz} (remaining ${remaining}).`
  };
}

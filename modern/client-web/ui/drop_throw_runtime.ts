import type { WorldRuntimeDropThrowEffect, WorldRuntimeJson } from "../net/world_runtime.ts";

export type DropThrowSpriteRuntime = {
  alpha: number;
  objectKey: string;
  px: number;
  py: number;
  rawT: number;
  tileId: number;
};

export type DropThrowRenderPlanRuntime = {
  landedObjects: Array<WorldRuntimeJson["target"] | null>;
  remaining: WorldRuntimeDropThrowEffect[];
  sprites: DropThrowSpriteRuntime[];
};

export function dropThrowRenderPlanRuntime(args: {
  arcPx: number;
  effects: readonly WorldRuntimeDropThrowEffect[];
  nowMs: number;
  resolveAnimatedTile: (tileId: number) => number;
  startX: number;
  startY: number;
  tileSize: number;
  viewH: number;
  viewW: number;
  z: number;
}): DropThrowRenderPlanRuntime {
  const remaining: WorldRuntimeDropThrowEffect[] = [];
  const landedObjects: Array<WorldRuntimeJson["target"] | null> = [];
  const sprites: DropThrowSpriteRuntime[] = [];
  const nowMs = Number(args.nowMs) || 0;
  const tileSize = Math.max(1, Number(args.tileSize) || 1);
  const arcPx = Math.max(0, Number(args.arcPx) || 0);
  const startX = Number(args.startX) | 0;
  const startY = Number(args.startY) | 0;
  const viewW = Math.max(0, Number(args.viewW) | 0);
  const viewH = Math.max(0, Number(args.viewH) | 0);
  const z = Number(args.z) | 0;

  for (const effect of args.effects || []) {
    if ((Number(effect.z) | 0) !== z) {
      remaining.push(effect);
      continue;
    }

    const duration = Math.max(1, Number(effect.endMs) - Number(effect.startMs));
    const rawT = Math.max(0, Math.min(1, (nowMs - Number(effect.startMs)) / duration));
    if (rawT >= 1) {
      landedObjects.push(effect.landObject || null);
      continue;
    }

    remaining.push(effect);
    const eased = rawT * rawT * (3 - (2 * rawT));
    const wx = Number(effect.fromX) + ((Number(effect.toX) - Number(effect.fromX)) * eased);
    const wy = Number(effect.fromY) + ((Number(effect.toY) - Number(effect.fromY)) * eased);
    const gx = wx - startX;
    const gy = wy - startY;
    if (gx < -1 || gy < -1 || gx >= viewW || gy >= viewH) {
      continue;
    }

    sprites.push({
      alpha: 0.98,
      objectKey: String(effect.objectKey || ""),
      px: Math.round(gx * tileSize),
      py: Math.round((gy * tileSize) - (Math.sin(rawT * Math.PI) * arcPx)),
      rawT,
      tileId: args.resolveAnimatedTile(Number(effect.tileId) & 0xffff)
    });
  }

  return { landedObjects, remaining, sprites };
}

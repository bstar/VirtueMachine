import {
  buildLegacyPaletteFrameRuntime,
  type RgbPaletteRuntime
} from "../assets/palette_runtime.ts";
import { animationTickPatchRuntime } from "../sim/app_state_runtime.ts";
import { U6AnimDataRuntime } from "../sim/anim_data_runtime.ts";
import { resolveDoorTileIdRuntime } from "../sim/door_runtime.ts";

export type AnimationPaletteStateRuntime = {
  animData: U6AnimDataRuntime | null;
  animationFrozen?: boolean;
  basePalette: RgbPaletteRuntime | null;
  enablePaletteFx: boolean;
  frozenAnimationTick: number | null;
  paletteFrame: RgbPaletteRuntime | null;
  paletteFrameTick: number;
};

export type AnimatedTileObjectRuntime = {
  baseTile?: number;
  frame?: number;
  tileId?: number;
  order?: number;
  type?: number;
  x?: number;
  y?: number;
  z?: number;
};

export function animationTickForStateRuntime(args: {
  currentTick: unknown;
  state: Pick<AnimationPaletteStateRuntime, "animationFrozen" | "frozenAnimationTick">;
}): number {
  const patch = animationTickPatchRuntime({
    animationFrozen: args.state.animationFrozen,
    currentTick: args.currentTick,
    frozenAnimationTick: args.state.frozenAnimationTick
  });
  args.state.frozenAnimationTick = patch.frozenAnimationTick;
  return patch.tick;
}

export function legacyPalettePhaseForTickRuntime(tick: unknown): number {
  return (Number(tick) >>> 0) & 0x07;
}

export function resolveAnimatedTileAtTickRuntime(args: {
  animData?: U6AnimDataRuntime | null;
  counter: unknown;
  tileId: unknown;
}): number {
  const tileId = Number(args.tileId) & 0xffff;
  const animData = args.animData || null;
  if (!animData || !animData.hasBaseTile(tileId)) {
    return tileId;
  }
  return animData.animatedTile(tileId, Number(args.counter) >>> 0) & 0xffff;
}

export function resolveAnimatedObjectTileAtTickRuntime(args: {
  animData?: U6AnimDataRuntime | null;
  counter: unknown;
  obj: AnimatedTileObjectRuntime | null | undefined;
  sim: { doorOpenStates?: Record<string, number> };
}): number {
  const obj = args.obj;
  if (!obj) {
    return 0;
  }
  const baseTile = Number(obj.baseTile);
  const frame = Number.isFinite(Number(obj.frame)) ? Number(obj.frame) | 0 : 0;
  if (!Number.isFinite(baseTile)) {
    return Number(obj.tileId) & 0xffff;
  }
  const hasDoorAnchor = Number.isFinite(Number(obj.type))
    && Number.isFinite(Number(obj.x))
    && Number.isFinite(Number(obj.y))
    && Number.isFinite(Number(obj.z))
    && Number.isFinite(Number(obj.order));
  const doorTileId = hasDoorAnchor
    ? resolveDoorTileIdRuntime(args.sim, {
      baseTile: baseTile | 0,
      frame,
      order: Number(obj.order) | 0,
      type: Number(obj.type) | 0,
      x: Number(obj.x) | 0,
      y: Number(obj.y) | 0,
      z: Number(obj.z) | 0
    })
    : ((baseTile | 0) + frame) & 0xffff;
  const animData = args.animData || null;
  if (animData && animData.hasBaseTile(baseTile | 0)) {
    const animBase = animData.animatedTile(baseTile | 0, Number(args.counter) >>> 0);
    return (animBase + frame) & 0xffff;
  }
  return resolveAnimatedTileAtTickRuntime({
    animData,
    counter: args.counter,
    tileId: doorTileId
  });
}

export function resolveFootprintObjectTileRuntime(args: {
  obj: AnimatedTileObjectRuntime | null | undefined;
  sim: { doorOpenStates?: Record<string, number> };
}): number {
  const obj = args.obj;
  if (!obj) {
    return 0;
  }
  const baseTile = Number(obj.baseTile);
  const frame = Number.isFinite(Number(obj.frame)) ? Number(obj.frame) | 0 : 0;
  if (!Number.isFinite(baseTile)) {
    return Number(obj.tileId) & 0xffff;
  }
  const hasDoorAnchor = Number.isFinite(Number(obj.type))
    && Number.isFinite(Number(obj.x))
    && Number.isFinite(Number(obj.y))
    && Number.isFinite(Number(obj.z))
    && Number.isFinite(Number(obj.order));
  if (!hasDoorAnchor) {
    return ((baseTile | 0) + frame) & 0xffff;
  }
  return resolveDoorTileIdRuntime(args.sim, {
    baseTile: baseTile | 0,
    frame,
    order: Number(obj.order) | 0,
    type: Number(obj.type) | 0,
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0
  });
}

export function renderPaletteForStateRuntime(args: {
  phase: unknown;
  state: Pick<AnimationPaletteStateRuntime, "basePalette" | "enablePaletteFx" | "paletteFrame" | "paletteFrameTick">;
}): RgbPaletteRuntime | null {
  if (!args.state.basePalette) {
    return null;
  }
  if (!args.state.enablePaletteFx) {
    return args.state.basePalette;
  }
  const phase = legacyPalettePhaseForTickRuntime(args.phase);
  if (args.state.paletteFrame && args.state.paletteFrameTick === phase) {
    return args.state.paletteFrame;
  }
  args.state.paletteFrame = buildLegacyPaletteFrameRuntime(args.state.basePalette, phase);
  args.state.paletteFrameTick = phase;
  return args.state.paletteFrame;
}

export function renderPaletteKeyRuntime(args: {
  enablePaletteFx: unknown;
  phase: unknown;
}): string {
  if (!args.enablePaletteFx) {
    return "pal-static";
  }
  return `palfx-${legacyPalettePhaseForTickRuntime(args.phase)}`;
}

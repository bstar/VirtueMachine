import assert from "node:assert/strict";
import {
  animationTickForStateRuntime,
  legacyPalettePhaseForTickRuntime,
  renderPaletteForStateRuntime,
  renderPaletteKeyRuntime,
  resolveAnimatedObjectTileAtTickRuntime,
  resolveAnimatedTileAtTickRuntime,
  resolveFootprintObjectTileRuntime,
  type AnimationPaletteStateRuntime
} from "../render/animation_palette_runtime.ts";
import { U6AnimDataRuntime } from "../sim/anim_data_runtime.ts";
import type { RgbPaletteRuntime } from "../assets/palette_runtime.ts";

function numberedPalette(): RgbPaletteRuntime {
  return Array.from({ length: 256 }, (_, i) => [i, i + 1, i + 2]);
}

function animData(): U6AnimDataRuntime {
  return new U6AnimDataRuntime([
    {
      baseTile: 0x100,
      mask: 0x03,
      shift: 0,
      startFrame: 0x200
    },
    {
      baseTile: 0x300,
      mask: 0x02,
      shift: 1,
      startFrame: 0x310
    }
  ]);
}

assert.equal(legacyPalettePhaseForTickRuntime(0), 0);
assert.equal(legacyPalettePhaseForTickRuntime(9), 1);
assert.equal(renderPaletteKeyRuntime({ enablePaletteFx: false, phase: 7 }), "pal-static");
assert.equal(renderPaletteKeyRuntime({ enablePaletteFx: true, phase: 9 }), "palfx-1");

{
  const state = {
    animationFrozen: false,
    frozenAnimationTick: 22
  };
  assert.equal(animationTickForStateRuntime({ currentTick: 44, state }), 44);
  assert.equal(state.frozenAnimationTick, 22);
}

{
  const state = {
    animationFrozen: true,
    frozenAnimationTick: null
  };
  assert.equal(animationTickForStateRuntime({ currentTick: 44, state }), 44);
  assert.equal(state.frozenAnimationTick, 44);
  assert.equal(animationTickForStateRuntime({ currentTick: 50, state }), 44);
  assert.equal(state.frozenAnimationTick, 44);
}

{
  const data = animData();
  assert.equal(resolveAnimatedTileAtTickRuntime({ animData: data, counter: 3, tileId: 0x100 }), 0x203);
  assert.equal(resolveAnimatedTileAtTickRuntime({ animData: data, counter: 3, tileId: 0x101 }), 0x101);
  assert.equal(resolveAnimatedTileAtTickRuntime({ animData: null, counter: 3, tileId: 0x100 }), 0x100);
}

{
  const data = animData();
  assert.equal(resolveAnimatedObjectTileAtTickRuntime({
    animData: data,
    counter: 3,
    obj: { baseTile: 0x100, frame: 5, tileId: 0x999 },
    sim: {}
  }), 0x208);
  assert.equal(resolveAnimatedObjectTileAtTickRuntime({
    animData: data,
    counter: 3,
    obj: { tileId: 0x12345 },
    sim: {}
  }), 0x2345);
  assert.equal(resolveAnimatedObjectTileAtTickRuntime({
    animData: data,
    counter: 3,
    obj: null,
    sim: {}
  }), 0);
}

{
  const door = {
    baseTile: 0x500,
    frame: 0,
    order: 7,
    type: 0x129,
    x: 10,
    y: 20,
    z: 0
  };
  assert.equal(resolveAnimatedObjectTileAtTickRuntime({
    animData: null,
    counter: 0,
    obj: door,
    sim: {}
  }), 0x500);
  assert.equal(resolveAnimatedObjectTileAtTickRuntime({
    animData: null,
    counter: 0,
    obj: door,
    sim: { doorOpenStates: { "10,20,0,7": 1 } }
  }), 0x504);
  assert.equal(resolveFootprintObjectTileRuntime({
    obj: door,
    sim: { doorOpenStates: { "10,20,0,7": 1 } }
  }), 0x504);
}

{
  const basePalette = numberedPalette();
  const state: AnimationPaletteStateRuntime = {
    animData: null,
    basePalette,
    enablePaletteFx: false,
    frozenAnimationTick: null,
    paletteFrame: null,
    paletteFrameTick: -1
  };
  assert.equal(renderPaletteForStateRuntime({ phase: 1, state }), basePalette);
  assert.equal(state.paletteFrame, null);
}

{
  const basePalette = numberedPalette();
  const state: AnimationPaletteStateRuntime = {
    animData: null,
    basePalette,
    enablePaletteFx: true,
    frozenAnimationTick: null,
    paletteFrame: null,
    paletteFrameTick: -1
  };
  const frame = renderPaletteForStateRuntime({ phase: 1, state });
  assert.ok(frame);
  assert.notEqual(frame, basePalette);
  assert.equal(state.paletteFrameTick, 1);
  assert.equal(renderPaletteForStateRuntime({ phase: 9, state }), frame);
  const nextFrame = renderPaletteForStateRuntime({ phase: 2, state });
  assert.ok(nextFrame);
  assert.notEqual(nextFrame, frame);
  assert.equal(state.paletteFrameTick, 2);
}

console.log("animation_palette_runtime_test: ok");

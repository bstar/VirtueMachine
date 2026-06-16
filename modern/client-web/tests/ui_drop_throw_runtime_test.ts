import assert from "node:assert/strict";
import {
  dropThrowRenderPlanRuntime,
  queueDropThrowEffectRuntime,
  type DropThrowSpriteRuntime
} from "../ui/drop_throw_runtime.ts";
import type { WorldRuntimeDropThrowEffect } from "../net/world_runtime.ts";

function effect(overrides: Partial<WorldRuntimeDropThrowEffect> = {}): WorldRuntimeDropThrowEffect {
  return {
    endMs: 1360,
    fromX: 10,
    fromY: 10,
    landObject: { object_key: "drop-1", tile_id: 0x285, type: 0x078, frame: 0 },
    objectKey: "drop-1",
    startMs: 1000,
    tileId: 0x285,
    toX: 11,
    toY: 10,
    z: 0,
    ...overrides
  };
}

function plan(effects: readonly WorldRuntimeDropThrowEffect[], nowMs = 1180) {
  return dropThrowRenderPlanRuntime({
    arcPx: 10,
    effects,
    nowMs,
    resolveAnimatedTile: (tileId) => tileId + 1,
    startX: 8,
    startY: 9,
    tileSize: 16,
    viewH: 11,
    viewW: 11,
    z: 0
  });
}

{
  const active = effect();
  const out = plan([active]);
  assert.deepEqual(out.landedObjects, []);
  assert.deepEqual(out.remaining, [active]);
  assert.equal(out.sprites.length, 1);
  const sprite = out.sprites[0] as DropThrowSpriteRuntime;
  assert.equal(sprite.objectKey, "drop-1");
  assert.equal(sprite.tileId, 0x286);
  assert.equal(sprite.alpha, 0.98);
  assert.equal(sprite.rawT, 0.5);
  assert.equal(sprite.px, 40);
  assert.equal(sprite.py, 6);
}

{
  const landed = effect();
  const out = plan([landed], 1360);
  assert.deepEqual(out.landedObjects, [landed.landObject]);
  assert.deepEqual(out.remaining, []);
  assert.deepEqual(out.sprites, []);
}

{
  const otherZ = effect({ objectKey: "other-z", z: 1 });
  const out = plan([otherZ]);
  assert.deepEqual(out.landedObjects, []);
  assert.deepEqual(out.remaining, [otherZ]);
  assert.deepEqual(out.sprites, []);
}

{
  const offscreen = effect({ fromX: 30, toX: 31 });
  const out = plan([offscreen]);
  assert.deepEqual(out.landedObjects, []);
  assert.deepEqual(out.remaining, [offscreen]);
  assert.deepEqual(out.sprites, []);
}

{
  const current = effect({ objectKey: "old", landObject: { object_key: "old", tile_id: 0x200 } });
  const out = queueDropThrowEffectRuntime({
    currentEffects: [current],
    durationMs: 360,
    fromX: 10,
    fromY: 10,
    landObject: { object_key: "drop-2", tile_id: 0x285, type: 0x078, frame: 0 },
    nowMs: 1000,
    toX: 12,
    toY: 10,
    z: 0
  });
  assert.deepEqual(out.landedObjects, []);
  assert.equal(out.effects.length, 2);
  assert.equal(out.effects[0], current);
  assert.equal(out.effects[1].objectKey, "drop-2");
  assert.equal(out.effects[1].startMs, 1000);
  assert.equal(out.effects[1].endMs, 1360);
  assert.equal(out.effects[1].tileId, 0x285);
}

{
  const stale = effect({ objectKey: "drop-2", toX: 99 });
  const out = queueDropThrowEffectRuntime({
    currentEffects: [stale],
    durationMs: 360,
    fromX: 10,
    fromY: 10,
    landObject: { object_key: "drop-2", tile_id: 0x285, type: 0x078, frame: 0 },
    nowMs: 1000,
    toX: 12,
    toY: 10,
    z: 0
  });
  assert.equal(out.effects.length, 1);
  assert.notEqual(out.effects[0], stale);
  assert.equal(out.effects[0].objectKey, "drop-2");
  assert.equal(out.effects[0].toX, 12);
}

{
  const current = effect({ objectKey: "old" });
  const landed = { object_key: "drop-now", tile_id: 0x285, type: 0x078, frame: 0 };
  const out = queueDropThrowEffectRuntime({
    currentEffects: [current],
    durationMs: 360,
    fromX: 10,
    fromY: 10,
    landObject: landed,
    nowMs: 1000,
    toX: 10,
    toY: 10,
    z: 0
  });
  assert.deepEqual(out.landedObjects, [landed]);
  assert.deepEqual(out.effects, [current]);
}

console.log("ui_drop_throw_runtime_test: ok");

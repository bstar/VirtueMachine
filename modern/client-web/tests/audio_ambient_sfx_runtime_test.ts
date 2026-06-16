import assert from "node:assert/strict";
import {
  U6_AMBIENT_OBJECT_TYPE_RUNTIME,
  ambientSfxCooldownTicksRuntime,
  ambientSfxForObjectTypeRuntime,
  ambientSfxIsReadyRuntime,
  ambientSfxLastLabelRuntime,
  ambientSfxSeedRuntime,
  ambientSfxVolumeRuntime,
  buildAmbientSfxCandidatesRuntime,
  nextAmbientSfxPlaybackPlanRuntime
} from "../audio/ambient_sfx_runtime.ts";
import { U6_SFX } from "../audio/sfx_ids_runtime.ts";

assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.CLOCK), U6_SFX.CLOCK);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.FOUNTAIN), U6_SFX.FOUNTAIN);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIREPLACE), U6_SFX.FIRE);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.COOK_FIRE), U6_SFX.FIRE);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIRE_FIELD), U6_SFX.FIRE);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIRE), U6_SFX.FIRE);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.PROTECTION_FIELD), U6_SFX.PROTECTION_FIELD);
assert.equal(ambientSfxForObjectTypeRuntime(U6_AMBIENT_OBJECT_TYPE_RUNTIME.WATER_WHEEL), U6_SFX.WATER_WHEEL);
assert.equal(ambientSfxForObjectTypeRuntime(0xffff), null);

assert.equal(ambientSfxCooldownTicksRuntime(U6_SFX.CLOCK), 8);
assert.equal(ambientSfxCooldownTicksRuntime(U6_SFX.FOUNTAIN), 2);
assert.equal(ambientSfxCooldownTicksRuntime(U6_SFX.WATER_WHEEL), 2);
assert.equal(ambientSfxCooldownTicksRuntime(U6_SFX.FIRE), 4);
assert.equal(ambientSfxIsReadyRuntime({ tick: 10, lastTick: 8, sfxId: U6_SFX.FOUNTAIN }), true);
assert.equal(ambientSfxIsReadyRuntime({ tick: 10, lastTick: 9, sfxId: U6_SFX.FOUNTAIN }), false);

assert.equal(ambientSfxVolumeRuntime(0), 1);
assert.equal(ambientSfxVolumeRuntime(7), 0.35);
assert.equal(ambientSfxLastLabelRuntime(0x13d, U6_SFX.FIRE), "0x13d:7");
assert.equal(ambientSfxSeedRuntime({ tick: 12, x: 10, y: 20, type: 0x13d }), 356628513);

{
  const candidates = buildAmbientSfxCandidatesRuntime({
    avatarX: 100,
    avatarY: 100,
    objects: [
      { type: 0xffff, x: 100, y: 100, name: "ignored" },
      { type: U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIRE, x: 103, y: 100, name: "fire" },
      { type: U6_AMBIENT_OBJECT_TYPE_RUNTIME.FOUNTAIN, x: 103, y: 100, name: "fountain" },
      { type: U6_AMBIENT_OBJECT_TYPE_RUNTIME.CLOCK, x: 101, y: 100, name: "clock" }
    ]
  });
  assert.deepEqual(candidates.map((c) => [c.obj.name, c.sfxId, c.dist, c.priority]), [
    ["clock", U6_SFX.CLOCK, 1, 1],
    ["fountain", U6_SFX.FOUNTAIN, 3, 0],
    ["fire", U6_SFX.FIRE, 3, 1]
  ]);
  assert.deepEqual(nextAmbientSfxPlaybackPlanRuntime({
    candidates,
    lastTickBySfx: {
      [String(U6_SFX.CLOCK)]: 10
    },
    tick: 12
  }), {
    candidate: candidates[1],
    distance: 3,
    label: "0xea:2",
    seed: ambientSfxSeedRuntime({ tick: 12, x: 103, y: 100, type: U6_AMBIENT_OBJECT_TYPE_RUNTIME.FOUNTAIN }),
    tick: 12,
    tickPhase: 12,
    volume: 0.75
  });
  assert.equal(nextAmbientSfxPlaybackPlanRuntime({
    candidates,
    lastTickBySfx: {
      [String(U6_SFX.CLOCK)]: 8,
      [String(U6_SFX.FOUNTAIN)]: 11,
      [String(U6_SFX.FIRE)]: 9
    },
    tick: 12
  }), null);
  assert.equal(nextAmbientSfxPlaybackPlanRuntime({
    candidates: [],
    tick: 12
  }), null);
}

console.log("audio_ambient_sfx_runtime_test: ok");

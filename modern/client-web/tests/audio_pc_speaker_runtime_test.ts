import assert from "node:assert/strict";
import { buildPcSpeakerAmbientSfxRuntime, buildPcSpeakerSfxRuntime, PC_SPEAKER_OUTPUT_RATE } from "../audio/pc_speaker_sfx_runtime.ts";
import { U6_SFX } from "../audio/sfx_ids_runtime.ts";

const blocked = buildPcSpeakerSfxRuntime(U6_SFX.BLOCKED);
assert.ok(blocked, "blocked SFX should render");
assert.equal(blocked!.sampleRate, PC_SPEAKER_OUTPUT_RATE, "PC speaker sample rate mismatch");
assert.ok(blocked!.channelData.length > 0, "blocked SFX should contain PCM");
assert.ok(blocked!.durationMs > 0, "blocked SFX should report duration");

const failure = buildPcSpeakerSfxRuntime(U6_SFX.FAILURE);
assert.ok(failure, "failure SFX should render");
assert.ok(failure!.channelData.length > blocked!.channelData.length, "failure sweep should be longer than blocked chirp");

const bell = buildPcSpeakerSfxRuntime(U6_SFX.BELL);
assert.ok(bell, "bell SFX should render");
assert.ok(bell!.channelData.length > failure!.channelData.length, "bell stutter should be longer than failure sweep");

for (const [name, sfxId] of Object.entries({ explosion: U6_SFX.EXPLOSION })) {
  const sample = buildPcSpeakerSfxRuntime(sfxId);
  assert.ok(sample, `${name} SFX should render`);
  assert.ok(sample!.channelData.length > 0, `${name} SFX should contain PCM`);
}

for (const [name, sfxId] of Object.entries({
  fountain: U6_SFX.FOUNTAIN,
  fire: U6_SFX.FIRE,
  clock: U6_SFX.CLOCK,
  protection: U6_SFX.PROTECTION_FIELD,
  waterWheel: U6_SFX.WATER_WHEEL
})) {
  const sample = buildPcSpeakerAmbientSfxRuntime(sfxId, { distance: 0, tickPhase: 0, seed: 4 });
  assert.ok(sample, `${name} ambient SFX should render from the ambient path`);
  assert.ok(sample!.channelData.length > 0, `${name} ambient SFX should contain PCM`);
}

assert.equal(buildPcSpeakerSfxRuntime(U6_SFX.FOUNTAIN), null, "fountain is not a fixed Nuvie PC-speaker one-shot");

const fountainNear = buildPcSpeakerAmbientSfxRuntime(U6_SFX.FOUNTAIN, { distance: 0, tickPhase: 0, seed: 1 });
const fountainFar = buildPcSpeakerAmbientSfxRuntime(U6_SFX.FOUNTAIN, { distance: 6, tickPhase: 0, seed: 1 });
assert.ok(fountainNear!.durationMs > fountainFar!.durationMs, "fountain ambient duration should follow original distance attenuation");

const clockTick = buildPcSpeakerAmbientSfxRuntime(U6_SFX.CLOCK, { distance: 0, tickPhase: 0, seed: 1 });
const clockTack = buildPcSpeakerAmbientSfxRuntime(U6_SFX.CLOCK, { distance: 0, tickPhase: 8, seed: 1 });
assert.ok(clockTick && clockTack, "clock tick and tack should render at their original phases");
assert.equal(buildPcSpeakerAmbientSfxRuntime(U6_SFX.CLOCK, { distance: 0, tickPhase: 4, seed: 1 }), null, "clock should be silent away from tick/tack phases");

const unknown = buildPcSpeakerSfxRuntime(9999);
assert.equal(unknown, null, "unknown SFX should return null");

console.log("audio_pc_speaker_runtime_test: ok");

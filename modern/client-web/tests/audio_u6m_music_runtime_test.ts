import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { oplFnumToHzRuntime, oplTotalLevelToGainRuntime, U6_ADLIB_TICK_HZ } from "../audio/adlib_music_runtime.ts";
import { collectU6MRegisterWritesRuntime, decodeU6MSongRuntime, U6MRegisterSequencerRuntime } from "../audio/u6m_music_runtime.ts";

const RUNTIME_ASSETS = path.resolve(import.meta.dirname, "../../assets/runtime");

function readRuntimeAsset(name: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(RUNTIME_ASSETS, name)));
}

const intro = readRuntimeAsset("intro.m");
const decodedIntro = decodeU6MSongRuntime(intro);
assert.equal(decodedIntro.ok, true, `intro.m should decode: ${decodedIntro.reason}`);
assert.ok(decodedIntro.data && decodedIntro.data.length > intro.length, "intro.m should inflate to larger command stream");

const bootup = readRuntimeAsset("bootup.m");
const decodedBootup = decodeU6MSongRuntime(bootup);
assert.equal(decodedBootup.ok, true, `bootup.m should decode: ${decodedBootup.reason}`);
assert.ok(decodedBootup.data && decodedBootup.data.length > bootup.length, "bootup.m should inflate to larger command stream");

const introSequencer = new U6MRegisterSequencerRuntime(decodedIntro.data!);
const introWrites = introSequencer.collectRegisterWrites(180);
assert.ok(introWrites.length > 100, "intro.m should emit many AdLib register writes");
assert.deepEqual(introWrites[0], { tick: 0, reg: 0x01, value: 0x20 }, "rewind should enter OPL2 mode first");
assert.ok(introWrites.some((w) => w.reg >= 0xa0 && w.reg <= 0xb8), "intro.m should emit frequency writes");
assert.ok(introWrites.some((w) => w.reg >= 0x20 && w.reg <= 0xf5), "intro.m should emit instrument/operator writes");

const ultimaWrites = collectU6MRegisterWritesRuntime(readRuntimeAsset("ultima.m"), 240);
assert.ok(ultimaWrites.length > 100, "ultima.m should emit register writes");
assert.ok(ultimaWrites.some((w) => w.tick > 0), "ultima.m writes should advance over ticks");

const bootupWrites = collectU6MRegisterWritesRuntime(bootup, 180);
assert.ok(bootupWrites.length > 50, "bootup.m should emit register writes for startup logo music");
assert.ok(bootupWrites.some((w) => w.reg >= 0xa0 && w.reg <= 0xb8), "bootup.m should emit frequency writes");

assert.equal(U6_ADLIB_TICK_HZ, 60, "U6 AdLib sequencer should run at Nuvie's 60 Hz cadence");
assert.ok(oplFnumToHzRuntime(0x58, 0x01) >= 20, "OPL F-number conversion should produce audible pitch");
assert.ok(oplFnumToHzRuntime(0xff, 0x1f) > oplFnumToHzRuntime(0x58, 0x01), "larger OPL block/F-number should raise pitch");
assert.equal(oplTotalLevelToGainRuntime(0x3f), Math.max(0, Math.min(1, Math.pow(10, (-0x3f * 0.75) / 20))), "OPL total level gain should use 0.75 dB steps");
assert.ok(oplTotalLevelToGainRuntime(0x00) > oplTotalLevelToGainRuntime(0x20), "lower OPL total level should be louder");

console.log("audio_u6m_music_runtime_test: ok");

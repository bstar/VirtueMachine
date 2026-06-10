import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { collectU6MRegisterWritesRuntime, decodeU6MSongRuntime, U6MRegisterSequencerRuntime } from "../audio/u6m_music_runtime.ts";

const RUNTIME_ASSETS = path.resolve(import.meta.dirname, "../../assets/runtime");

function readRuntimeAsset(name: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(RUNTIME_ASSETS, name)));
}

const intro = readRuntimeAsset("intro.m");
const decodedIntro = decodeU6MSongRuntime(intro);
assert.equal(decodedIntro.ok, true, `intro.m should decode: ${decodedIntro.reason}`);
assert.ok(decodedIntro.data && decodedIntro.data.length > intro.length, "intro.m should inflate to larger command stream");

const introSequencer = new U6MRegisterSequencerRuntime(decodedIntro.data!);
const introWrites = introSequencer.collectRegisterWrites(180);
assert.ok(introWrites.length > 100, "intro.m should emit many AdLib register writes");
assert.deepEqual(introWrites[0], { tick: 0, reg: 0x01, value: 0x20 }, "rewind should enter OPL2 mode first");
assert.ok(introWrites.some((w) => w.reg >= 0xa0 && w.reg <= 0xb8), "intro.m should emit frequency writes");
assert.ok(introWrites.some((w) => w.reg >= 0x20 && w.reg <= 0xf5), "intro.m should emit instrument/operator writes");

const ultimaWrites = collectU6MRegisterWritesRuntime(readRuntimeAsset("ultima.m"), 240);
assert.ok(ultimaWrites.length > 100, "ultima.m should emit register writes");
assert.ok(ultimaWrites.some((w) => w.tick > 0), "ultima.m writes should advance over ticks");

console.log("audio_u6m_music_runtime_test: ok");

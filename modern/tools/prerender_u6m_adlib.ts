import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { collectU6MPlaybackTraceRuntime } from "../client-web/audio/u6m_music_runtime.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ASSETS = path.join(ROOT, "modern/assets/runtime");
const OUT_DIR = path.join(ASSETS, "audio/adlib");
const RENDERER = path.join(ROOT, "build/opl_register_render");
const SONGS = ["bootup.m", "intro.m", "stones.m", "ultima.m"];
const TICK_HZ = 60;
const SAMPLE_RATE = 44100;

function renderSong(song: string) {
  const input = path.join(ASSETS, song);
  if (!fs.existsSync(input)) throw new Error(`missing song: ${input}`);
  if (!fs.existsSync(RENDERER)) throw new Error(`missing renderer: ${RENDERER}; run cmake --build build --target opl_register_render`);
  const bytes = new Uint8Array(fs.readFileSync(input));
  const trace = collectU6MPlaybackTraceRuntime(bytes, TICK_HZ * 240);
  const writes = trace.writes;
  if (writes.length < 10) throw new Error(`${song} produced too few register writes`);
  const loopStartTick = trace.loopStartTick ?? 0;
  const loopEndTick = trace.loopEndTick ?? (writes.length ? writes[writes.length - 1].tick : loopStartTick);
  const renderWrites = writes.slice();
  if (renderWrites.length && loopEndTick > renderWrites[renderWrites.length - 1].tick) {
    // Ensure the rendered WAV is long enough for browser loopEnd to match the U6M return tick.
    renderWrites.push({ tick: loopEndTick, reg: 0x01, value: 0x20 });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${song}.wav`);
  const stdin = renderWrites.map((w) => `${w.tick} ${w.reg.toString(16)} ${w.value.toString(16)}`).join("\n") + "\n";
  const res = spawnSync(RENDERER, [out, "0"], { input: stdin, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`${path.basename(RENDERER)} failed for ${song}: ${res.stderr || res.stdout}`);
  }
  const metadata = {
    song,
    sampleRate: SAMPLE_RATE,
    tickHz: TICK_HZ,
    loopStartTick,
    loopEndTick,
    loopStartSeconds: loopStartTick / TICK_HZ,
    loopEndSeconds: Math.max(loopStartTick + 1, loopEndTick) / TICK_HZ
  };
  fs.writeFileSync(path.join(OUT_DIR, `${song}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`rendered ${path.relative(ROOT, out)} (${writes.length} writes)`);
}

for (const song of SONGS) {
  renderSong(song);
}

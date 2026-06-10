import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { collectU6MRegisterWritesRuntime } from "../client-web/audio/u6m_music_runtime.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ASSETS = path.join(ROOT, "modern/assets/runtime");
const OUT_DIR = path.join(ASSETS, "audio/adlib");
const RENDERER = path.join(ROOT, "build/opl_register_render");
const SONGS = ["bootup.m", "intro.m", "ultima.m"];

function renderSong(song: string) {
  const input = path.join(ASSETS, song);
  if (!fs.existsSync(input)) throw new Error(`missing song: ${input}`);
  if (!fs.existsSync(RENDERER)) throw new Error(`missing renderer: ${RENDERER}; run cmake --build build --target opl_register_render`);
  const bytes = new Uint8Array(fs.readFileSync(input));
  const writes = collectU6MRegisterWritesRuntime(bytes, 60 * 90);
  if (writes.length < 10) throw new Error(`${song} produced too few register writes`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${song}.wav`);
  const stdin = writes.map((w) => `${w.tick} ${w.reg.toString(16)} ${w.value.toString(16)}`).join("\n") + "\n";
  const res = spawnSync(RENDERER, [out, "180"], { input: stdin, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`${path.basename(RENDERER)} failed for ${song}: ${res.stderr || res.stdout}`);
  }
  console.log(`rendered ${path.relative(ROOT, out)} (${writes.length} writes)`);
}

for (const song of SONGS) {
  renderSong(song);
}

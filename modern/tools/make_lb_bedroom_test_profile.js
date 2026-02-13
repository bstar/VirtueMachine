#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const PRISTINE_ROOT = path.join(ROOT, "modern", "assets", "pristine");

const PATCHES = [
  { object_key: "a12i096", x: 300, y: 350, z: 0, note: "clock" },
  { object_key: "a12i0ae", x: 301, y: 350, z: 0, note: "mirror" },
  { object_key: "a12i0ce", x: 301, y: 352, z: 0, note: "stool" },
  { object_key: "a12i0ff", x: 297, y: 355, z: 0, note: "book" },
  { object_key: "a12i0fe", x: 298, y: 355, z: 0, frame: 2, note: "table corner swap" },
  { object_key: "a12i100", x: 297, y: 355, z: 0, frame: 0, note: "table corner swap" },
  { object_key: "a12i116", x: 301, y: 357, z: 0, note: "plant down one cell" }
];

function parseArgs(argv) {
  const out = {
    from: "baseline_a",
    to: "lb-bedroom-test"
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--from" && next) { out.from = String(next).trim(); i += 1; continue; }
    if (a === "--to" && next) { out.to = String(next).trim(); i += 1; continue; }
  }
  return out;
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) {
      copyDir(s, d);
    } else if (ent.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function packCoord(x, y, z) {
  const xx = x & 0x3ff;
  const yy = y & 0x3ff;
  const zz = z & 0x0f;
  const b0 = xx & 0xff;
  const b1 = ((xx >> 8) & 0x03) | ((yy & 0x3f) << 2);
  const b2 = ((yy >> 6) & 0x0f) | (zz << 4);
  return [b0 & 0xff, b1 & 0xff, b2 & 0xff];
}

function parseObjectKey(k) {
  const m = /^a([0-9a-f]{2})i([0-9a-f]{3})$/i.exec(String(k || ""));
  if (!m) {
    throw new Error(`invalid object key: ${k}`);
  }
  return {
    area: parseInt(m[1], 16),
    index: parseInt(m[2], 16)
  };
}

function areaToObjblkName(area) {
  const ax = area & 0x07;
  const ay = (area >> 3) & 0x07;
  return `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
}

function patchObjblkRecord(filePath, index, x, y, z, frame = null) {
  const buf = fs.readFileSync(filePath);
  const count = buf[0] | (buf[1] << 8);
  if (index < 0 || index >= count) {
    throw new Error(`record index ${index} out of bounds in ${path.basename(filePath)} (count=${count})`);
  }
  const off = 2 + (index * 8);
  const [b0, b1, b2] = packCoord(x, y, z);
  buf[off + 1] = b0;
  buf[off + 2] = b1;
  buf[off + 3] = b2;
  if (Number.isInteger(frame) && frame >= 0 && frame <= 0x3f) {
    const shapeType = buf[off + 4] | (buf[off + 5] << 8);
    const type = shapeType & 0x03ff;
    const nextShapeType = type | ((frame & 0x3f) << 10);
    buf[off + 4] = nextShapeType & 0xff;
    buf[off + 5] = (nextShapeType >> 8) & 0xff;
  }
  fs.writeFileSync(filePath, buf);
}

function main() {
  const cfg = parseArgs(process.argv);
  const srcDir = path.join(PRISTINE_ROOT, "profiles", cfg.from, "savegame");
  const dstDir = path.join(PRISTINE_ROOT, "profiles", cfg.to, "savegame");

  if (!fs.existsSync(srcDir)) {
    throw new Error(`source profile missing: ${srcDir}`);
  }
  if (fs.existsSync(dstDir)) {
    fs.rmSync(path.join(PRISTINE_ROOT, "profiles", cfg.to), { recursive: true, force: true });
  }
  copyDir(srcDir, dstDir);

  const applied = [];
  for (const p of PATCHES) {
    const parsed = parseObjectKey(p.object_key);
    const fileName = areaToObjblkName(parsed.area);
    const filePath = path.join(dstDir, fileName);
    patchObjblkRecord(filePath, parsed.index, p.x, p.y, p.z, p.frame ?? null);
    applied.push({
      ...p,
      file: fileName,
      source_area: parsed.area,
      source_index: parsed.index
    });
  }

  const out = {
    kind: "VirtueMachineLBBedroomTestProfile",
    from_profile: cfg.from,
    to_profile: cfg.to,
    patches_applied: applied
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main();

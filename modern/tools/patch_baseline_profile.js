#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const PRISTINE_ROOT = path.join(ROOT, "modern", "assets", "pristine");

function parseArgs(argv) {
  const out = {
    from: "",
    to: "",
    sets: []
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    const next = argv[i + 1];
    if (a === "--from" && next) { out.from = String(next).trim(); i += 1; continue; }
    if (a === "--to" && next) { out.to = String(next).trim(); i += 1; continue; }
    if (a === "--set" && next) { out.sets.push(String(next)); i += 1; continue; }
  }
  if (!out.from || !out.to || out.sets.length === 0) {
    throw new Error("Usage: patch_baseline_profile.js --from <profile> --to <profile> --set <object_key:x,y,z> [--set ...]");
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

function packCoord(x, y, z) {
  const xx = x & 0x3ff;
  const yy = y & 0x3ff;
  const zz = z & 0x0f;
  const b0 = xx & 0xff;
  const b1 = ((xx >> 8) & 0x03) | ((yy & 0x3f) << 2);
  const b2 = ((yy >> 6) & 0x0f) | (zz << 4);
  return [b0 & 0xff, b1 & 0xff, b2 & 0xff];
}

function patchObjblkRecord(filePath, index, x, y, z) {
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
  fs.writeFileSync(filePath, buf);
}

function parseSetEntry(raw) {
  const m = /^([a-z0-9]+):(-?\d+),(-?\d+),(-?\d+)$/i.exec(String(raw || "").trim());
  if (!m) {
    throw new Error(`invalid --set entry: ${raw}`);
  }
  return {
    object_key: m[1],
    x: Number(m[2]) | 0,
    y: Number(m[3]) | 0,
    z: Number(m[4]) | 0
  };
}

function main() {
  const cfg = parseArgs(process.argv);
  const srcDir = path.join(PRISTINE_ROOT, "profiles", cfg.from, "savegame");
  const dstRoot = path.join(PRISTINE_ROOT, "profiles", cfg.to);
  const dstDir = path.join(dstRoot, "savegame");
  if (!fs.existsSync(srcDir)) {
    throw new Error(`source profile missing: ${srcDir}`);
  }
  if (fs.existsSync(dstRoot)) {
    fs.rmSync(dstRoot, { recursive: true, force: true });
  }
  copyDir(srcDir, dstDir);

  const applied = [];
  for (const s of cfg.sets.map(parseSetEntry)) {
    const parsed = parseObjectKey(s.object_key);
    const fileName = areaToObjblkName(parsed.area);
    patchObjblkRecord(path.join(dstDir, fileName), parsed.index, s.x, s.y, s.z);
    applied.push({
      ...s,
      source_area: parsed.area,
      source_index: parsed.index,
      file: fileName
    });
  }

  process.stdout.write(`${JSON.stringify({
    kind: "VirtueMachinePatchBaselineProfile",
    from_profile: cfg.from,
    to_profile: cfg.to,
    patches_applied: applied
  }, null, 2)}\n`);
}

main();

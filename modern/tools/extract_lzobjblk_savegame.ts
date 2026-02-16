#!/usr/bin/env bun
"use strict";

const fs = require("fs");
const path = require("path");

const AREA_SIDE = 8;
const AREA_COUNT = AREA_SIDE * AREA_SIDE;
const MAX_OBJBLK_RECORDS = 0x0c00;

function decompressU6Lzw(bytes) {
  if (!bytes || bytes.length < 4) {
    return bytes;
  }
  const target = bytes.readUInt32LE(0);
  if (target <= 0) {
    return bytes;
  }
  const src = bytes.subarray(4);
  const out = Buffer.alloc(target);
  let outPos = 0;
  let bitPos = 0;
  let codeSize = 9;
  let nextCode = 258;
  const CLEAR = 256;
  const END = 257;
  const table = new Array(4096);
  for (let i = 0; i < 256; i += 1) {
    table[i] = Buffer.from([i]);
  }
  let prev = null;

  function readCode(n) {
    let v = 0;
    for (let i = 0; i < n; i += 1) {
      const bi = (bitPos + i) >> 3;
      const bt = (bitPos + i) & 7;
      if (bi >= src.length) {
        return -1;
      }
      v |= ((src[bi] >> bt) & 1) << i;
    }
    bitPos += n;
    return v;
  }

  while (outPos < out.length) {
    const code = readCode(codeSize);
    if (code < 0) {
      break;
    }
    if (code === CLEAR) {
      for (let i = 258; i < table.length; i += 1) {
        table[i] = undefined;
      }
      codeSize = 9;
      nextCode = 258;
      prev = null;
      continue;
    }
    if (code === END) {
      break;
    }

    let entry;
    if (table[code]) {
      entry = table[code];
    } else if (code === nextCode && prev) {
      entry = Buffer.concat([prev, prev.subarray(0, 1)]);
    } else {
      break;
    }

    entry.copy(out, outPos);
    outPos += entry.length;

    if (prev && nextCode < 4096) {
      table[nextCode] = Buffer.concat([prev, entry.subarray(0, 1)]);
      nextCode += 1;
      if ((nextCode === 512 || nextCode === 1024 || nextCode === 2048) && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }
  return out.subarray(0, outPos);
}

function areaName(areaId) {
  const ax = areaId & 7;
  const ay = (areaId >> 3) & 7;
  return `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
}

function usage() {
  console.error("Usage: extract_lzobjblk_savegame.ts <lzobjblk_path> <out_dir>");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    usage();
    process.exit(2);
  }
  const lzPath = path.resolve(args[0]);
  const outDir = path.resolve(args[1]);
  const src = fs.readFileSync(lzPath);
  const dec = decompressU6Lzw(src);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const segments = [];
  let off = 0;
  for (let seg = 0; seg < AREA_COUNT; seg += 1) {
    if ((off + 2) > dec.length) {
      throw new Error(`truncated lzobjblk before segment ${seg} at offset ${off}`);
    }
    const count = dec.readUInt16LE(off);
    if (count > MAX_OBJBLK_RECORDS) {
      throw new Error(`invalid objblk count ${count} at segment ${seg} offset ${off}`);
    }
    const len = 2 + (count * 8);
    if ((off + len) > dec.length) {
      throw new Error(`segment ${seg} overruns decoded stream (len=${len}, off=${off}, size=${dec.length})`);
    }
    const blk = dec.subarray(off, off + len);
    const areaCounts = new Map();
    for (let i = 0; i < count; i += 1) {
      const ro = off + 2 + (i * 8);
      const status = dec[ro + 0] & 0xff;
      if ((status & 0x18) !== 0) {
        continue;
      }
      const x = (dec[ro + 1] & 0xff) | ((dec[ro + 2] & 0x03) << 8);
      const y = ((dec[ro + 2] & 0xff) >> 2) | ((dec[ro + 3] & 0x0f) << 6);
      const areaId = (((y >> 7) & 0x07) << 3) | ((x >> 7) & 0x07);
      areaCounts.set(areaId, (areaCounts.get(areaId) || 0) + 1);
    }
    let preferredArea = -1;
    let preferredCount = -1;
    for (const [aid, c] of areaCounts.entries()) {
      if (c > preferredCount || (c === preferredCount && aid < preferredArea)) {
        preferredArea = aid;
        preferredCount = c;
      }
    }
    segments.push({
      seg,
      blk,
      preferredArea,
      preferredCount
    });
    off += len;
  }

  if (off !== dec.length) {
    throw new Error(`decoded lzobjblk has trailing bytes: parsed=${off} total=${dec.length}`);
  }

  const assignedAreaBySeg = new Array(AREA_COUNT).fill(-1);
  const usedAreas = new Set();

  const ranked = segments
    .filter((s) => s.preferredArea >= 0)
    .sort((a, b) => {
      if (a.preferredCount !== b.preferredCount) {
        return b.preferredCount - a.preferredCount;
      }
      return a.seg - b.seg;
    });

  for (const s of ranked) {
    if (usedAreas.has(s.preferredArea)) {
      continue;
    }
    assignedAreaBySeg[s.seg] = s.preferredArea;
    usedAreas.add(s.preferredArea);
  }

  const remainingAreas = [];
  for (let aid = 0; aid < AREA_COUNT; aid += 1) {
    if (!usedAreas.has(aid)) {
      remainingAreas.push(aid);
    }
  }
  for (const s of segments) {
    if (assignedAreaBySeg[s.seg] >= 0) {
      continue;
    }
    if (remainingAreas.length === 0) {
      throw new Error("internal error: no area ids left for unassigned segments");
    }
    assignedAreaBySeg[s.seg] = remainingAreas.shift();
  }

  for (const s of segments) {
    const aid = assignedAreaBySeg[s.seg];
    fs.writeFileSync(path.join(outDir, areaName(aid)), s.blk);
  }
}

main();

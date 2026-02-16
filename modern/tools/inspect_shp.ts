#!/usr/bin/env bun
"use strict";

const fs = require("fs");
const path = require("path");

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

function readU32List(buf, off, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const p = off + (i * 4);
    if ((p + 4) > buf.length) {
      break;
    }
    out.push(buf.readUInt32LE(p));
  }
  return out;
}

function monotonicOffsets(arr, max) {
  let prev = -1;
  for (const v of arr) {
    if (v <= 0 || v >= max || v <= prev) {
      return false;
    }
    prev = v;
  }
  return arr.length > 0;
}

function inspectFile(filePath) {
  const src = fs.readFileSync(filePath);
  const dec = decompressU6Lzw(src);
  const info = {
    file: filePath,
    sourceBytes: src.length,
    compressedTargetU32: src.length >= 4 ? src.readUInt32LE(0) : null,
    decodedBytes: dec.length,
    headerU32_0: dec.length >= 4 ? dec.readUInt32LE(0) : null,
    headerU32_1: dec.length >= 8 ? dec.readUInt32LE(4) : null,
    tableCandidate: null
  };

  if (dec.length >= 12) {
    const count = dec.readUInt32LE(4);
    if (count > 0 && count < 2048) {
      const offs = readU32List(dec, 8, count);
      if (offs.length === count && monotonicOffsets(offs, dec.length)) {
        info.tableCandidate = {
          type: "u32_offsets_after_8",
          count,
          first: offs[0],
          last: offs[offs.length - 1]
        };
      } else {
        info.tableCandidate = {
          type: "u32_offsets_after_8",
          count,
          monotonic: false,
          sample: offs.slice(0, 8)
        };
      }
    }
  }

  return info;
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("Usage: inspect_shp.ts <file> [file...]");
    process.exit(2);
  }
  const results = [];
  for (const input of args) {
    const filePath = path.resolve(input);
    results.push(inspectFile(filePath));
  }
  console.log(JSON.stringify(results, null, 2));
}

main();

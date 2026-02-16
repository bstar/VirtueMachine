#!/usr/bin/env bun
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const EXPECTED = [
  { name: "clock", object_key: "a12i096", type: 0x09f, frame: 1, x: 300, y: 350, z: 0 },
  { name: "mirror", object_key: "a12i0ae", type: 0x07b, frame: 0, x: 301, y: 350, z: 0 },
  { name: "stool", object_key: "a12i0ce", type: 0x0fc, frame: 2, x: 301, y: 352, z: 0 }
];

function parseArgs(argv) {
  const out = {
    api: "http://127.0.0.1:8081",
    user: "avatar",
    pass: "boob",
    x: 299,
    y: 351,
    z: 0,
    radius: 12
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--api" && next) { out.api = String(next).trim(); i += 1; continue; }
    if (a === "--user" && next) { out.user = String(next).trim(); i += 1; continue; }
    if (a === "--pass" && next) { out.pass = String(next); i += 1; continue; }
    if (a === "--x" && next) { out.x = Number(next) | 0; i += 1; continue; }
    if (a === "--y" && next) { out.y = Number(next) | 0; i += 1; continue; }
    if (a === "--z" && next) { out.z = Number(next) | 0; i += 1; continue; }
    if (a === "--radius" && next) { out.radius = Math.max(0, Number(next) | 0); i += 1; continue; }
  }
  return out;
}

async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body && body.error && body.error.message ? body.error.message : `${res.status} ${res.statusText}`;
    throw new Error(`${url}: ${msg}`);
  }
  return body;
}

function scoreDistance(a, b) {
  return Math.abs((a.x | 0) - (b.x | 0)) + Math.abs((a.y | 0) - (b.y | 0)) + (Math.abs((a.z | 0) - (b.z | 0)) * 1000);
}

function findBestActual(objects, expected) {
  if (expected && expected.object_key) {
    const exact = objects.find((o) => String(o.object_key || "").toLowerCase() === String(expected.object_key).toLowerCase());
    if (exact) {
      return exact;
    }
  }
  const candidates = objects.filter((o) => ((o.type | 0) === (expected.type | 0)) && ((o.frame | 0) === (expected.frame | 0)));
  if (!candidates.length) {
    return null;
  }
  let best = candidates[0];
  let bestScore = scoreDistance(best, expected);
  for (let i = 1; i < candidates.length; i += 1) {
    const s = scoreDistance(candidates[i], expected);
    if (s < bestScore) {
      best = candidates[i];
      bestScore = s;
    }
  }
  return best;
}

async function main() {
  const cfg = parseArgs(process.argv);
  const apiBase = cfg.api.replace(/\/+$/, "");
  const auth = await jsonFetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cfg.user, password: cfg.pass })
  });

  const out = await jsonFetch(
    `${apiBase}/api/world/objects?x=${encodeURIComponent(cfg.x)}&y=${encodeURIComponent(cfg.y)}&z=${encodeURIComponent(cfg.z)}&radius=${encodeURIComponent(cfg.radius)}&limit=2000&projection=footprint&include_footprint=1`,
    {
      method: "GET",
      headers: { authorization: `Bearer ${auth.token}` }
    }
  );

  const objects = Array.isArray(out && out.objects) ? out.objects : [];
  const report = {
    kind: "VirtueMachineLBBedroomDiff",
    at: new Date().toISOString(),
    api_base: apiBase,
    query: { x: cfg.x, y: cfg.y, z: cfg.z, radius: cfg.radius },
    meta: out && out.meta ? out.meta : null,
    expected: EXPECTED,
    diffs: []
  };

  for (const exp of EXPECTED) {
    const actual = findBestActual(objects, exp);
    if (!actual) {
      report.diffs.push({
        name: exp.name,
        expected: exp,
        found: false
      });
      continue;
    }
    report.diffs.push({
      name: exp.name,
      expected: exp,
      found: true,
      actual: {
        object_key: String(actual.object_key || ""),
        type: Number(actual.type) | 0,
        frame: Number(actual.frame) | 0,
        tile_id: Number(actual.tile_id) & 0xffff,
        x: Number(actual.x) | 0,
        y: Number(actual.y) | 0,
        z: Number(actual.z) | 0
      },
      delta: {
        dx: (Number(actual.x) | 0) - exp.x,
        dy: (Number(actual.y) | 0) - exp.y,
        dz: (Number(actual.z) | 0) - exp.z
      }
    });
  }

  const outFile = path.resolve("modern/net/data/lb_bedroom_diff.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  process.stdout.write("VirtueMachine LB Bedroom Diff\n");
  for (const row of report.diffs) {
    if (!row.found) {
      process.stdout.write(`- ${row.name}: expected ${row.expected.x},${row.expected.y},${row.expected.z} type=0x${row.expected.type.toString(16)} frame=${row.expected.frame} -> NOT FOUND\n`);
      continue;
    }
    process.stdout.write(`- ${row.name}: expected ${row.expected.x},${row.expected.y},${row.expected.z} -> actual ${row.actual.x},${row.actual.y},${row.actual.z} delta=(${row.delta.dx},${row.delta.dy},${row.delta.dz})\n`);
  }
  process.stdout.write(`Saved: ${outFile}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${String(err && err.message ? err.message : err)}\n`);
  process.exit(1);
});

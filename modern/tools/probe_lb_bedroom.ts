#!/usr/bin/env bun
"use strict";

const fs = require("node:fs");

function parseArgs(argv) {
  const out = {
    base: "http://127.0.0.1:8081",
    user: "avatar",
    pass: "quest123",
    x: 299,
    y: 351,
    z: 0,
    radius: 8,
    out: "./modern/net/data/lb_bedroom_probe.json"
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--base" && next) { out.base = String(next); i += 1; continue; }
    if (a === "--user" && next) { out.user = String(next); i += 1; continue; }
    if (a === "--pass" && next) { out.pass = String(next); i += 1; continue; }
    if (a === "--x" && next) { out.x = Number(next) | 0; i += 1; continue; }
    if (a === "--y" && next) { out.y = Number(next) | 0; i += 1; continue; }
    if (a === "--z" && next) { out.z = Number(next) | 0; i += 1; continue; }
    if (a === "--radius" && next) { out.radius = Math.max(0, Number(next) | 0); i += 1; continue; }
    if (a === "--out" && next) { out.out = String(next); i += 1; continue; }
  }
  return out;
}

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body && body.error && body.error.message ? body.error.message : `${res.status} ${res.statusText}`;
    throw new Error(`${url}: ${msg}`);
  }
  return body;
}

function stableSort(objects) {
  return [...objects].sort((a, b) => {
    if ((a.y | 0) !== (b.y | 0)) return (a.y | 0) - (b.y | 0);
    if ((a.x | 0) !== (b.x | 0)) return (a.x | 0) - (b.x | 0);
    if ((a.z | 0) !== (b.z | 0)) return (a.z | 0) - (b.z | 0);
    if ((a.type | 0) !== (b.type | 0)) return (a.type | 0) - (b.type | 0);
    return String(a.object_key || "").localeCompare(String(b.object_key || ""));
  });
}

async function main() {
  const cfg = parseArgs(process.argv);
  const base = cfg.base.replace(/\/+$/, "");
  const login = await jsonFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cfg.user, password: cfg.pass })
  });
  const token = String(login && login.token || "");
  if (!token) {
    throw new Error("login did not return token");
  }

  const q = new URLSearchParams({
    x: String(cfg.x | 0),
    y: String(cfg.y | 0),
    z: String(cfg.z | 0),
    radius: String(cfg.radius | 0),
    projection: "footprint",
    include_footprint: "1",
    limit: "8192"
  });
  const world = await jsonFetch(`${base}/api/world/objects?${q.toString()}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` }
  });

  const objects = stableSort(Array.isArray(world && world.objects) ? world.objects : []).map((o) => ({
    object_key: String(o.object_key || ""),
    source_kind: String(o.source_kind || ""),
    source_area: Number(o.source_area) >>> 0,
    source_index: Number(o.source_index) >>> 0,
    type: Number(o.type) & 0x3ff,
    frame: Number(o.frame) | 0,
    tile_id: Number(o.tile_id) & 0xffff,
    x: Number(o.x) | 0,
    y: Number(o.y) | 0,
    z: Number(o.z) | 0,
    footprint: Array.isArray(o.footprint)
      ? o.footprint.map((c) => ({ x: Number(c.x) | 0, y: Number(c.y) | 0, z: Number(c.z) | 0 }))
      : []
  }));

  const report = {
    kind: "VirtueMachineLBBedroomProbe",
    at: new Date().toISOString(),
    query: {
      x: cfg.x | 0,
      y: cfg.y | 0,
      z: cfg.z | 0,
      radius: cfg.radius | 0,
      projection: "footprint"
    },
    meta: world && world.meta ? world.meta : null,
    count: objects.length,
    objects
  };

  fs.mkdirSync(require("node:path").dirname(cfg.out), { recursive: true });
  fs.writeFileSync(cfg.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  process.stdout.write(`Wrote ${objects.length} objects to ${cfg.out}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

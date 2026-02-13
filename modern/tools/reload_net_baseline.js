#!/usr/bin/env node
"use strict";

const DEFAULTS = {
  api: "http://127.0.0.1:8081",
  user: "avatar",
  pass: "boob"
};

function parseArgs(argv) {
  const out = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--api" && next) { out.api = String(next).trim(); i += 1; continue; }
    if (a === "--user" && next) { out.user = String(next).trim(); i += 1; continue; }
    if (a === "--pass" && next) { out.pass = String(next); i += 1; continue; }
  }
  return out;
}

async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body && body.error && body.error.message ? body.error.message : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body;
}

async function main() {
  const cfg = parseArgs(process.argv);
  const base = cfg.api.replace(/\/+$/, "");
  const auth = await jsonFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cfg.user, password: cfg.pass })
  });
  if (!auth || !auth.token) {
    throw new Error("login succeeded but token missing");
  }
  const out = await jsonFetch(`${base}/api/world/objects/reload-baseline`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth.token}`
    },
    body: "{}"
  });
  process.stdout.write(`${JSON.stringify({
    kind: "VirtueMachineReloadBaselineResult",
    api_base: base,
    user: cfg.user,
    ok: true,
    meta: out && out.meta ? out.meta : null
  }, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${String(err && err.message ? err.message : err)}\n`);
  process.exit(1);
});

#!/usr/bin/env bun
"use strict";

const DEFAULTS = {
  api: "http://127.0.0.1:8081",
  user: "avatar",
  pass: "boob"
};

type ReloadConfig = typeof DEFAULTS;

type JsonObject = Record<string, unknown>;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function parseArgs(argv: readonly string[]): ReloadConfig {
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

async function jsonFetch(url: string, opts: RequestInit): Promise<JsonObject | null> {
  const res = await fetch(url, opts);
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) as JsonObject : null;
  if (!res.ok) {
    const error = body?.error as { message?: unknown } | undefined;
    const msg = error?.message ? String(error.message) : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body;
}

async function main(): Promise<void> {
  const cfg = parseArgs(process.argv);
  const base = cfg.api.replace(/\/+$/, "");
  const auth = await jsonFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cfg.user, password: cfg.pass })
  });
  const token = String(auth?.token || "");
  if (!token) {
    throw new Error("login succeeded but token missing");
  }
  const out = await jsonFetch(`${base}/api/world/objects/reload-baseline`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: "{}"
  });
  process.stdout.write(`${JSON.stringify({
    kind: "VirtueMachineReloadBaselineResult",
    api_base: base,
    user: cfg.user,
    ok: true,
    meta: out?.meta || null
  }, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${errorMessage(err)}\n`);
  process.exit(1);
});

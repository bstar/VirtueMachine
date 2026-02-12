"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = process.env.VM_NET_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.VM_NET_PORT || "8081", 10);
const DATA_DIR = process.env.VM_NET_DATA_DIR || path.join(__dirname, "data");
const MAX_BODY = 1024 * 1024;
const SERVER_TICK_MS = 100;
const SERVER_TICKS_PER_MINUTE = 4;
const SERVER_MINUTES_PER_HOUR = 60;
const SERVER_HOURS_PER_DAY = 24;
const SERVER_DAYS_PER_MONTH = 28;
const SERVER_MONTHS_PER_YEAR = 13;

const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  tokens: path.join(DATA_DIR, "tokens.json"),
  characters: path.join(DATA_DIR, "characters.json"),
  emailOutbox: path.join(DATA_DIR, "email_outbox.log"),
  presence: path.join(DATA_DIR, "presence.json"),
  worldClock: path.join(DATA_DIR, "world_clock.json"),
  criticalPolicy: path.join(DATA_DIR, "critical_item_policy.json"),
  recoveriesLog: path.join(DATA_DIR, "critical_item_recoveries.log")
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonLine(filePath, value) {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function readJsonLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch (_err) {
        // Ignore malformed lines to keep the log append-only and resilient.
      }
    }
    return parsed;
  } catch (_err) {
    return [];
  }
}

function normalizeUsername(raw) {
  return String(raw || "").trim().toLowerCase();
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function isValidEmail(raw) {
  const v = normalizeEmail(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function newUserId(state) {
  for (;;) {
    const id = `usr_${crypto.randomBytes(8).toString("hex")}`;
    if (!state.users.find((u) => u.user_id === id)) {
      return id;
    }
  }
}

function findUserByUsername(state, username) {
  const wanted = normalizeUsername(username);
  return state.users.find((u) => normalizeUsername(u.username) === wanted) || null;
}

function ensureUserSchema(user) {
  if (!user || typeof user !== "object") {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(user, "email")) {
    user.email = "";
  }
  if (!Object.prototype.hasOwnProperty.call(user, "email_verified")) {
    user.email_verified = false;
  }
  if (!user.email_verification || typeof user.email_verification !== "object") {
    user.email_verification = null;
  }
}

function parseAuth(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

function sendJson(res, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  });
  res.end(body);
}

function sendError(res, status, code, message) {
  sendJson(res, status, {
    error: {
      code,
      message
    }
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_err) {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function defaultCriticalPolicy() {
  return [
    {
      item_id: "item_moonstone",
      policy_type: "regenerative_unique",
      anchor_locations: [{ x: 307, y: 347, z: 0 }],
      cooldown_ticks: 120,
      min_count: 1,
      quest_gate: null
    }
  ];
}

function defaultWorldClock() {
  return {
    tick: 0,
    time_m: 0,
    time_h: 0,
    date_d: 1,
    date_m: 1,
    date_y: 1,
    last_advanced_at_ms: Date.now()
  };
}

function normalizeWorldClock(raw) {
  const base = defaultWorldClock();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  return {
    tick: Number(raw.tick) >>> 0,
    time_m: Number(raw.time_m) >>> 0,
    time_h: Number(raw.time_h) >>> 0,
    date_d: Number(raw.date_d) >>> 0 || 1,
    date_m: Number(raw.date_m) >>> 0 || 1,
    date_y: Number(raw.date_y) >>> 0 || 1,
    last_advanced_at_ms: Number(raw.last_advanced_at_ms) || Date.now()
  };
}

function advanceWorldClockMinute(clock) {
  clock.time_m += 1;
  if (clock.time_m < SERVER_MINUTES_PER_HOUR) return;
  clock.time_m = 0;
  clock.time_h += 1;
  if (clock.time_h < SERVER_HOURS_PER_DAY) return;
  clock.time_h = 0;
  clock.date_d += 1;
  if (clock.date_d <= SERVER_DAYS_PER_MONTH) return;
  clock.date_d = 1;
  clock.date_m += 1;
  if (clock.date_m <= SERVER_MONTHS_PER_YEAR) return;
  clock.date_m = 1;
  clock.date_y += 1;
}

function updateAuthoritativeClock(state) {
  const nowMs = Date.now();
  if (!state.worldClock) {
    state.worldClock = defaultWorldClock();
  }
  const clock = state.worldClock;
  let deltaMs = nowMs - Number(clock.last_advanced_at_ms || 0);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    deltaMs = 0;
  }
  const steps = Math.floor(deltaMs / SERVER_TICK_MS);
  if (steps <= 0) {
    return clock;
  }
  for (let i = 0; i < steps; i += 1) {
    clock.tick = (clock.tick + 1) >>> 0;
    if ((clock.tick % SERVER_TICKS_PER_MINUTE) === 0) {
      advanceWorldClockMinute(clock);
    }
  }
  clock.last_advanced_at_ms = nowMs - (deltaMs % SERVER_TICK_MS);
  return clock;
}

function loadState() {
  ensureDataDir();
  const state = {
    users: readJson(FILES.users, []),
    tokens: readJson(FILES.tokens, []),
    characters: readJson(FILES.characters, []),
    presence: readJson(FILES.presence, []),
    worldClock: normalizeWorldClock(readJson(FILES.worldClock, defaultWorldClock())),
    criticalPolicy: readJson(FILES.criticalPolicy, defaultCriticalPolicy())
  };
  if (!Array.isArray(state.criticalPolicy) || !state.criticalPolicy.length) {
    state.criticalPolicy = defaultCriticalPolicy();
  }
  if (!Array.isArray(state.presence)) {
    state.presence = [];
  }
  for (const user of state.users) {
    ensureUserSchema(user);
  }
  return state;
}

function persistState(state) {
  writeJson(FILES.users, state.users);
  writeJson(FILES.tokens, state.tokens);
  writeJson(FILES.characters, state.characters);
  writeJson(FILES.presence, state.presence);
  writeJson(FILES.worldClock, state.worldClock);
  writeJson(FILES.criticalPolicy, state.criticalPolicy);
}

function requireUser(state, req, res) {
  const token = parseAuth(req);
  if (!token) {
    sendError(res, 401, "auth_required", "Missing bearer token");
    return null;
  }
  const now = Date.now();
  const row = state.tokens.find((t) => t.token === token && t.expires_at_ms > now);
  if (!row) {
    sendError(res, 401, "auth_invalid", "Invalid or expired token");
    return null;
  }
  const user = state.users.find((u) => u.user_id === row.user_id);
  if (!user) {
    sendError(res, 401, "auth_invalid", "Token user not found");
    return null;
  }
  return user;
}

function issueToken(state, userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const ttlMs = 1000 * 60 * 60 * 24 * 7;
  state.tokens.push({
    token,
    user_id: userId,
    issued_at: nowIso(),
    expires_at_ms: Date.now() + ttlMs
  });
  return token;
}

function issueEmailVerificationCode(user) {
  const code = String(Math.floor(100000 + (Math.random() * 900000)));
  user.email_verification = {
    code,
    issued_at: nowIso(),
    expires_at_ms: Date.now() + (1000 * 60 * 15)
  };
  return code;
}

function emitEmailOutbox(toEmail, subject, bodyText, meta = {}) {
  const delivery = {
    kind: "email_delivery",
    at: nowIso(),
    to: normalizeEmail(toEmail),
    subject: String(subject || ""),
    body_text: String(bodyText || ""),
    ...meta
  };
  appendJsonLine(FILES.emailOutbox, delivery);
  return delivery;
}

function listUserCharacters(state, userId) {
  return state.characters.filter((c) => c.user_id === userId).map((c) => ({
    character_id: c.character_id,
    user_id: c.user_id,
    name: c.name,
    created_at: c.created_at,
    updated_at: c.updated_at,
    snapshot_meta: c.snapshot_meta
  }));
}

function computeSnapshotHash(snapshotBase64) {
  return crypto.createHash("sha256").update(snapshotBase64 || "").digest("hex");
}

function deterministicRecoveryTickLast(events, itemId) {
  const filtered = events.filter((e) => e.item_id === itemId).sort((a, b) => b.tick - a.tick);
  return filtered.length ? filtered[0].tick : null;
}

function runCriticalItemMaintenance(state, payload) {
  const tick = Number(payload && payload.tick);
  const worldItems = Array.isArray(payload && payload.world_items) ? payload.world_items : [];
  const recoveryEvents = readJsonLines(FILES.recoveriesLog);
  const emitted = [];

  const sortedPolicy = [...state.criticalPolicy].sort((a, b) => String(a.item_id).localeCompare(String(b.item_id)));

  for (const policy of sortedPolicy) {
    const itemId = String(policy.item_id || "");
    if (!itemId) {
      continue;
    }
    const existing = worldItems.filter((w) => String(w.item_id) === itemId && w.reachable !== false);
    const minCount = Number.isFinite(policy.min_count) ? Math.max(1, policy.min_count | 0) : 1;
    const cooldown = Number.isFinite(policy.cooldown_ticks) ? Math.max(0, policy.cooldown_ticks | 0) : 0;
    const lastTick = deterministicRecoveryTickLast(recoveryEvents, itemId);
    const cooldownReady = lastTick == null || !Number.isFinite(tick) || ((tick - lastTick) >= cooldown);

    let needsRecovery = false;
    if (policy.policy_type === "instance_quota") {
      needsRecovery = existing.length < minCount;
    } else {
      needsRecovery = existing.length < 1;
    }

    if (!needsRecovery || !cooldownReady) {
      continue;
    }

    const anchor = Array.isArray(policy.anchor_locations) && policy.anchor_locations.length
      ? policy.anchor_locations[0]
      : { x: 0, y: 0, z: 0 };

    const event = {
      kind: "critical_item_recovery",
      at: nowIso(),
      tick: Number.isFinite(tick) ? tick : null,
      item_id: itemId,
      reason: existing.length ? "below_min_count" : "missing_or_unreachable",
      restored_to: {
        x: anchor.x | 0,
        y: anchor.y | 0,
        z: anchor.z | 0
      }
    };
    emitted.push(event);
    appendJsonLine(FILES.recoveriesLog, event);
  }

  return emitted;
}

const state = loadState();
persistState(state);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-max-age": "86400"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    updateAuthoritativeClock(state);
    persistState(state);
    sendJson(res, 200, { ok: true, service: "virtuemachine-net", now: nowIso(), tick: state.worldClock.tick >>> 0 });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const username = normalizeUsername(body && body.username);
    const password = String(body && body.password || "");
    if (!username || username.length < 2) {
      sendError(res, 400, "bad_username", "username is required");
      return;
    }
    if (!password) {
      sendError(res, 400, "bad_password", "password is required");
      return;
    }

    let user = findUserByUsername(state, username);
    if (!user) {
      user = {
        user_id: newUserId(state),
        username,
        password_plaintext: password,
        email: "",
        email_verified: false,
        email_verification: null,
        created_at: nowIso()
      };
      state.users.push(user);
    } else if (!user.password_plaintext) {
      user.password_plaintext = password;
    } else if (user.password_plaintext !== password) {
      sendError(res, 401, "auth_invalid", "invalid username/password");
      return;
    }
    const token = issueToken(state, user.user_id);
    persistState(state);
    sendJson(res, 200, {
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: String(user.email || ""),
        email_verified: !!user.email_verified
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/set-email") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const email = normalizeEmail(body && body.email);
    if (!isValidEmail(email)) {
      sendError(res, 400, "bad_email", "valid email is required");
      return;
    }
    if (email !== normalizeEmail(user.email || "")) {
      user.email_verified = false;
      user.email_verification = null;
    }
    user.email = email;
    persistState(state);
    sendJson(res, 200, {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        email_verified: !!user.email_verified
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/send-email-verification") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    const email = normalizeEmail(user.email || "");
    if (!isValidEmail(email)) {
      sendError(res, 400, "bad_email", "set a valid email first");
      return;
    }
    const code = issueEmailVerificationCode(user);
    const delivery = emitEmailOutbox(
      email,
      "VirtueMachine Email Verification",
      `Your VirtueMachine verification code is: ${code}`,
      { user_id: user.user_id, template: "verify_email" }
    );
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      delivery_id: `${delivery.at}:${delivery.to}`,
      email: email,
      expires_at_ms: user.email_verification.expires_at_ms
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const code = String(body && body.code || "").trim();
    if (!code) {
      sendError(res, 400, "bad_code", "verification code is required");
      return;
    }
    const pending = user.email_verification;
    if (!pending || typeof pending !== "object") {
      sendError(res, 409, "no_pending_verification", "no pending email verification");
      return;
    }
    if (Number(pending.expires_at_ms) < Date.now()) {
      user.email_verification = null;
      persistState(state);
      sendError(res, 410, "verification_expired", "verification code expired");
      return;
    }
    if (String(pending.code || "") !== code) {
      sendError(res, 401, "verification_invalid", "invalid verification code");
      return;
    }
    user.email_verified = true;
    user.email_verification = null;
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: String(user.email || ""),
        email_verified: true
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/recover-password") {
    const username = normalizeUsername(url.searchParams.get("username") || "");
    const email = normalizeEmail(url.searchParams.get("email") || "");
    if (!username || username.length < 2) {
      sendError(res, 400, "bad_username", "username is required");
      return;
    }
    if (!isValidEmail(email)) {
      sendError(res, 400, "bad_email", "email is required");
      return;
    }
    const user = findUserByUsername(state, username);
    if (!user) {
      sendError(res, 404, "user_not_found", "user not found");
      return;
    }
    if (!user.email_verified) {
      sendError(res, 403, "email_unverified", "email must be verified before password recovery");
      return;
    }
    if (normalizeEmail(user.email || "") !== email) {
      sendError(res, 401, "email_mismatch", "email does not match account");
      return;
    }
    const delivery = emitEmailOutbox(
      email,
      "VirtueMachine Password Recovery",
      `Your VirtueMachine password is: ${String(user.password_plaintext || "")}`,
      { user_id: user.user_id, template: "recover_password" }
    );
    persistState(state);
    sendJson(res, 200, {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: String(user.email || ""),
        email_verified: !!user.email_verified
      },
      delivered: true,
      delivery_id: `${delivery.at}:${delivery.to}`
    });
    return;
  }

  const user = requireUser(state, req, res);
  if (!user) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/characters") {
    sendJson(res, 200, { characters: listUserCharacters(state, user.user_id) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/characters") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const name = String(body && body.name || "").trim();
    if (!name || name.length < 2) {
      sendError(res, 400, "bad_character_name", "name is required");
      return;
    }

    const c = {
      character_id: crypto.randomUUID(),
      user_id: user.user_id,
      name,
      created_at: nowIso(),
      updated_at: nowIso(),
      snapshot_meta: {
        schema_version: 1,
        sim_core_version: "unknown",
        saved_tick: 0,
        snapshot_hash: null
      },
      snapshot_base64: null
    };
    state.characters.push(c);
    persistState(state);
    sendJson(res, 201, {
      character_id: c.character_id,
      name: c.name,
      user_id: c.user_id,
      snapshot_meta: c.snapshot_meta
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/critical-items/policy") {
    sendJson(res, 200, { critical_item_policy: state.criticalPolicy });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/critical-items/policy") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    if (!Array.isArray(body && body.critical_item_policy)) {
      sendError(res, 400, "bad_policy", "critical_item_policy array is required");
      return;
    }
    state.criticalPolicy = body.critical_item_policy;
    persistState(state);
    sendJson(res, 200, { critical_item_policy: state.criticalPolicy });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/critical-items/maintenance") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const events = runCriticalItemMaintenance(state, body || {});
    sendJson(res, 200, { events });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/presence/heartbeat") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const sessionId = String(body && body.session_id || "").trim();
    if (!sessionId || sessionId.length < 8) {
      sendError(res, 400, "bad_session_id", "session_id is required");
      return;
    }
    const nowMs = Date.now();
    const clock = updateAuthoritativeClock(state);
    const row = {
      user_id: user.user_id,
      username: user.username,
      session_id: sessionId,
      character_name: String(body && body.character_name || "").trim(),
      map_x: Number(body && body.map_x) | 0,
      map_y: Number(body && body.map_y) | 0,
      map_z: Number(body && body.map_z) | 0,
      facing_dx: Number(body && body.facing_dx) | 0,
      facing_dy: Number(body && body.facing_dy) | 0,
      tick: clock.tick >>> 0,
      mode: String(body && body.mode || "avatar"),
      updated_at_ms: nowMs
    };
    const key = `${row.user_id}:${row.session_id}`;
    let replaced = false;
    state.presence = state.presence.map((p) => {
      const pKey = `${String(p.user_id || "")}:${String(p.session_id || "")}`;
      if (pKey === key) {
        replaced = true;
        return row;
      }
      return p;
    });
    if (!replaced) {
      state.presence.push(row);
    }
    const cutoff = nowMs - 15000;
    state.presence = state.presence.filter((p) => Number(p.updated_at_ms || 0) >= cutoff);
    persistState(state);
    sendJson(res, 200, { ok: true, now: nowIso(), tick: clock.tick >>> 0 });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/clock") {
    const clock = updateAuthoritativeClock(state);
    persistState(state);
    sendJson(res, 200, {
      tick: clock.tick >>> 0,
      time_m: clock.time_m >>> 0,
      time_h: clock.time_h >>> 0,
      date_d: clock.date_d >>> 0,
      date_m: clock.date_m >>> 0,
      date_y: clock.date_y >>> 0
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/presence") {
    const nowMs = Date.now();
    const cutoff = nowMs - 15000;
    state.presence = state.presence.filter((p) => Number(p.updated_at_ms || 0) >= cutoff);
    persistState(state);
    sendJson(res, 200, {
      players: state.presence.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        session_id: p.session_id,
        character_name: p.character_name,
        map_x: p.map_x | 0,
        map_y: p.map_y | 0,
        map_z: p.map_z | 0,
        facing_dx: p.facing_dx | 0,
        facing_dy: p.facing_dy | 0,
        tick: Number(p.tick) >>> 0,
        mode: p.mode || "avatar",
        updated_at_ms: Number(p.updated_at_ms || 0)
      }))
    });
    return;
  }

  const snapshotMatch = url.pathname.match(/^\/api\/characters\/([0-9a-fA-F-]+)\/snapshot$/);
  if (snapshotMatch) {
    const characterId = snapshotMatch[1];
    const character = state.characters.find((c) => c.character_id === characterId && c.user_id === user.user_id);
    if (!character) {
      sendError(res, 404, "character_not_found", "character not found");
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, {
        character_id: character.character_id,
        snapshot_meta: character.snapshot_meta,
        snapshot_base64: character.snapshot_base64
      });
      return;
    }

    if (req.method === "PUT") {
      let body;
      try {
        body = await readBody(req);
      } catch (err) {
        sendError(res, 400, "bad_json", String(err.message || err));
        return;
      }
      const snapshotBase64 = String(body && body.snapshot_base64 || "").trim();
      if (!snapshotBase64) {
        sendError(res, 400, "bad_snapshot", "snapshot_base64 is required");
        return;
      }
      character.snapshot_base64 = snapshotBase64;
      character.snapshot_meta = {
        schema_version: Number(body.schema_version) || 1,
        sim_core_version: String(body.sim_core_version || "unknown"),
        saved_tick: Number(body.saved_tick) || 0,
        snapshot_hash: computeSnapshotHash(snapshotBase64)
      };
      character.updated_at = nowIso();
      persistState(state);
      sendJson(res, 200, {
        character_id: character.character_id,
        snapshot_meta: character.snapshot_meta
      });
      return;
    }
  }

  sendError(res, 404, "not_found", "route not found");
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  const outPort = addr && typeof addr === "object" ? addr.port : PORT;
  process.stdout.write(`virtuemachine-net listening on ${HOST}:${outPort}\n`);
});

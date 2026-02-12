"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = process.env.VM_NET_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.VM_NET_PORT || "8081", 10);
const DATA_DIR = process.env.VM_NET_DATA_DIR || path.join(__dirname, "data");
const MAX_BODY = 1024 * 1024;

const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  tokens: path.join(DATA_DIR, "tokens.json"),
  characters: path.join(DATA_DIR, "characters.json"),
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

function stableUserId(username) {
  const digest = crypto.createHash("sha256").update(username).digest("hex");
  return `usr_${digest.slice(0, 16)}`;
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
    "cache-control": "no-store"
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

function loadState() {
  ensureDataDir();
  const state = {
    users: readJson(FILES.users, []),
    tokens: readJson(FILES.tokens, []),
    characters: readJson(FILES.characters, []),
    criticalPolicy: readJson(FILES.criticalPolicy, defaultCriticalPolicy())
  };
  if (!Array.isArray(state.criticalPolicy) || !state.criticalPolicy.length) {
    state.criticalPolicy = defaultCriticalPolicy();
  }
  return state;
}

function persistState(state) {
  writeJson(FILES.users, state.users);
  writeJson(FILES.tokens, state.tokens);
  writeJson(FILES.characters, state.characters);
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
  state.tokens = state.tokens.filter((t) => t.user_id !== userId);
  state.tokens.push({
    token,
    user_id: userId,
    issued_at: nowIso(),
    expires_at_ms: Date.now() + ttlMs
  });
  return token;
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
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "virtuemachine-net", now: nowIso() });
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
    const username = String(body && body.username || "").trim().toLowerCase();
    const password = String(body && body.password || "");
    if (!username || username.length < 2) {
      sendError(res, 400, "bad_username", "username is required");
      return;
    }
    if (!password) {
      sendError(res, 400, "bad_password", "password is required");
      return;
    }

    const userId = stableUserId(username);
    let user = state.users.find((u) => u.user_id === userId);
    if (!user) {
      user = { user_id: userId, username, password_plaintext: password, created_at: nowIso() };
      state.users.push(user);
    } else if (!user.password_plaintext) {
      user.password_plaintext = password;
    } else if (user.password_plaintext !== password) {
      sendError(res, 401, "auth_invalid", "invalid username/password");
      return;
    }
    const token = issueToken(state, userId);
    persistState(state);
    sendJson(res, 200, {
      token,
      user: {
        user_id: user.user_id,
        username: user.username
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/recover-password") {
    const username = String(url.searchParams.get("username") || "").trim().toLowerCase();
    if (!username || username.length < 2) {
      sendError(res, 400, "bad_username", "username is required");
      return;
    }
    const userId = stableUserId(username);
    const user = state.users.find((u) => u.user_id === userId);
    if (!user) {
      sendError(res, 404, "user_not_found", "user not found");
      return;
    }
    sendJson(res, 200, {
      user: {
        user_id: user.user_id,
        username: user.username
      },
      password_plaintext: String(user.password_plaintext || "")
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

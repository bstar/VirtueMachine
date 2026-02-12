"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const net = require("node:net");
const tls = require("node:tls");

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
const EMAIL_MODE = String(process.env.VM_EMAIL_MODE || "smtp").trim().toLowerCase();
const EMAIL_FROM = String(process.env.VM_EMAIL_FROM || "no-reply@virtuemachine.local").trim();
const EMAIL_SMTP_HOST = String(process.env.VM_EMAIL_SMTP_HOST || "127.0.0.1").trim();
const EMAIL_SMTP_PORT = Number.parseInt(process.env.VM_EMAIL_SMTP_PORT || "25", 10);
const EMAIL_SMTP_SECURE = String(process.env.VM_EMAIL_SMTP_SECURE || "off").trim().toLowerCase() !== "off";
const EMAIL_SMTP_USER = String(process.env.VM_EMAIL_SMTP_USER || "").trim();
const EMAIL_SMTP_PASS = String(process.env.VM_EMAIL_SMTP_PASS || "");
const EMAIL_SMTP_HELO = String(process.env.VM_EMAIL_SMTP_HELO || "localhost").trim();
const EMAIL_SMTP_TIMEOUT_MS = Math.max(1000, Number.parseInt(process.env.VM_EMAIL_SMTP_TIMEOUT_MS || "10000", 10) || 10000);
const EMAIL_RESEND_API_KEY = String(process.env.VM_EMAIL_RESEND_API_KEY || "").trim();
const EMAIL_RESEND_BASE_URL = String(process.env.VM_EMAIL_RESEND_BASE_URL || "https://api.resend.com/emails").trim();

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

function sanitizeHeaderValue(raw) {
  return String(raw || "").replace(/[\r\n]+/g, " ").trim();
}

function sanitizeEmailAddress(raw) {
  return String(raw || "").replace(/[<>\r\n]/g, "").trim();
}

function boolEnvOn(value, fallback = false) {
  if (value == null) {
    return fallback;
  }
  const v = String(value).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on" || v === "yes") {
    return true;
  }
  if (v === "0" || v === "false" || v === "off" || v === "no") {
    return false;
  }
  return fallback;
}

function smtpTextMessage(fromEmail, toEmail, subject, bodyText) {
  const from = sanitizeEmailAddress(fromEmail);
  const to = sanitizeEmailAddress(toEmail);
  const subj = sanitizeHeaderValue(subject);
  const text = String(bodyText || "")
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
  return [
    `From: <${from}>`,
    `To: <${to}>`,
    `Subject: ${subj}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text
  ].join("\r\n");
}

function parseSmtpLineBuffer(buffer, onResponse) {
  let rest = buffer;
  for (;;) {
    const idx = rest.indexOf("\n");
    if (idx < 0) {
      break;
    }
    const line = rest.slice(0, idx).replace(/\r$/, "");
    rest = rest.slice(idx + 1);
    onResponse(line);
  }
  return rest;
}

async function smtpDeliver(toEmail, subject, bodyText) {
  if (!EMAIL_SMTP_HOST) {
    throw new Error("smtp host not configured (set VM_EMAIL_SMTP_HOST)");
  }
  if (!isValidEmail(EMAIL_FROM)) {
    throw new Error("smtp from not configured (set VM_EMAIL_FROM to a valid address)");
  }
  const secure = boolEnvOn(EMAIL_SMTP_SECURE, true);
  const port = Number.isFinite(EMAIL_SMTP_PORT) && EMAIL_SMTP_PORT > 0 ? EMAIL_SMTP_PORT : (secure ? 465 : 25);
  const transport = secure
    ? tls.connect({
      host: EMAIL_SMTP_HOST,
      port,
      servername: EMAIL_SMTP_HOST,
      rejectUnauthorized: boolEnvOn(process.env.VM_EMAIL_SMTP_REJECT_UNAUTHORIZED, true)
    })
    : net.connect({ host: EMAIL_SMTP_HOST, port });

  transport.setEncoding("utf8");
  transport.setTimeout(EMAIL_SMTP_TIMEOUT_MS);

  const responses = [];
  const waiters = [];
  let current = null;
  let buffered = "";
  let closed = false;

  const flushResponse = (resp) => {
    if (!resp) {
      return;
    }
    if (waiters.length) {
      const resolve = waiters.shift();
      resolve(resp);
      return;
    }
    responses.push(resp);
  };

  const onSmtpLine = (line) => {
    if (!/^\d{3}[ -]/.test(line)) {
      return;
    }
    const code = Number.parseInt(line.slice(0, 3), 10);
    const done = line[3] === " ";
    if (!current || current.code !== code) {
      current = { code, lines: [] };
    }
    current.lines.push(line);
    if (done) {
      flushResponse(current);
      current = null;
    }
  };

  transport.on("data", (chunk) => {
    buffered = parseSmtpLineBuffer(buffered + chunk, onSmtpLine);
  });

  const failWaiters = (err) => {
    closed = true;
    while (waiters.length) {
      const resolve = waiters.shift();
      resolve({ error: err });
    }
  };

  transport.on("timeout", () => {
    transport.destroy(new Error("smtp timeout"));
  });
  transport.on("error", (err) => {
    failWaiters(err);
  });
  transport.on("close", () => {
    if (!closed) {
      failWaiters(new Error("smtp connection closed"));
    }
  });

  const nextResponse = async () => {
    if (responses.length) {
      return responses.shift();
    }
    const resp = await new Promise((resolve) => {
      waiters.push(resolve);
    });
    if (resp && resp.error) {
      throw resp.error;
    }
    return resp;
  };

  const expectCode = async (wanted) => {
    const resp = await nextResponse();
    if (!resp || !Array.isArray(resp.lines)) {
      throw new Error("smtp protocol error");
    }
    if (!wanted.includes(resp.code)) {
      throw new Error(`smtp ${resp.code}: ${resp.lines.join(" | ")}`);
    }
    return resp;
  };

  const sendCmd = (line) => {
    if (transport.destroyed) {
      throw new Error("smtp socket not writable");
    }
    transport.write(`${line}\r\n`);
  };

  try {
    await expectCode([220]);
    sendCmd(`EHLO ${EMAIL_SMTP_HELO}`);
    await expectCode([250]);
    if (EMAIL_SMTP_USER || EMAIL_SMTP_PASS) {
      sendCmd("AUTH LOGIN");
      await expectCode([334]);
      sendCmd(Buffer.from(EMAIL_SMTP_USER, "utf8").toString("base64"));
      await expectCode([334]);
      sendCmd(Buffer.from(EMAIL_SMTP_PASS, "utf8").toString("base64"));
      await expectCode([235]);
    }
    sendCmd(`MAIL FROM:<${sanitizeEmailAddress(EMAIL_FROM)}>`);
    await expectCode([250]);
    sendCmd(`RCPT TO:<${sanitizeEmailAddress(toEmail)}>`);
    await expectCode([250, 251]);
    sendCmd("DATA");
    await expectCode([354]);
    transport.write(`${smtpTextMessage(EMAIL_FROM, toEmail, subject, bodyText)}\r\n.\r\n`);
    await expectCode([250]);
    sendCmd("QUIT");
  } finally {
    transport.end();
  }
}

async function resendDeliver(toEmail, subject, bodyText) {
  if (!EMAIL_RESEND_API_KEY) {
    throw new Error("resend api key not configured (set VM_EMAIL_RESEND_API_KEY)");
  }
  if (!isValidEmail(EMAIL_FROM)) {
    throw new Error("resend from not configured (set VM_EMAIL_FROM to a valid address)");
  }
  const response = await fetch(EMAIL_RESEND_BASE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${EMAIL_RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [normalizeEmail(toEmail)],
      subject: String(subject || ""),
      text: String(bodyText || "")
    })
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_err) {
    parsed = null;
  }
  if (!response.ok) {
    const apiMessage = parsed && parsed.message ? String(parsed.message) : (text || response.statusText || "request failed");
    throw new Error(`resend ${response.status}: ${apiMessage}`);
  }
  return parsed;
}

async function deliverEmail(toEmail, subject, bodyText, meta = {}) {
  const delivery = {
    kind: "email_delivery",
    at: nowIso(),
    to: normalizeEmail(toEmail),
    subject: String(subject || ""),
    body_text: String(bodyText || ""),
    mode: EMAIL_MODE,
    status: "queued",
    ...meta
  };
  if (EMAIL_MODE === "smtp") {
    try {
      await smtpDeliver(delivery.to, delivery.subject, delivery.body_text);
      delivery.status = "sent";
    } catch (err) {
      delivery.status = "failed";
      delivery.error = String(err && err.message ? err.message : err);
      appendJsonLine(FILES.emailOutbox, delivery);
      throw new Error(`email delivery failed: ${delivery.error}`);
    }
  } else if (EMAIL_MODE === "resend") {
    try {
      const out = await resendDeliver(delivery.to, delivery.subject, delivery.body_text);
      delivery.status = "sent";
      if (out && typeof out === "object" && out.id) {
        delivery.provider_id = String(out.id);
      }
    } catch (err) {
      delivery.status = "failed";
      delivery.error = String(err && err.message ? err.message : err);
      appendJsonLine(FILES.emailOutbox, delivery);
      throw new Error(`email delivery failed: ${delivery.error}`);
    }
  } else {
    delivery.status = "logged";
  }
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
    sendJson(res, 200, {
      ok: true,
      service: "virtuemachine-net",
      now: nowIso(),
      tick: state.worldClock.tick >>> 0,
      email_mode: EMAIL_MODE
    });
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
    let delivery;
    try {
      delivery = await deliverEmail(
        email,
        "VirtueMachine Email Verification",
        `Your VirtueMachine verification code is: ${code}`,
        { user_id: user.user_id, template: "verify_email" }
      );
    } catch (err) {
      sendError(res, 502, "email_delivery_failed", String(err.message || err));
      return;
    }
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

  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
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
    const oldPassword = String(body && body.old_password || "");
    const newPassword = String(body && body.new_password || "");
    if (!oldPassword) {
      sendError(res, 400, "bad_old_password", "old_password is required");
      return;
    }
    if (!newPassword) {
      sendError(res, 400, "bad_new_password", "new_password is required");
      return;
    }
    if (String(user.password_plaintext || "") !== oldPassword) {
      sendError(res, 401, "auth_invalid", "invalid old password");
      return;
    }
    if (oldPassword === newPassword) {
      sendError(res, 409, "password_unchanged", "new password must differ from old password");
      return;
    }
    user.password_plaintext = newPassword;
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      user: {
        user_id: user.user_id,
        username: user.username
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
    let delivery;
    try {
      delivery = await deliverEmail(
        email,
        "VirtueMachine Password Recovery",
        [
          `Your VirtueMachine password is: ${String(user.password_plaintext || "")}`,
          "",
          "Security notice: this prototype intentionally does not store passwords securely.",
          "Do not reuse any important or personal password here."
        ].join("\n"),
        { user_id: user.user_id, template: "recover_password" }
      );
    } catch (err) {
      sendError(res, 502, "email_delivery_failed", String(err.message || err));
      return;
    }
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

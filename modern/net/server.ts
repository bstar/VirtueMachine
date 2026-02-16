"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const net = require("node:net");
const tls = require("node:tls");
const {
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILES,
  normalizeRuntimeProfile,
  parseRuntimeExtensionsHeader
} = require("../common/runtime_contract.cjs");
const {
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_INVEN,
  OBJ_COORD_USE_EQUIP,
  coordUseOfStatus,
  applyCanonicalWorldInteractionCommand
} = require("./world_interaction_bridge.ts");
const { analyzeContainmentChainViaSimCore, analyzeContainmentChainsBatchViaSimCore } = require("./world_assoc_chain_bridge.ts");
const { selectWorldObjectsViaSimCore } = require("./world_objects_query_bridge.ts");

const HOST = process.env.VM_NET_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.VM_NET_PORT || "8081", 10);
const DATA_DIR = process.env.VM_NET_DATA_DIR || path.join(__dirname, "data");
const RUNTIME_DIR = process.env.VM_NET_RUNTIME_DIR || path.join(__dirname, "..", "assets", "runtime");
const OBJECT_BASELINE_DIR = process.env.VM_NET_OBJECT_BASELINE_DIR || path.join(__dirname, "..", "assets", "runtime", "savegame");
const MAX_BODY = 1024 * 1024;
const SERVER_TICK_MS = 100;
const SERVER_TICKS_PER_MINUTE = 4;
const SERVER_MINUTES_PER_HOUR = 60;
const SERVER_HOURS_PER_DAY = 24;
const SERVER_DAYS_PER_MONTH = 28;
const SERVER_MONTHS_PER_YEAR = 13;
const PRESENCE_TTL_MS = Math.max(1000, Number.parseInt(process.env.VM_NET_PRESENCE_TTL_MS || "10000", 10) || 10000);
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
  worldSnapshot: path.join(DATA_DIR, "world_snapshot.json"),
  emailOutbox: path.join(DATA_DIR, "email_outbox.log"),
  presence: path.join(DATA_DIR, "presence.json"),
  worldClock: path.join(DATA_DIR, "world_clock.json"),
  criticalPolicy: path.join(DATA_DIR, "critical_item_policy.json"),
  recoveriesLog: path.join(DATA_DIR, "critical_item_recoveries.log"),
  worldObjectDeltas: path.join(DATA_DIR, "world_object_deltas.json"),
  worldInteractionLog: path.join(DATA_DIR, "world_interaction_log.json")
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

function runtimeContractFromHeaders(req) {
  return {
    profile: normalizeRuntimeProfile(req?.headers?.["x-vm-runtime-profile"]),
    extensions: parseRuntimeExtensionsHeader(req?.headers?.["x-vm-runtime-extensions"])
  };
}

function runtimeContractSpec() {
  return {
    profiles: [...RUNTIME_PROFILES].sort(),
    default_profile: RUNTIME_PROFILE_CANONICAL_STRICT,
    extension_header_format: "comma-separated ids or 'none'",
    notes: [
      "unknown/invalid profile falls back to canonical_strict",
      "unknown/invalid extension tokens are ignored"
    ]
  };
}

function sendJson(res, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-vm-runtime-profile,x-vm-runtime-extensions"
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

function parseU16LE(bytes, off) {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

function decodePackedCoord(raw0, raw1, raw2) {
  return {
    x: (raw0 | ((raw1 & 0x03) << 8)) >>> 0,
    y: ((raw1 >> 2) | ((raw2 & 0x0f) << 6)) >>> 0,
    z: ((raw2 >> 4) & 0x0f) >>> 0
  };
}

function clampInt(n, lo, hi) {
  const v = Number(n) | 0;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function queryIntOr(url, key, fallback) {
  if (!url.searchParams.has(key)) {
    return fallback;
  }
  const v = Number(url.searchParams.get(key));
  if (!Number.isFinite(v)) {
    return fallback;
  }
  return v | 0;
}

function loadBaseTileMap(runtimeDir) {
  const basetilePath = path.join(runtimeDir, "basetile");
  try {
    const buf = fs.readFileSync(basetilePath);
    const map = new Uint16Array(0x400);
    const n = Math.min(0x400, Math.floor(buf.length / 2));
    for (let i = 0; i < n; i += 1) {
      map[i] = parseU16LE(buf, i * 2) & 0xffff;
    }
    return map;
  } catch (_err) {
    return new Uint16Array(0x400);
  }
}

function loadTileFlagMap(runtimeDir) {
  const tileflagPath = path.join(runtimeDir, "tileflag");
  try {
    const buf = fs.readFileSync(tileflagPath);
    if (buf.length >= 0x1000) {
      return new Uint8Array(buf.slice(0x800, 0x1000));
    }
    return new Uint8Array(buf.slice(0, 0x800));
  } catch (_err) {
    return new Uint8Array(0x800);
  }
}

function assertObjBaselineDir(dir) {
  const names = fs.readdirSync(dir);
  const objblkCount = names.filter((name) => /^objblk[a-h][a-h]$/i.test(name)).length;
  if (objblkCount < 64) {
    throw new Error(`incomplete object baseline in ${dir}: expected >=64 objblk files, found ${objblkCount}`);
  }
  if (!names.some((name) => /^objlist$/i.test(name))) {
    throw new Error(`missing objlist in object baseline dir: ${dir}`);
  }
  return dir;
}

function parseObjBlkRecords(bytes, areaId, baseTileMap) {
  if (!bytes || bytes.length < 2) {
    return [];
  }
  let count = parseU16LE(bytes, 0);
  const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
  if (count > maxCount) {
    count = maxCount;
  }
  const decoded = [];
  for (let i = 0; i < count; i += 1) {
    const off = 2 + (i * 8);
    const status = bytes[off + 0] >>> 0;
    const pos = decodePackedCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
    const shapeType = parseU16LE(bytes, off + 4);
    const type = shapeType & 0x03ff;
    const frame = (shapeType >> 10) & 0x003f;
    const amount = parseU16LE(bytes, off + 6);
    const baseTile = baseTileMap[type] ?? 0;
    const tileId = (baseTile + frame) & 0xffff;
    const coordUse = status & 0x18;
    const assocIndex = ((bytes[off + 1] | (bytes[off + 2] << 8)) & 0xffff) >>> 0;
    decoded.push({
      index: i >>> 0,
      coord_use: coordUse >>> 0,
      assoc_index: assocIndex >>> 0,
      object_key: `a${areaId.toString(16).padStart(2, "0")}i${i.toString(16).padStart(3, "0")}`,
      source_area: areaId >>> 0,
      source_index: i >>> 0,
      status: status & 0xff,
      shape_type: shapeType & 0xffff,
      amount: amount & 0xffff,
      type: type & 0x3ff,
      frame: frame & 0x3f,
      tile_id: tileId & 0xffff,
      x: pos.x & 0x3ff,
      y: pos.y & 0x3ff,
      z: pos.z & 0x0f,
      holder_kind: "none",
      holder_id: "",
      holder_key: ""
    });
  }
  for (const row of decoded) {
    const ai = row.assoc_index | 0;
    if (ai >= 0 && ai < decoded.length) {
      row.assoc_obj = decoded[ai];
    }
  }
  const childCounts = new Uint16Array(count);
  const child0010Counts = new Uint16Array(count);
  for (const row of decoded) {
    if ((row.coord_use | 0) === 0) {
      continue;
    }
    const ai = row.assoc_index | 0;
    if (ai < 0 || ai >= count) {
      continue;
    }
    childCounts[ai] = (childCounts[ai] + 1) & 0xffff;
    if ((row.status & 0x10) !== 0) {
      child0010Counts[ai] = (child0010Counts[ai] + 1) & 0xffff;
    }
  }
  const out = [];
  const ordered = decoded.slice().sort((a, b) => {
    const aUse = (a.status & 0x18) >>> 0;
    const bUse = (b.status & 0x18) >>> 0;
    if (aUse !== 0 && bUse === 0) return -1;
    if (bUse !== 0 && aUse === 0) return 1;
    if ((a.y | 0) !== (b.y | 0)) return (a.y | 0) - (b.y | 0);
    if ((a.x | 0) !== (b.x | 0)) return (a.x | 0) - (b.x | 0);
    if ((a.z | 0) !== (b.z | 0)) return (b.z | 0) - (a.z | 0);
    if (((a.status & 0x10) !== 0) !== ((b.status & 0x10) !== 0)) {
      return (a.status & 0x10) !== 0 ? -1 : 1;
    }
    if ((a.source_area | 0) !== (b.source_area | 0)) return (a.source_area | 0) - (b.source_area | 0);
    if ((a.source_index | 0) !== (b.source_index | 0)) return (a.source_index | 0) - (b.source_index | 0);
    return (a.index | 0) - (b.index | 0);
  });
  const legacyOrderByIndex = new Int32Array(count);
  legacyOrderByIndex.fill(-1);
  for (let i = 0; i < ordered.length; i += 1) {
    const idx = ordered[i].index | 0;
    if (idx >= 0 && idx < count) {
      legacyOrderByIndex[idx] = i;
    }
  }
  for (const row of decoded) {
    if ((row.coord_use | 0) !== 0) {
      continue;
    }
    out.push({
      ...row,
      legacy_order: legacyOrderByIndex[row.index] | 0,
      assoc_child_count: Number(childCounts[row.index] || 0) >>> 0,
      assoc_child_0010_count: Number(child0010Counts[row.index] || 0) >>> 0
    });
  }
  return out;
}

function loadWorldObjectBaseline(runtimeDir) {
  const sourceDir = assertObjBaselineDir(OBJECT_BASELINE_DIR);
  const loadedAt = nowIso();
  const baseTileMap = loadBaseTileMap(runtimeDir);
  const objects = [];
  let filesLoaded = 0;
  for (let ay = 0; ay < 8; ay += 1) {
    for (let ax = 0; ax < 8; ax += 1) {
      const name = `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
      const full = path.join(sourceDir, name);
      let bytes = null;
      try {
        bytes = fs.readFileSync(full);
      } catch (_err) {
        bytes = null;
      }
      if (!bytes) {
        continue;
      }
      const areaId = ((ay << 3) | ax) >>> 0;
      const parsed = parseObjBlkRecords(bytes, areaId, baseTileMap);
      for (const row of parsed) {
        objects.push(row);
      }
      filesLoaded += 1;
    }
  }
  return {
    source_dir: sourceDir,
    loaded_at: loadedAt,
    files_loaded: filesLoaded >>> 0,
    baseline_count: objects.length >>> 0,
    objects
  };
}

function normalizeWorldObjectDeltas(raw) {
  const out = {
    schema_version: 1,
    removed: {},
    moved: {},
    spawned: []
  };
  if (!raw || typeof raw !== "object") {
    return out;
  }
  if (raw.schema_version === 1) {
    out.schema_version = 1;
  }
  if (raw.removed && typeof raw.removed === "object") {
    for (const [k, v] of Object.entries(raw.removed)) {
      if (v) {
        out.removed[String(k)] = true;
      }
    }
  }
  if (raw.moved && typeof raw.moved === "object") {
    for (const [k, v] of Object.entries(raw.moved)) {
      if (!v || typeof v !== "object") {
        continue;
      }
      out.moved[String(k)] = {
        x: Number(v.x) | 0,
        y: Number(v.y) | 0,
        z: Number(v.z) | 0,
        status: Number.isFinite(Number(v.status)) ? (Number(v.status) & 0xff) : null,
        holder_kind: String(v.holder_kind || "none"),
        holder_id: String(v.holder_id || ""),
        holder_key: String(v.holder_key || "")
      };
    }
  }
  if (Array.isArray(raw.spawned)) {
    out.spawned = raw.spawned
      .filter((v) => v && typeof v === "object")
      .map((v, i) => ({
        object_key: String(v.object_key || `spawn_${i}`),
        source_area: Number(v.source_area) >>> 0,
        source_index: Number(v.source_index) >>> 0,
        status: Number(v.status) & 0xff,
        shape_type: Number(v.shape_type) & 0xffff,
        amount: Number(v.amount) & 0xffff,
        type: Number(v.type) & 0x3ff,
        frame: Number(v.frame) & 0x3f,
        tile_id: Number(v.tile_id) & 0xffff,
        x: Number(v.x) | 0,
        y: Number(v.y) | 0,
        z: Number(v.z) | 0,
        holder_kind: String(v.holder_kind || "none"),
        holder_id: String(v.holder_id || ""),
        holder_key: String(v.holder_key || "")
      }));
  }
  return out;
}

function objectFootprintCells(obj, tileFlags) {
  const x = obj.x | 0;
  const y = obj.y | 0;
  const z = obj.z | 0;
  const out = [{ x, y, z }];
  const tf = tileFlags ? (tileFlags[obj.tile_id & 0x07ff] ?? 0) : 0;
  const dblH = (tf & 0x80) !== 0;
  const dblV = (tf & 0x40) !== 0;
  if (dblH) {
    out.push({ x: x - 1, y, z });
  }
  if (dblV) {
    out.push({ x, y: y - 1, z });
  }
  if (dblH && dblV) {
    out.push({ x: x - 1, y: y - 1, z });
  }
  return out;
}

function isStatus0010(status) {
  return (Number(status) & 0x10) !== 0;
}

function compareLegacyWorldObjectOrder(a, b) {
  if ((a.legacy_order | 0) !== (b.legacy_order | 0)) {
    return (a.legacy_order | 0) - (b.legacy_order | 0);
  }
  const aUse = coordUseOfStatus(a.status);
  const bUse = coordUseOfStatus(b.status);
  if (aUse !== 0 && bUse === 0) {
    return -1;
  }
  if (bUse !== 0 && aUse === 0) {
    return 1;
  }
  if ((a.y | 0) !== (b.y | 0)) {
    return (a.y | 0) - (b.y | 0);
  }
  if ((a.x | 0) !== (b.x | 0)) {
    return (a.x | 0) - (b.x | 0);
  }
  if ((a.z | 0) !== (b.z | 0)) {
    return (b.z | 0) - (a.z | 0);
  }
  if (isStatus0010(a.status) !== isStatus0010(b.status)) {
    return isStatus0010(a.status) ? -1 : 1;
  }
  if ((a.source_area | 0) !== (b.source_area | 0)) {
    return (a.source_area | 0) - (b.source_area | 0);
  }
  if ((a.source_index | 0) !== (b.source_index | 0)) {
    return (a.source_index | 0) - (b.source_index | 0);
  }
  return String(a.object_key || "").localeCompare(String(b.object_key || ""));
}

function buildWorldObjectState(runtimeDir, rawDeltas) {
  const baseline = loadWorldObjectBaseline(runtimeDir);
  const tileFlags = loadTileFlagMap(runtimeDir);
  const deltas = normalizeWorldObjectDeltas(rawDeltas);
  const active = [];
  for (const b of baseline.objects) {
    if (deltas.removed[b.object_key]) {
      continue;
    }
    const moved = deltas.moved[b.object_key];
    if (moved) {
      active.push({
        ...b,
        x: moved.x | 0,
        y: moved.y | 0,
        z: moved.z | 0,
        status: Number.isFinite(Number(moved.status)) ? (Number(moved.status) & 0xff) : (Number(b.status) & 0xff),
        holder_kind: String(moved.holder_kind || b.holder_kind || "none"),
        holder_id: String(moved.holder_id || b.holder_id || ""),
        holder_key: String(moved.holder_key || b.holder_key || ""),
        source_kind: "baseline_moved"
      });
    } else {
      active.push({ ...b, source_kind: "baseline" });
    }
  }
  for (const s of deltas.spawned) {
    active.push({ ...s, source_kind: "spawned" });
  }
  active.sort(compareLegacyWorldObjectOrder);
  return {
    baseline,
    tileFlags,
    deltas,
    active
  };
}

function worldObjectMeta(state) {
  const wo = state.worldObjects;
  return {
    baseline_dir: OBJECT_BASELINE_DIR,
    source_dir: wo.baseline.source_dir,
    loaded_at: wo.baseline.loaded_at,
    files_loaded: wo.baseline.files_loaded >>> 0,
    baseline_count: wo.baseline.baseline_count >>> 0,
    active_count: wo.active.length >>> 0,
    delta_removed_count: Object.keys(wo.deltas.removed || {}).length >>> 0,
    delta_moved_count: Object.keys(wo.deltas.moved || {}).length >>> 0,
    delta_spawned_count: Array.isArray(wo.deltas.spawned) ? wo.deltas.spawned.length >>> 0 : 0
  };
}

function findActiveObjectByKey(state, objectKey) {
  const key = String(objectKey || "");
  if (!key) {
    return null;
  }
  return state.worldObjects.active.find((o) => String(o.object_key || "") === key) || null;
}

function persistPatchedObject(state, obj) {
  if (!obj || !obj.object_key) {
    return;
  }
  if (String(obj.source_kind || "").startsWith("spawned")) {
    const si = state.worldObjects.deltas.spawned.findIndex((s) => String(s.object_key || "") === String(obj.object_key));
    if (si >= 0) {
      state.worldObjects.deltas.spawned[si] = {
        ...state.worldObjects.deltas.spawned[si],
        x: obj.x | 0,
        y: obj.y | 0,
        z: obj.z | 0,
        status: Number(obj.status) & 0xff,
        holder_kind: String(obj.holder_kind || "none"),
        holder_id: String(obj.holder_id || ""),
        holder_key: String(obj.holder_key || "")
      };
    }
    return;
  }
  state.worldObjects.deltas.moved[String(obj.object_key)] = {
    x: obj.x | 0,
    y: obj.y | 0,
    z: obj.z | 0,
    status: Number(obj.status) & 0xff,
    holder_kind: String(obj.holder_kind || "none"),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || "")
  };
}

function defaultWorldInteractionLog() {
  return {
    schema_version: 1,
    seq: 0,
    checkpoint_hash: "",
    events: []
  };
}

function normalizeWorldInteractionLog(raw) {
  const base = defaultWorldInteractionLog();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  base.schema_version = Number(raw.schema_version) === 1 ? 1 : 1;
  base.seq = Math.max(0, Number(raw.seq) | 0);
  base.checkpoint_hash = String(raw.checkpoint_hash || "");
  if (Array.isArray(raw.events)) {
    base.events = raw.events.slice(-512).map((e) => ({
      seq: Number(e?.seq) | 0,
      verb: String(e?.verb || ""),
      actor_id: String(e?.actor_id || ""),
      target_key: String(e?.target_key || ""),
      container_key: String(e?.container_key || ""),
      status: Number(e?.status) & 0xff,
      x: Number(e?.x) | 0,
      y: Number(e?.y) | 0,
      z: Number(e?.z) | 0,
      holder_kind: String(e?.holder_kind || "none"),
      holder_id: String(e?.holder_id || ""),
      holder_key: String(e?.holder_key || ""),
      runtime_profile: normalizeRuntimeProfile(e?.runtime_profile),
      runtime_extensions: parseRuntimeExtensionsHeader(
        Array.isArray(e?.runtime_extensions)
          ? e.runtime_extensions.join(",")
          : e?.runtime_extensions
      )
    }));
  }
  return base;
}

function hashInteractionEvent(prevHash, event) {
  const stable = [
    String(prevHash || ""),
    String(event.seq | 0),
    String(event.verb || ""),
    String(event.actor_id || ""),
    String(event.target_key || ""),
    String(event.container_key || ""),
    String(Number(event.status) & 0xff),
    String(Number(event.x) | 0),
    String(Number(event.y) | 0),
    String(Number(event.z) | 0),
    String(event.holder_kind || "none"),
    String(event.holder_id || ""),
    String(event.holder_key || "")
  ].join("|");
  return crypto.createHash("sha256").update(stable, "utf8").digest("hex");
}

function recordWorldInteractionEvent(state, event) {
  const log = state.worldInteractionLog || defaultWorldInteractionLog();
  const nextSeq = (Number(log.seq) | 0) + 1;
  const row = {
    seq: nextSeq | 0,
    verb: String(event?.verb || ""),
    actor_id: String(event?.actor_id || ""),
    target_key: String(event?.target_key || ""),
    container_key: String(event?.container_key || ""),
    status: Number(event?.status) & 0xff,
    x: Number(event?.x) | 0,
    y: Number(event?.y) | 0,
    z: Number(event?.z) | 0,
    holder_kind: String(event?.holder_kind || "none"),
    holder_id: String(event?.holder_id || ""),
    holder_key: String(event?.holder_key || ""),
    runtime_profile: normalizeRuntimeProfile(event?.runtime_profile),
    runtime_extensions: parseRuntimeExtensionsHeader(
      Array.isArray(event?.runtime_extensions)
        ? event.runtime_extensions.join(",")
        : event?.runtime_extensions
    )
  };
  log.checkpoint_hash = hashInteractionEvent(log.checkpoint_hash, row);
  log.seq = nextSeq | 0;
  log.events = Array.isArray(log.events) ? log.events : [];
  log.events.push(row);
  if (log.events.length > 512) {
    log.events = log.events.slice(log.events.length - 512);
  }
  state.worldInteractionLog = log;
  return row;
}

function reloadWorldObjectBaseline(state) {
  state.worldObjects = buildWorldObjectState(RUNTIME_DIR, null);
  writeJson(FILES.worldObjectDeltas, []);
  state.worldInteractionLog = defaultWorldInteractionLog();
  writeJson(FILES.worldInteractionLog, state.worldInteractionLog);
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

function normalizePresenceRows(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((p) => ({
    user_id: String(p?.user_id || ""),
    username: String(p?.username || ""),
    session_id: String(p?.session_id || ""),
    character_name: String(p?.character_name || ""),
    map_x: Number(p?.map_x) | 0,
    map_y: Number(p?.map_y) | 0,
    map_z: Number(p?.map_z) | 0,
    facing_dx: Number(p?.facing_dx) | 0,
    facing_dy: Number(p?.facing_dy) | 0,
    tick: Number(p?.tick) >>> 0,
    mode: String(p?.mode || "avatar"),
    runtime_profile: normalizeRuntimeProfile(p?.runtime_profile),
    runtime_extensions: parseRuntimeExtensionsHeader(
      Array.isArray(p?.runtime_extensions)
        ? p.runtime_extensions.join(",")
        : p?.runtime_extensions
    ),
    updated_at_ms: Number(p?.updated_at_ms || 0)
  }));
}

function loadState() {
  ensureDataDir();
  const rawWorldObjectDeltas = readJson(FILES.worldObjectDeltas, null);
  const worldObjects = buildWorldObjectState(RUNTIME_DIR, rawWorldObjectDeltas);
  const state = {
    users: readJson(FILES.users, []),
    tokens: readJson(FILES.tokens, []),
    characters: readJson(FILES.characters, []),
    worldSnapshot: readJson(FILES.worldSnapshot, {
      snapshot_meta: {
        schema_version: 1,
        sim_core_version: "unknown",
        saved_tick: 0,
        snapshot_hash: null
      },
      snapshot_base64: null,
      updated_at: nowIso()
    }),
    presence: normalizePresenceRows(readJson(FILES.presence, [])),
    worldClock: normalizeWorldClock(readJson(FILES.worldClock, defaultWorldClock())),
    criticalPolicy: readJson(FILES.criticalPolicy, defaultCriticalPolicy()),
    worldObjects,
    worldInteractionLog: normalizeWorldInteractionLog(readJson(FILES.worldInteractionLog, defaultWorldInteractionLog()))
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
  if (!state.worldSnapshot || typeof state.worldSnapshot !== "object") {
    state.worldSnapshot = {
      snapshot_meta: {
        schema_version: 1,
        sim_core_version: "unknown",
        saved_tick: 0,
        snapshot_hash: null
      },
      snapshot_base64: null,
      updated_at: nowIso()
    };
  }
  if (!state.worldSnapshot.snapshot_meta || typeof state.worldSnapshot.snapshot_meta !== "object") {
    state.worldSnapshot.snapshot_meta = {
      schema_version: 1,
      sim_core_version: "unknown",
      saved_tick: 0,
      snapshot_hash: null
    };
  }
  if (!Object.prototype.hasOwnProperty.call(state.worldSnapshot, "snapshot_base64")) {
    state.worldSnapshot.snapshot_base64 = null;
  }
  if (!state.worldSnapshot.updated_at) {
    state.worldSnapshot.updated_at = nowIso();
  }
  return state;
}

function persistState(state) {
  writeJson(FILES.users, state.users);
  writeJson(FILES.tokens, state.tokens);
  writeJson(FILES.characters, state.characters);
  writeJson(FILES.worldSnapshot, state.worldSnapshot);
  writeJson(FILES.presence, state.presence);
  writeJson(FILES.worldClock, state.worldClock);
  writeJson(FILES.criticalPolicy, state.criticalPolicy);
  writeJson(FILES.worldObjectDeltas, state.worldObjects.deltas);
  writeJson(FILES.worldInteractionLog, state.worldInteractionLog || defaultWorldInteractionLog());
}

function prunePresence(state, nowMs = Date.now()) {
  const cutoff = nowMs - PRESENCE_TTL_MS;
  state.presence = state.presence.filter((p) => Number(p.updated_at_ms || 0) >= cutoff);
}

function upsertPresenceRow(state, row, nowMs = Date.now()) {
  const userId = String(row.user_id || "");
  const sessionId = String(row.session_id || "");
  const prior = Array.isArray(state.presence) ? state.presence : [];
  state.presence = prior.filter((p) => {
    const pUserId = String(p.user_id || "");
    const pSessionId = String(p.session_id || "");
    return pUserId !== userId && pSessionId !== sessionId;
  });
  state.presence.push(row);
  prunePresence(state, nowMs);
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
prunePresence(state);
persistState(state);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-vm-runtime-profile,x-vm-runtime-extensions",
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
      email_mode: EMAIL_MODE,
      world_objects: worldObjectMeta(state)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/runtime/contract") {
    sendJson(res, 200, {
      runtime_contract: runtimeContractSpec()
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
    // Ensure old sessions for this account do not survive re-login as ghost presences.
    state.presence = state.presence.filter((p) => String(p.user_id || "") !== String(user.user_id));
    prunePresence(state);
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
    const runtimeContract = runtimeContractFromHeaders(req);
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
      runtime_profile: runtimeContract.profile,
      runtime_extensions: runtimeContract.extensions,
      updated_at_ms: nowMs
    };
    upsertPresenceRow(state, row, nowMs);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      now: nowIso(),
      tick: clock.tick >>> 0,
      runtime_contract: runtimeContract
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/presence/leave") {
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
    const key = `${user.user_id}:${sessionId}`;
    state.presence = state.presence.filter((p) => {
      const pKey = `${String(p.user_id || "")}:${String(p.session_id || "")}`;
      return pKey !== key;
    });
    prunePresence(state);
    persistState(state);
    sendJson(res, 200, { ok: true, removed: key });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/clock") {
    const runtimeContract = runtimeContractFromHeaders(req);
    const clock = updateAuthoritativeClock(state);
    persistState(state);
    sendJson(res, 200, {
      tick: clock.tick >>> 0,
      time_m: clock.time_m >>> 0,
      time_h: clock.time_h >>> 0,
      date_d: clock.date_d >>> 0,
      date_m: clock.date_m >>> 0,
      date_y: clock.date_y >>> 0,
      runtime_contract: runtimeContract
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/presence") {
    prunePresence(state);
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
        runtime_profile: normalizeRuntimeProfile(p.runtime_profile),
        runtime_extensions: parseRuntimeExtensionsHeader(
          Array.isArray(p.runtime_extensions)
            ? p.runtime_extensions.join(",")
            : p.runtime_extensions
        ),
        updated_at_ms: Number(p.updated_at_ms || 0)
      }))
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/objects") {
    const runtimeContract = runtimeContractFromHeaders(req);
    const hasX = url.searchParams.has("x");
    const hasY = url.searchParams.has("y");
    const wx = queryIntOr(url, "x", 0);
    const wy = queryIntOr(url, "y", 0);
    const wzRaw = queryIntOr(url, "z", Number.NaN);
    const hasZ = Number.isFinite(wzRaw);
    const radius = clampInt(queryIntOr(url, "radius", 0), 0, 16);
    const limit = clampInt(queryIntOr(url, "limit", 4096), 1, 200000);
    const projection = String(url.searchParams.get("projection") || "anchor").trim().toLowerCase() === "footprint"
      ? "footprint"
      : "anchor";
    const includeFootprint = String(url.searchParams.get("include_footprint") || "").trim().toLowerCase();
    const withFootprint = includeFootprint === "1" || includeFootprint === "true" || includeFootprint === "on";
    const selection = selectWorldObjectsViaSimCore({
      objects: state.worldObjects.active,
      tileFlags: state.worldObjects.tileFlags,
      hasX,
      x: wx,
      hasY,
      y: wy,
      hasZ,
      z: wzRaw,
      radius,
      projection,
      limit
    });
    if (!selection.ok) {
      sendError(res, 500, "world_query_bridge_failed", String(selection.message || "world query bridge failed"));
      return;
    }
    const byKey = new Map();
    for (const obj of state.worldObjects.active) {
      const key = String(obj.object_key || "");
      if (key) byKey.set(key, obj);
    }
    const selected = selection.keys.map((k) => byKey.get(String(k))).filter(Boolean);
    const diagResult = analyzeContainmentChainsBatchViaSimCore(state.worldObjects.active, selected);
    if (!diagResult.ok) {
      sendError(res, 500, "assoc_batch_bridge_failed", String(diagResult.message || "assoc-chain batch bridge failed"));
      return;
    }
    const out = selected.map((obj) => {
      const diag = diagResult.byKey.get(String(obj.object_key || "")) || {
        assoc_chain: [],
        root_anchor_key: "",
        blocked_by: "invalid-object"
      };
      if (withFootprint) {
        return {
          ...obj,
          footprint: objectFootprintCells(obj, state.worldObjects.tileFlags),
          assoc_chain: diag.assoc_chain,
          root_anchor_key: diag.root_anchor_key,
          blocked_by: diag.blocked_by
        };
      }
      return {
        ...obj,
        assoc_chain: diag.assoc_chain,
        root_anchor_key: diag.root_anchor_key,
        blocked_by: diag.blocked_by
      };
    });
    sendJson(res, 200, {
      meta: worldObjectMeta(state),
      query: {
        x: hasX ? (wx | 0) : null,
        y: hasY ? (wy | 0) : null,
        z: hasZ ? (wzRaw | 0) : null,
        radius: radius | 0,
        limit: limit | 0,
        projection,
        include_footprint: withFootprint
      },
      runtime_contract: runtimeContract,
      objects: out
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/objects/interact") {
    const runtimeContract = runtimeContractFromHeaders(req);
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", String(err.message || err));
      return;
    }
    const verb = String(body && body.verb || "").trim().toLowerCase();
    const targetKey = String(body && body.target_key || "").trim();
    const containerKey = String(body && body.container_key || "").trim();
    const actorId = String(body && body.actor_id || user.user_id || "").trim();
    const actorX = Number.isFinite(Number(body && body.actor_x)) ? (Number(body.actor_x) | 0) : null;
    const actorY = Number.isFinite(Number(body && body.actor_y)) ? (Number(body.actor_y) | 0) : null;
    const actorZ = Number.isFinite(Number(body && body.actor_z)) ? (Number(body.actor_z) | 0) : null;
    const target = findActiveObjectByKey(state, targetKey);
    if (!target) {
      sendError(res, 404, "object_not_found", "target_key not found");
      return;
    }

    const actorPos = {
      x: actorX === null ? (target.x | 0) : actorX,
      y: actorY === null ? (target.y | 0) : actorY,
      z: actorZ === null ? (target.z | 0) : actorZ
    };

    const container = containerKey ? findActiveObjectByKey(state, containerKey) : null;
    if (verb === "put" && !container) {
      sendError(res, 404, "container_not_found", "container_key not found");
      return;
    }

    const targetChainResult = analyzeContainmentChainViaSimCore(state.worldObjects.active, target);
    if (!targetChainResult.ok) {
      sendError(res, 500, "assoc_bridge_failed", String(targetChainResult.message || "assoc-chain bridge failed"));
      return;
    }
    const targetChain = targetChainResult.value;
    let containerCycle = false;
    let containerChain = null;
    if (verb === "put" && container) {
      const containerChainResult = analyzeContainmentChainViaSimCore(state.worldObjects.active, container);
      if (!containerChainResult.ok) {
        sendError(res, 500, "assoc_bridge_failed", String(containerChainResult.message || "assoc-chain bridge failed"));
        return;
      }
      containerChain = containerChainResult.value;
      containerCycle = String(container.object_key || "") === String(target.object_key || "")
        || (containerChain.assoc_chain || []).includes(String(target.object_key || ""));
    }

    const applied = applyCanonicalWorldInteractionCommand({
      verb,
      target,
      container,
      actorId,
      actorPos,
      chainAccessible: targetChain.chain_accessible,
      containerCycle
    });
    if (!applied.ok) {
      if (applied.code === "interaction_container_blocked") {
        sendJson(res, 409, {
          error: {
            code: "interaction_container_blocked",
            message: String(applied.message || "contained object chain is not accessible"),
            blocked_by: String(targetChain.blocked_by || "")
          }
        });
        return;
      }
      if (applied.code === "interaction_container_cycle") {
        sendJson(res, 409, {
          error: {
            code: "interaction_container_cycle",
            message: String(applied.message || "cannot create containment cycle"),
            blocked_by: String(containerChain?.blocked_by || "")
          }
        });
        return;
      }
      sendError(res, Number(applied.http) || 409, applied.code, String(applied.message || "interaction failed"));
      return;
    }

    Object.assign(target, applied.patch || {});
    persistPatchedObject(state, target);
    const event = recordWorldInteractionEvent(state, {
      verb,
      actor_id: actorId,
      target_key: String(target.object_key || ""),
      container_key: String(container?.object_key || ""),
      status: Number(target.status) & 0xff,
      x: target.x | 0,
      y: target.y | 0,
      z: target.z | 0,
      holder_kind: String(target.holder_kind || "none"),
      holder_id: String(target.holder_id || ""),
      holder_key: String(target.holder_key || ""),
      runtime_profile: runtimeContract.profile,
      runtime_extensions: runtimeContract.extensions
    });

    state.worldObjects.active.sort(compareLegacyWorldObjectOrder);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      verb,
      target: {
        object_key: String(target.object_key || ""),
        status: Number(target.status) & 0xff,
        coord_use: coordUseOfStatus(target.status),
        holder_kind: String(target.holder_kind || "none"),
        holder_id: String(target.holder_id || ""),
        holder_key: String(target.holder_key || ""),
        x: target.x | 0,
        y: target.y | 0,
        z: target.z | 0,
        assoc_chain: targetChain.assoc_chain,
        root_anchor_key: targetChain.root_anchor_key,
        blocked_by: targetChain.blocked_by
      },
      interaction_checkpoint: {
        seq: Number(state.worldInteractionLog?.seq || event.seq || 0) >>> 0,
        hash: String(state.worldInteractionLog?.checkpoint_hash || "")
      },
      runtime_contract: runtimeContract,
      meta: worldObjectMeta(state)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/objects/reset") {
    reloadWorldObjectBaseline(state);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      reset_at: nowIso(),
      interaction_checkpoint: {
        seq: Number(state.worldInteractionLog?.seq || 0) >>> 0,
        hash: String(state.worldInteractionLog?.checkpoint_hash || "")
      },
      meta: worldObjectMeta(state)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/objects/reload-baseline") {
    reloadWorldObjectBaseline(state);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      reloaded_at: nowIso(),
      interaction_checkpoint: {
        seq: Number(state.worldInteractionLog?.seq || 0) >>> 0,
        hash: String(state.worldInteractionLog?.checkpoint_hash || "")
      },
      meta: worldObjectMeta(state)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/snapshot") {
    sendJson(res, 200, {
      snapshot_meta: state.worldSnapshot.snapshot_meta,
      snapshot_base64: state.worldSnapshot.snapshot_base64,
      updated_at: state.worldSnapshot.updated_at
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/snapshot") {
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
    state.worldSnapshot.snapshot_base64 = snapshotBase64;
    state.worldSnapshot.snapshot_meta = {
      schema_version: Number(body.schema_version) || 1,
      sim_core_version: String(body.sim_core_version || "unknown"),
      saved_tick: Number(body.saved_tick) || 0,
      snapshot_hash: computeSnapshotHash(snapshotBase64)
    };
    state.worldSnapshot.updated_at = nowIso();
    persistState(state);
    sendJson(res, 200, {
      snapshot_meta: state.worldSnapshot.snapshot_meta,
      updated_at: state.worldSnapshot.updated_at
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

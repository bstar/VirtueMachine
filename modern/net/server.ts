"use strict";

import type { IncomingMessage, ServerResponse } from "node:http";
import type { NetConnectOpts } from "node:net";
import type { ConnectionOptions } from "node:tls";
import type {
  NpcBaselineRuntime,
  NpcRenderableEntry,
  NpcRuntimePersistRuntime,
  ScheduledNpcStepRuntime,
  ScheduledNpcStateRuntime,
  U6ScheduleTableRuntime
} from "./npc_runtime.ts";
import type {
  CriticalItemPolicyRuntime,
  PresenceRowRuntime,
  WorldClockRuntime,
  WorldInteractionLogRuntime,
  WorldSnapshotRuntime
} from "./server_runtime.ts";
import type {
  ServerCharacterRuntime,
  ServerTokenRuntime,
  ServerUserRuntime
} from "./server_account_runtime.ts";
import type { JsonValueRuntime } from "./server_file_store.ts";
import type { U6MapRuntime as U6MapRuntimeType } from "./world_map_runtime.ts";
import type { WorldObject, WorldObjectState } from "./world_object_types.ts";
import type { ConversationSessionMapRuntime } from "./conversation_runtime_types.ts";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const nodeCrypto = require("node:crypto");
const net = require("node:net");
const tls = require("node:tls");
const {
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILES,
  normalizeRuntimeProfile,
  parseRuntimeExtensionsHeader
} = require("../common/runtime_contract.ts");
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
const { U6MapRuntime, loadTerrainTypeMap, loadTileFlagMap } = require("./world_map_runtime.ts");
const {
  buildObjectAnchorIndex,
  canNpcStepInto,
  objectFootprintCells,
  refreshWorldObjectIndexes
} = require("./world_object_collision.ts");
const {
  inventoryCloneKeyForTake,
  isBaselineWorldObject,
  pickupRespawnPolicyForObject,
  pushSpawnedWorldObject,
  worldObjectInteractionPayload,
  worldObjectInventoryPayload,
  worldObjectTakeInventoryPayload
} = require("./world_object_policy.ts");
const {
  buildWorldObjectStateRuntime,
  compareLegacyWorldObjectOrder,
  findActiveObjectByKey,
  normalizeWorldObjectDeltas,
  parseBaseTileMapRuntime,
  parseObjBlkRecordsRuntime,
  persistPatchedObject,
  worldObjectMeta: buildWorldObjectMeta
} = require("./world_object_state_runtime.ts");
const {
  INTRO_PHASE_POST_RUNTIME,
  INTRO_PHASE_PRE_RUNTIME,
  defaultNpcRuntimeStateRuntime,
  loadNpcBaselineRuntime,
  loadScheduleRuntime,
  buildScheduledNpcStatesRuntime,
  normalizeNpcRuntimeStateRuntime
} = require("./npc_runtime.ts");
const {
  ensureConversationRuntimeState,
  startAuthoritativeConversation,
  replyAuthoritativeConversation
} = require("./conversation_runtime.ts");
const {
  resendDeliverRuntime,
  smtpDeliverRuntime
} = require("./email_runtime.ts");
const {
  ensureUserSchemaRuntime,
  findUserByUsernameRuntime,
  findUserForBearerTokenRuntime,
  issueEmailVerificationCodeRuntime,
  issueTokenRuntime,
  isValidEmailRuntime,
  listUserCharactersRuntime,
  newUserIdRuntime,
  normalizeEmailRuntime,
  normalizeServerCharactersRuntime,
  normalizeServerTokensRuntime,
  normalizeServerUsersRuntime,
  normalizeUsernameRuntime,
  parseAuthHeaderRuntime,
  sixDigitEmailVerificationCodeRuntime
} = require("./server_account_runtime.ts");
const {
  advanceWorldClockMinuteRuntime,
  buildPresenceHeartbeatRowRuntime,
  clampIntRuntime,
  computeSnapshotHashRuntime,
  defaultCriticalPolicyRuntime,
  defaultWorldInteractionLogRuntime,
  defaultWorldClockRuntime,
  defaultWorldSnapshotRuntime,
  normalizeCriticalPolicyRuntime,
  normalizePresenceRowsRuntime,
  normalizeWorldInteractionLogRuntime,
  normalizeWorldClockRuntime,
  normalizeWorldSnapshotRuntime,
  presenceRowsPayloadRuntime,
  queryIntOrRuntime,
  recordWorldInteractionEventRuntime,
  removePresenceForUserRuntime,
  removePresenceSessionRuntime,
  prunePresenceRowsRuntime,
  runCriticalItemMaintenanceRuntime,
  upsertPresenceRowRuntime
} = require("./server_runtime.ts");
const {
  appendJsonLineRuntime,
  ensureServerDataDirRuntime,
  readJsonFileValidatedRuntime,
  readJsonLinesRuntime,
  writeJsonFileRuntime
} = require("./server_file_store.ts");
const {
  readJsonBodyRuntime,
  sendErrorRuntime: sendError,
  sendJsonRuntime: sendJson
} = require("./server_http_runtime.ts");

const HOST = process.env.VM_NET_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.VM_NET_PORT || "8081", 10);
const DATA_DIR = process.env.VM_NET_DATA_DIR || path.join(__dirname, "data");
const RUNTIME_DIR = process.env.VM_NET_RUNTIME_DIR || path.join(__dirname, "..", "assets", "runtime");
const OBJECT_BASELINE_DIR = process.env.VM_NET_OBJECT_BASELINE_DIR || path.join(__dirname, "..", "assets", "runtime", "savegame");
const MAX_BODY = 1024 * 1024;
const SERVER_TICK_MS = Math.max(50, Number.parseInt(process.env.VM_NET_TICK_MS || "100", 10) || 100);
// Ultima VI Online documents this schedule cadence as one in-game day per real hour.
const SERVER_TICKS_PER_MINUTE = Math.max(1, Number.parseInt(process.env.VM_NET_TICKS_PER_MINUTE || "25", 10) || 25);
const SERVER_CLOCK_CATCHUP_MAX_MS = Math.max(0, Number.parseInt(process.env.VM_NET_CLOCK_CATCHUP_MAX_MS || "5000", 10) || 5000);
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
  npcRuntime: path.join(DATA_DIR, "world_npc_runtime.json"),
  criticalPolicy: path.join(DATA_DIR, "critical_item_policy.json"),
  recoveriesLog: path.join(DATA_DIR, "critical_item_recoveries.log"),
  worldObjectDeltas: path.join(DATA_DIR, "world_object_deltas.json"),
  worldInteractionLog: path.join(DATA_DIR, "world_interaction_log.json")
};
const INTRO_PHASE_PRE = INTRO_PHASE_PRE_RUNTIME;
const INTRO_PHASE_POST = INTRO_PHASE_POST_RUNTIME;

type ServerState = {
  characters: ServerCharacterRuntime[];
  conversationArchives: unknown;
  conversationSessions: ConversationSessionMapRuntime;
  criticalPolicy: CriticalItemPolicyRuntime[];
  introState: { phase: string };
  mapRuntime: U6MapRuntimeType;
  npcBaseline: NpcBaselineRuntime;
  npcPilot: ScheduledNpcStateRuntime[];
  npcPilotById: Map<number, ScheduledNpcStateRuntime>;
  npcRuntime: NpcBaselineRuntime | null;
  npcRuntimeById: Map<number, NpcRenderableEntry>;
  npcRuntimePersist: NpcRuntimePersistRuntime;
  npcScheduleById: Map<number, ScheduledNpcStateRuntime>;
  npcStates: ScheduledNpcStateRuntime[];
  presence: PresenceRowRuntime[];
  scheduleRuntime: U6ScheduleTableRuntime;
  tokens: ServerTokenRuntime[];
  users: ServerUserRuntime[];
  worldClock: WorldClockRuntime;
  worldInteractionLog: WorldInteractionLogRuntime;
  worldObjects: WorldObjectState;
  worldSnapshot: WorldSnapshotRuntime;
};

type CreatedServerUser = ServerUserRuntime & { created_at: string };

type ServerRequestBody = {
  actor_id?: unknown;
  actor_x?: unknown;
  actor_y?: unknown;
  actor_z?: unknown;
  code?: unknown;
  container_key?: unknown;
  critical_item_policy?: unknown;
  email?: unknown;
  name?: unknown;
  new_password?: unknown;
  npc_id?: unknown;
  old_password?: unknown;
  password?: unknown;
  phase?: unknown;
  player_name?: unknown;
  saved_tick?: unknown;
  schema_version?: unknown;
  session_id?: unknown;
  sim_core_version?: unknown;
  snapshot_base64?: unknown;
  target_key?: unknown;
  typed?: unknown;
  username?: unknown;
  verb?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function ensureDataDir() {
  ensureServerDataDirRuntime(DATA_DIR);
}

function readJsonValidated<T>(filePath: string, fallback: T, validate: (raw: unknown) => T): T {
  return readJsonFileValidatedRuntime(filePath, fallback, validate);
}

function writeJson(filePath: string, value: unknown): void {
  writeJsonFileRuntime(filePath, value);
}

function appendJsonLine(filePath: string, value: unknown): void {
  appendJsonLineRuntime(filePath, value);
}

function readJsonLines(filePath: string): JsonValueRuntime[] {
  return readJsonLinesRuntime(filePath);
}

function normalizeUsername(raw: unknown): string {
  return normalizeUsernameRuntime(raw);
}

function normalizeEmail(raw: unknown): string {
  return normalizeEmailRuntime(raw);
}

function isValidEmail(raw: unknown): boolean {
  return isValidEmailRuntime(raw);
}

function newUserId(state: Pick<ServerState, "users">): string {
  return newUserIdRuntime(state.users, (bytes: number) => nodeCrypto.randomBytes(bytes).toString("hex"));
}

function findUserByUsername(state: Pick<ServerState, "users">, username: unknown): ServerUserRuntime | null {
  return findUserByUsernameRuntime(state.users, username);
}

function ensureUserSchema(user: ServerUserRuntime): void {
  ensureUserSchemaRuntime(user);
}

function parseAuth(req: IncomingMessage): string {
  return parseAuthHeaderRuntime(req.headers.authorization || "");
}

function runtimeContractFromHeaders(req: IncomingMessage): { extensions: string[]; profile: string } {
  return {
    profile: normalizeRuntimeProfile(req?.headers?.["x-vm-runtime-profile"]),
    extensions: parseRuntimeExtensionsHeader(req?.headers?.["x-vm-runtime-extensions"])
  };
}

function runtimeContractSpec(): {
  default_profile: string;
  extension_header_format: string;
  notes: string[];
  profiles: string[];
} {
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

function asServerRequestBody(raw: unknown): ServerRequestBody {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as ServerRequestBody;
}

async function readBody(req: IncomingMessage): Promise<ServerRequestBody> {
  const body = await readJsonBodyRuntime(req, MAX_BODY);
  return asServerRequestBody(body);
}

function defaultCriticalPolicy(): CriticalItemPolicyRuntime[] {
  return defaultCriticalPolicyRuntime();
}

function defaultWorldClock(): WorldClockRuntime {
  return defaultWorldClockRuntime();
}

function defaultWorldSnapshot(): WorldSnapshotRuntime {
  return defaultWorldSnapshotRuntime(nowIso());
}

function defaultNpcRuntimeState(baseline: Pick<NpcBaselineRuntime, "talkFlags"> | null | undefined): NpcRuntimePersistRuntime {
  return defaultNpcRuntimeStateRuntime(baseline);
}

function normalizeNpcRuntimeState(raw: unknown, baseline: Pick<NpcBaselineRuntime, "talkFlags"> | null | undefined): NpcRuntimePersistRuntime {
  return normalizeNpcRuntimeStateRuntime(raw, baseline);
}

function rebuildNpcRuntimeState(state: ServerState): void {
  const introPhase = String(state?.npcRuntimePersist?.intro_phase || INTRO_PHASE_POST).trim().toLowerCase() === INTRO_PHASE_PRE
    ? INTRO_PHASE_PRE
    : INTRO_PHASE_POST;
  const talkFlags = Array.isArray(state?.npcRuntimePersist?.talk_flags)
    ? state.npcRuntimePersist.talk_flags.slice(0, 0x100)
    : defaultNpcRuntimeState(state.npcBaseline).talk_flags;
  state.introState = {
    phase: introPhase
  };
  state.npcRuntime = {
    ...state.npcBaseline,
    talkFlags
  };
  state.npcRuntimeById = new Map();
  for (const entry of state.npcRuntime.entries) {
    state.npcRuntimeById.set(Number(entry.id) | 0, entry);
  }
  if (!Array.isArray(state.npcStates)) {
    state.npcStates = buildScheduledNpcStatesRuntime(
      state.npcRuntime,
      state.scheduleRuntime,
      state.worldClock,
      [],
      0,
      { canStep: (step: ScheduledNpcStepRuntime) => canNpcStepInto(state, step) }
    );
  }
  rebuildNpcScheduleIndex(state);
  state.npcRuntimePersist = {
    intro_phase: introPhase,
    talk_flags: state.npcRuntime.talkFlags
  };
}

function rebuildNpcScheduleIndex(state: ServerState): void {
  state.npcPilot = Array.isArray(state.npcStates) ? state.npcStates : [];
  state.npcPilotById = new Map();
  state.npcScheduleById = new Map();
  for (const row of state.npcPilot) {
    const npcId = Number(row.npc_id) | 0;
    state.npcPilotById.set(npcId, row);
    state.npcScheduleById.set(npcId, row);
  }
}

function updateNpcScheduleStates(state: ServerState, elapsedTicks: number): void {
  if (!state?.npcRuntime || !state?.scheduleRuntime || !state?.worldClock) {
    return;
  }
  state.npcStates = buildScheduledNpcStatesRuntime(
    state.npcRuntime,
    state.scheduleRuntime,
    state.worldClock,
    Array.isArray(state.npcStates) ? state.npcStates : [],
    elapsedTicks,
    { canStep: (step: ScheduledNpcStepRuntime) => canNpcStepInto(state, step) }
  );
  rebuildNpcScheduleIndex(state);
}

function normalizeWorldClock(raw: unknown): WorldClockRuntime {
  return normalizeWorldClockRuntime(raw);
}

function clampInt(n: unknown, lo: number, hi: number): number {
  return clampIntRuntime(n, lo, hi);
}

function queryIntOr(url: URL, key: string, fallback: number): number {
  return queryIntOrRuntime(url, key, fallback);
}

function loadBaseTileMap(runtimeDir: string): Uint16Array {
  const basetilePath = path.join(runtimeDir, "basetile");
  try {
    const buf = fs.readFileSync(basetilePath);
    return parseBaseTileMapRuntime(buf);
  } catch (_err) {
    return parseBaseTileMapRuntime(null);
  }
}

function assertObjBaselineDir(dir: string): string {
  const names: string[] = fs.readdirSync(dir);
  const objblkCount = names.filter((name: string) => /^objblk[a-h][a-h]$/i.test(name)).length;
  if (objblkCount < 64) {
    throw new Error(`incomplete object baseline in ${dir}: expected >=64 objblk files, found ${objblkCount}`);
  }
  if (!names.some((name: string) => /^objlist$/i.test(name))) {
    throw new Error(`missing objlist in object baseline dir: ${dir}`);
  }
  return dir;
}

function parseObjBlkRecords(bytes: Uint8Array | Buffer | null | undefined, areaId: number, baseTileMap: Uint16Array): WorldObject[] {
  return parseObjBlkRecordsRuntime(bytes, areaId, baseTileMap);
}

function loadWorldObjectBaseline(runtimeDir: string): {
  baseline_count: number;
  files_loaded: number;
  loaded_at: string;
  objects: WorldObject[];
  source_dir: string;
} {
  const sourceDir = assertObjBaselineDir(OBJECT_BASELINE_DIR);
  const loadedAt = nowIso();
  const baseTileMap = loadBaseTileMap(runtimeDir);
  const objects: WorldObject[] = [];
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

function buildWorldObjectState(runtimeDir: string, rawDeltas: unknown): WorldObjectState {
  const baseline = loadWorldObjectBaseline(runtimeDir);
  const tileFlags = loadTileFlagMap(runtimeDir);
  const terrainType = loadTerrainTypeMap(runtimeDir);
  return buildWorldObjectStateRuntime({
    baseline,
    buildObjectAnchorIndex,
    nowMs: Date.now(),
    rawDeltas,
    tileFlags,
    terrainType
  });
}

function worldObjectMeta(state: Pick<ServerState, "worldObjects">) {
  return buildWorldObjectMeta(state, OBJECT_BASELINE_DIR);
}

function defaultWorldInteractionLog(): WorldInteractionLogRuntime {
  return defaultWorldInteractionLogRuntime();
}

function normalizeWorldInteractionLog(raw: unknown): WorldInteractionLogRuntime {
  return normalizeWorldInteractionLogRuntime(raw);
}

function recordWorldInteractionEvent(state: Pick<ServerState, "worldInteractionLog">, event: unknown) {
  return recordWorldInteractionEventRuntime(state, event);
}

function reloadWorldObjectBaseline(state: ServerState): void {
  state.worldObjects = buildWorldObjectState(RUNTIME_DIR, null);
  state.mapRuntime = new U6MapRuntime(RUNTIME_DIR);
  writeJson(FILES.worldObjectDeltas, []);
  state.worldInteractionLog = defaultWorldInteractionLog();
  writeJson(FILES.worldInteractionLog, state.worldInteractionLog);
}

function advanceWorldClockMinute(clock: Parameters<typeof advanceWorldClockMinuteRuntime>[0]): void {
  advanceWorldClockMinuteRuntime(clock, {
    daysPerMonth: SERVER_DAYS_PER_MONTH,
    hoursPerDay: SERVER_HOURS_PER_DAY,
    minutesPerHour: SERVER_MINUTES_PER_HOUR,
    monthsPerYear: SERVER_MONTHS_PER_YEAR
  });
}

function updateAuthoritativeClock(state: ServerState): WorldClockRuntime {
  const nowMs = Date.now();
  if (!state.worldClock) {
    state.worldClock = defaultWorldClock();
  }
  const clock = state.worldClock;
  let deltaMs = nowMs - Number(clock.last_advanced_at_ms || 0);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    deltaMs = 0;
  }
  if (SERVER_CLOCK_CATCHUP_MAX_MS > 0 && deltaMs > SERVER_CLOCK_CATCHUP_MAX_MS) {
    deltaMs = SERVER_CLOCK_CATCHUP_MAX_MS;
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
  rebuildNpcRuntimeState(state);
  updateNpcScheduleStates(state, steps);
  return clock;
}

function normalizePresenceRows(raw: unknown): PresenceRowRuntime[] {
  return normalizePresenceRowsRuntime(raw);
}

function loadState(): ServerState {
  ensureDataDir();
  const rawWorldObjectDeltas = readJsonValidated(FILES.worldObjectDeltas, null, normalizeWorldObjectDeltas);
  const worldObjects = buildWorldObjectState(RUNTIME_DIR, rawWorldObjectDeltas);
  const npcBaseline = loadNpcBaselineRuntime(RUNTIME_DIR);
  const scheduleRuntime = loadScheduleRuntime(RUNTIME_DIR);
  const state: ServerState = {
    users: readJsonValidated(FILES.users, [], normalizeServerUsersRuntime),
    tokens: readJsonValidated(FILES.tokens, [], normalizeServerTokensRuntime),
    characters: readJsonValidated(FILES.characters, [], normalizeServerCharactersRuntime),
    worldSnapshot: readJsonValidated(FILES.worldSnapshot, defaultWorldSnapshot(), (raw) => normalizeWorldSnapshotRuntime(raw, nowIso())),
    presence: readJsonValidated(FILES.presence, [], normalizePresenceRows),
    worldClock: readJsonValidated(FILES.worldClock, defaultWorldClock(), normalizeWorldClock),
    npcBaseline,
    scheduleRuntime,
    npcRuntimePersist: readJsonValidated(FILES.npcRuntime, defaultNpcRuntimeState(npcBaseline), (raw) => normalizeNpcRuntimeState(raw, npcBaseline)),
    introState: {
      phase: INTRO_PHASE_POST
    },
    npcRuntime: null,
    npcRuntimeById: new Map<number, NpcRenderableEntry>(),
    npcStates: [],
    npcScheduleById: new Map<number, ScheduledNpcStateRuntime>(),
    npcPilot: [],
    npcPilotById: new Map<number, ScheduledNpcStateRuntime>(),
    conversationArchives: null,
    conversationSessions: Object.create(null),
    criticalPolicy: readJsonValidated(FILES.criticalPolicy, defaultCriticalPolicy(), normalizeCriticalPolicyRuntime),
    worldObjects,
    mapRuntime: new U6MapRuntime(RUNTIME_DIR),
    worldInteractionLog: readJsonValidated(FILES.worldInteractionLog, defaultWorldInteractionLog(), normalizeWorldInteractionLog)
  };
  if (!Array.isArray(state.presence)) {
    state.presence = [];
  }
  for (const user of state.users) {
    ensureUserSchema(user);
  }
  rebuildNpcRuntimeState(state);
  ensureConversationRuntimeState(state, RUNTIME_DIR);
  return state;
}

function persistState(state: ServerState): void {
  writeJson(FILES.users, state.users);
  writeJson(FILES.tokens, state.tokens);
  writeJson(FILES.characters, state.characters);
  writeJson(FILES.worldSnapshot, state.worldSnapshot);
  writeJson(FILES.presence, state.presence);
  writeJson(FILES.worldClock, state.worldClock);
  writeJson(FILES.npcRuntime, state.npcRuntimePersist || defaultNpcRuntimeState(state.npcBaseline));
  writeJson(FILES.criticalPolicy, state.criticalPolicy);
  writeJson(FILES.worldObjectDeltas, state.worldObjects.deltas);
  writeJson(FILES.worldInteractionLog, state.worldInteractionLog || defaultWorldInteractionLog());
}

function prunePresence(state: ServerState, nowMs = Date.now()): void {
  state.presence = prunePresenceRowsRuntime(state.presence, {
    nowMs,
    ttlMs: PRESENCE_TTL_MS
  });
}

function upsertPresenceRow(state: ServerState, row: PresenceRowRuntime, nowMs = Date.now()): void {
  state.presence = upsertPresenceRowRuntime(state.presence, row, {
    nowMs,
    ttlMs: PRESENCE_TTL_MS
  });
}

function requireUser(state: ServerState, req: IncomingMessage, res: ServerResponse): ServerUserRuntime | null {
  const token = parseAuth(req);
  if (!token) {
    sendError(res, 401, "auth_required", "Missing bearer token");
    return null;
  }
  const auth = findUserForBearerTokenRuntime({
    nowMs: Date.now(),
    token,
    tokens: state.tokens,
    users: state.users
  });
  if (auth.code === "invalid") {
    sendError(res, 401, "auth_invalid", "Invalid or expired token");
    return null;
  }
  if (auth.code === "user_not_found") {
    sendError(res, 401, "auth_invalid", "Token user not found");
    return null;
  }
  return auth.user;
}

function issueToken(state: Pick<ServerState, "tokens">, userId: unknown): string {
  return issueTokenRuntime(state.tokens, {
    nowIso: nowIso(),
    nowMs: Date.now(),
    randomHex: (bytes: number) => nodeCrypto.randomBytes(bytes).toString("hex"),
    userId
  });
}

function issueEmailVerificationCode(user: ServerUserRuntime): string {
  return issueEmailVerificationCodeRuntime(user, {
    code: sixDigitEmailVerificationCodeRuntime(Math.random()),
    issuedAt: nowIso(),
    expiresAtMs: Date.now() + (1000 * 60 * 15)
  });
}

interface EmailDeliveryLog {
  kind: "email_delivery";
  at: string;
  to: string;
  subject: string;
  body_text: string;
  mode: string;
  status: "queued" | "sent" | "failed" | "logged";
  error?: string;
  provider_id?: string;
  template?: string;
  user_id?: string;
}

type EmailDeliveryMeta = {
  template?: unknown;
  user_id?: unknown;
};

async function smtpDeliver(toEmail: string, subject: string, bodyText: string) {
  return smtpDeliverRuntime({
    bodyText,
    connect: (options: NetConnectOpts) => net.connect(options),
    fromEmail: EMAIL_FROM,
    helo: EMAIL_SMTP_HELO,
    host: EMAIL_SMTP_HOST,
    pass: EMAIL_SMTP_PASS,
    port: EMAIL_SMTP_PORT,
    rejectUnauthorized: process.env.VM_EMAIL_SMTP_REJECT_UNAUTHORIZED,
    secure: EMAIL_SMTP_SECURE,
    subject,
    timeoutMs: EMAIL_SMTP_TIMEOUT_MS,
    tlsConnect: (options: ConnectionOptions) => tls.connect(options),
    toEmail,
    user: EMAIL_SMTP_USER
  });
}

async function resendDeliver(toEmail: string, subject: string, bodyText: string) {
  return resendDeliverRuntime({
    apiKey: EMAIL_RESEND_API_KEY,
    baseUrl: EMAIL_RESEND_BASE_URL,
    bodyText,
    fetchImpl: fetch,
    fromEmail: EMAIL_FROM,
    subject,
    toEmail
  });
}

async function deliverEmail(toEmail: unknown, subject: unknown, bodyText: unknown, meta: EmailDeliveryMeta = {}) {
  const delivery: EmailDeliveryLog = {
    kind: "email_delivery",
    at: nowIso(),
    to: normalizeEmail(toEmail),
    subject: String(subject || ""),
    body_text: String(bodyText || ""),
    mode: EMAIL_MODE,
    status: "queued",
    template: meta.template == null ? undefined : String(meta.template || ""),
    user_id: meta.user_id == null ? undefined : String(meta.user_id || "")
  };
  if (EMAIL_MODE === "smtp") {
    try {
      await smtpDeliver(delivery.to, delivery.subject, delivery.body_text);
      delivery.status = "sent";
    } catch (err) {
      delivery.status = "failed";
      delivery.error = errorMessage(err);
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
      delivery.error = errorMessage(err);
      appendJsonLine(FILES.emailOutbox, delivery);
      throw new Error(`email delivery failed: ${delivery.error}`);
    }
  } else {
    delivery.status = "logged";
  }
  appendJsonLine(FILES.emailOutbox, delivery);
  return delivery;
}

function listUserCharacters(state: Pick<ServerState, "characters">, userId: unknown): ServerCharacterRuntime[] {
  return listUserCharactersRuntime(state.characters, userId);
}

function computeSnapshotHash(snapshotBase64: unknown): string {
  return computeSnapshotHashRuntime(snapshotBase64);
}

function runCriticalItemMaintenance(state: Pick<ServerState, "criticalPolicy">, payload: unknown) {
  const recoveryEvents = readJsonLines(FILES.recoveriesLog);
  const emitted = runCriticalItemMaintenanceRuntime({
    criticalPolicy: state.criticalPolicy,
    nowIso: nowIso(),
    payload,
    recoveryEvents
  });
  for (const event of emitted) {
    appendJsonLine(FILES.recoveriesLog, event);
  }
  return emitted;
}

const state = loadState();
prunePresence(state);
persistState(state);

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
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

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

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
      sendError(res, 400, "bad_json", errorMessage(err));
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
      const createdUser: CreatedServerUser = {
        user_id: newUserId(state),
        username,
        password_plaintext: password,
        email: "",
        email_verified: false,
        email_verification: null,
        created_at: nowIso()
      };
      user = createdUser;
      state.users.push(user);
    } else if (!user.password_plaintext) {
      user.password_plaintext = password;
    } else if (user.password_plaintext !== password) {
      sendError(res, 401, "auth_invalid", "invalid username/password");
      return;
    }
    // Ensure old sessions for this account do not survive re-login as ghost presences.
    state.presence = removePresenceForUserRuntime(state.presence, user.user_id, {
      nowMs: Date.now(),
      ttlMs: PRESENCE_TTL_MS
    });
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
      sendError(res, 400, "bad_json", errorMessage(err));
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
    const pendingVerification = user.email_verification;
    if (!pendingVerification) {
      sendError(res, 500, "verification_not_issued", "email verification could not be issued");
      return;
    }
    let delivery;
    try {
      delivery = await deliverEmail(
        email,
        "VirtueMachine Email Verification",
        `Your VirtueMachine verification code is: ${code}`,
        { user_id: user.user_id, template: "verify_email" }
      );
    } catch (err) {
      sendError(res, 502, "email_delivery_failed", errorMessage(err));
      return;
    }
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      delivery_id: `${delivery.at}:${delivery.to}`,
      email: email,
      expires_at_ms: pendingVerification.expires_at_ms
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
      sendError(res, 400, "bad_json", errorMessage(err));
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
      sendError(res, 400, "bad_json", errorMessage(err));
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
      sendError(res, 502, "email_delivery_failed", errorMessage(err));
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
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const name = String(body && body.name || "").trim();
    if (!name || name.length < 2) {
      sendError(res, 400, "bad_character_name", "name is required");
      return;
    }

    const c = {
      character_id: nodeCrypto.randomUUID(),
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
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    if (!Array.isArray(body && body.critical_item_policy)) {
      sendError(res, 400, "bad_policy", "critical_item_policy array is required");
      return;
    }
    state.criticalPolicy = normalizeCriticalPolicyRuntime(body.critical_item_policy);
    persistState(state);
    sendJson(res, 200, { critical_item_policy: state.criticalPolicy });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/critical-items/maintenance") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", errorMessage(err));
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
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const sessionId = String(body && body.session_id || "").trim();
    if (!sessionId || sessionId.length < 8) {
      sendError(res, 400, "bad_session_id", "session_id is required");
      return;
    }
    const nowMs = Date.now();
    const clock = updateAuthoritativeClock(state);
    const row = buildPresenceHeartbeatRowRuntime({
      body,
      clockTick: clock.tick,
      nowMs,
      runtimeContract,
      userId: user.user_id,
      username: user.username
    });
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
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const sessionId = String(body && body.session_id || "").trim();
    if (!sessionId || sessionId.length < 8) {
      sendError(res, 400, "bad_session_id", "session_id is required");
      return;
    }
    const removed = removePresenceSessionRuntime(state.presence, {
      nowMs: Date.now(),
      sessionId,
      ttlMs: PRESENCE_TTL_MS,
      userId: user.user_id
    });
    state.presence = removed.rows;
    persistState(state);
    sendJson(res, 200, { ok: true, removed: removed.key });
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
      intro_state: state.introState,
      npc_states: Array.isArray(state.npcStates) ? state.npcStates : [],
      npc_overrides: Array.isArray(state.npcPilot) ? state.npcPilot : [],
      runtime_contract: runtimeContract
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/intro-state") {
    sendJson(res, 200, {
      intro_state: state.introState
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/intro-state") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const phase = String(body && body.phase || "").trim().toLowerCase();
    if (phase !== INTRO_PHASE_PRE && phase !== INTRO_PHASE_POST) {
      sendError(res, 400, "bad_intro_phase", "phase must be one of: pre_intro, post_intro");
      return;
    }
    state.npcRuntimePersist = {
      ...state.npcRuntimePersist,
      intro_phase: phase
    };
    rebuildNpcRuntimeState(state);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      intro_state: state.introState
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/presence") {
    prunePresence(state);
    persistState(state);
    sendJson(res, 200, {
      players: presenceRowsPayloadRuntime(state.presence)
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
    const byKey = new Map<string, WorldObject>();
    for (const obj of state.worldObjects.active) {
      const key = String(obj.object_key || "");
      if (key) byKey.set(key, obj);
    }
    const selected = selection.keys
      .map((k: unknown) => byKey.get(String(k)))
      .filter((obj: WorldObject | undefined): obj is WorldObject => !!obj);
    const diagResult = analyzeContainmentChainsBatchViaSimCore(state.worldObjects.active, selected);
    if (!diagResult.ok) {
      sendError(res, 500, "assoc_batch_bridge_failed", String(diagResult.message || "assoc-chain batch bridge failed"));
      return;
    }
    const out = selected.map((obj: WorldObject) => {
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
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const verb = String(body && body.verb || "").trim().toLowerCase();
    const targetKey = String(body && body.target_key || "").trim();
    const containerKey = String(body && body.container_key || "").trim();
    const actorId = String(body && body.actor_id || user.user_id || "").trim();
    const npcId = Number(body && body.npc_id) | 0;
    const actorX = Number.isFinite(Number(body && body.actor_x)) ? (Number(body.actor_x) | 0) : null;
    const actorY = Number.isFinite(Number(body && body.actor_y)) ? (Number(body.actor_y) | 0) : null;
    const actorZ = Number.isFinite(Number(body && body.actor_z)) ? (Number(body.actor_z) | 0) : null;
    if (verb === "talk") {
      const start = startAuthoritativeConversation(state, {
        npcId,
        actorPos: {
          x: actorX === null ? 0 : actorX,
          y: actorY === null ? 0 : actorY,
          z: actorZ === null ? 0 : actorZ
        },
        playerName: String(body && body.player_name || user.username || "Avatar")
      });
      if (!start.ok) {
        sendError(res, Number(start.http) || 409, String(start.code || "talk_failed"), String(start.message || "talk failed"));
        return;
      }
      persistState(state);
      sendJson(res, 200, {
        ok: true,
        verb,
        conversation_session: start.payload,
        runtime_contract: runtimeContract
      });
      return;
    }
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

    let responseTarget = target;
    let sourceTarget = null;
    let respawn = null;
    const baselineTakeCreatesClone = verb === "take" && isBaselineWorldObject(target);
    if (baselineTakeCreatesClone) {
      const clone = {
        ...target,
        object_key: inventoryCloneKeyForTake(state, target, actorId),
        source_kind: "spawned"
      };
      Object.assign(clone, applied.patch || {});
      pushSpawnedWorldObject(state, clone);
      state.worldObjects.active.push(clone);

      const policy = pickupRespawnPolicyForObject(target);
      const takenAtMs = Date.now();
      state.worldObjects.deltas.removed[String(target.object_key)] = true;
      state.worldObjects.deltas.respawns[String(target.object_key)] = {
        due_at_ms: takenAtMs + policy.respawn_ms,
        taken_at_ms: takenAtMs,
        respawn_ms: policy.respawn_ms,
        policy: policy.policy
      };
      state.worldObjects.active = state.worldObjects.active.filter(
        (obj) => String(obj.object_key || "") !== String(target.object_key || "")
      );
      sourceTarget = target;
      responseTarget = clone;
      respawn = {
        source_object_key: String(target.object_key || ""),
        due_at_ms: takenAtMs + policy.respawn_ms,
        respawn_ms: policy.respawn_ms,
        policy: policy.policy
      };
    } else {
      Object.assign(target, applied.patch || {});
      persistPatchedObject(state, target);
    }
    const event = recordWorldInteractionEvent(state, {
      verb,
      actor_id: actorId,
      target_key: String(sourceTarget?.object_key || responseTarget.object_key || ""),
      container_key: String(container?.object_key || ""),
      status: Number(responseTarget.status) & 0xff,
      x: responseTarget.x | 0,
      y: responseTarget.y | 0,
      z: responseTarget.z | 0,
      holder_kind: String(responseTarget.holder_kind || "none"),
      holder_id: String(responseTarget.holder_id || ""),
      holder_key: String(responseTarget.holder_key || ""),
      runtime_profile: runtimeContract.profile,
      runtime_extensions: runtimeContract.extensions
    });

    state.worldObjects.active.sort(compareLegacyWorldObjectOrder);
    refreshWorldObjectIndexes(state);
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      verb,
      target: worldObjectInteractionPayload(responseTarget, {
        assocChain: targetChain.assoc_chain,
        blockedBy: targetChain.blocked_by,
        rootAnchorKey: targetChain.root_anchor_key,
        sourceObject: sourceTarget
      }),
      inventory_item: baselineTakeCreatesClone ? worldObjectTakeInventoryPayload(responseTarget, sourceTarget) : null,
      respawn,
      interaction_checkpoint: {
        seq: Number(state.worldInteractionLog?.seq || event.seq || 0) >>> 0,
        hash: String(state.worldInteractionLog?.checkpoint_hash || "")
      },
      runtime_contract: runtimeContract,
      meta: worldObjectMeta(state)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/inventory") {
    const actorId = String(url.searchParams.get("actor_id") || user.user_id || "").trim();
    const objects = state.worldObjects.active
      .filter((obj) => (
        coordUseOfStatus(obj.status) === OBJ_COORD_USE_INVEN
        && String(obj.holder_kind || "") === "npc"
        && String(obj.holder_id || "") === actorId
      ))
      .sort(compareLegacyWorldObjectOrder)
      .map((obj) => worldObjectInventoryPayload(obj));
    sendJson(res, 200, {
      ok: true,
      actor_id: actorId,
      objects,
      meta: {
        inventory_count: objects.length >>> 0,
        ...worldObjectMeta(state)
      }
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

  if (req.method === "POST" && url.pathname === "/api/world/conversation/respond") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendError(res, 400, "bad_json", errorMessage(err));
      return;
    }
    const replied = replyAuthoritativeConversation(state, {
      sessionId: String(body && body.session_id || ""),
      typed: String(body && body.typed || "")
    });
    if (!replied.ok) {
      sendError(res, Number(replied.http) || 404, String(replied.code || "conversation_failed"), String(replied.message || "conversation failed"));
      return;
    }
    persistState(state);
    sendJson(res, 200, replied.payload);
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
      sendError(res, 400, "bad_json", errorMessage(err));
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
        sendError(res, 400, "bad_json", errorMessage(err));
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

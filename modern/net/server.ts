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
import type {
  EmailDeliveryLogRuntime,
  EmailDeliveryMetaRuntime
} from "./email_runtime.ts";
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
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_INVEN,
  OBJ_COORD_USE_EQUIP,
  coordUseOfStatus,
  applyCanonicalWorldInteractionCommand
} = require("./world_interaction_bridge.ts");
const { analyzeContainmentChainViaSimCore, analyzeContainmentChainsBatchViaSimCore } = require("./world_assoc_chain_bridge.ts");
const { selectWorldObjectsViaSimCore } = require("./world_objects_query_bridge.ts");
const { U6MapRuntime } = require("./world_map_runtime.ts");
const {
  canNpcStepInto,
  objectFootprintCells,
  refreshWorldObjectIndexes
} = require("./world_object_collision.ts");
const {
  applyBaselineTakeCloneRuntime,
  applySpawnedObjectLifecycleForInteractionRuntime,
  canTakeWorldObject,
  expireDueWorldObjectLifecycleDeltasRuntime,
  isBaselineWorldObject,
  sanitizeSnapshotInventoryBase64,
  worldObjectInteractionPayload,
  worldObjectInventoryPayload,
  worldObjectTakeInventoryPayload
} = require("./world_object_policy.ts");
const {
  compareLegacyWorldObjectOrder,
  findActiveObjectByKey,
  normalizeWorldObjectDeltas,
  persistPatchedObject,
  worldObjectMeta: buildWorldObjectMeta
} = require("./world_object_state_runtime.ts");
const {
  buildWorldObjectStateFromBaselineRuntime
} = require("./world_object_baseline_runtime.ts");
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
  deliverEmailRuntime
} = require("./email_runtime.ts");
const {
  ensureUserSchemaRuntime,
  findUserForBearerTokenRuntime,
  changeAccountPasswordRuntime,
  characterCreatedPayloadRuntime,
  characterSnapshotPayloadRuntime,
  issueEmailVerificationCodeRuntime,
  isValidEmailRuntime,
  listUserCharactersRuntime,
  loginAccountRuntime,
  normalizeEmailRuntime,
  normalizeServerCharactersRuntime,
  normalizeServerTokensRuntime,
  normalizeServerUsersRuntime,
  parseAuthHeaderRuntime,
  passwordRecoveryAccountRuntime,
  publicUserPayloadRuntime,
  setAccountEmailRuntime,
  secureSixDigitEmailVerificationCodeRuntime,
  validateCharacterNameRuntime,
  verifyAccountEmailRuntime
} = require("./server_account_runtime.ts");
const {
  advanceWorldClockMinuteRuntime,
  buildPresenceHeartbeatRowRuntime,
  computeSnapshotHashRuntime,
  criticalMaintenancePayloadRuntime,
  criticalPolicyPayloadRuntime,
  defaultCriticalPolicyRuntime,
  defaultWorldInteractionLogRuntime,
  defaultWorldClockRuntime,
  defaultWorldSnapshotRuntime,
  introStatePayloadRuntime,
  introStateSavedPayloadRuntime,
  normalizeCriticalPolicyRuntime,
  normalizePresenceRowsRuntime,
  normalizeWorldInteractionLogRuntime,
  normalizeWorldClockRuntime,
  normalizeWorldSnapshotRuntime,
  presenceHeartbeatAckPayloadRuntime,
  presenceListPayloadRuntime,
  presenceLeaveAckPayloadRuntime,
  recordWorldInteractionEventRuntime,
  removePresenceForUserRuntime,
  removePresenceSessionRuntime,
  prunePresenceRowsRuntime,
  runtimeContractFromHeadersRuntime,
  runtimeContractPayloadRuntime,
  serverHealthPayloadRuntime,
  runCriticalItemMaintenanceRuntime,
  snapshotSaveRuntime,
  upsertPresenceRowRuntime,
  validateCriticalPolicyBodyRuntime,
  validateIntroPhaseRuntime,
  validatePresenceSessionIdRuntime,
  validateWorldObjectDropPositionRuntime,
  worldClockPayloadRuntime,
  worldObjectsQueryRuntime,
  worldSnapshotReadPayloadRuntime,
  worldSnapshotSavedPayloadRuntime,
  worldObjectBaselineMutationResponseRuntime
} = require("./server_runtime.ts");
const {
  appendJsonLineRuntime,
  ensureServerDataDirRuntime,
  readJsonFileValidatedRuntime,
  readJsonLinesRuntime,
  writeJsonFileRuntime
} = require("./server_file_store.ts");
const {
  readJsonBodyOrErrorRuntime,
  sendCorsPreflightRuntime,
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
  recentExpiredWorldObjectKeys: string[];
  worldClock: WorldClockRuntime;
  worldInteractionLog: WorldInteractionLogRuntime;
  worldObjects: WorldObjectState;
  worldSnapshot: WorldSnapshotRuntime;
};

type ServerRequestBody = {
  actor_id?: unknown;
  actor_x?: unknown;
  actor_y?: unknown;
  actor_z?: unknown;
  code?: unknown;
  container_key?: unknown;
  critical_item_policy?: unknown;
  drop_x?: unknown;
  drop_y?: unknown;
  drop_z?: unknown;
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

function asServerRequestBody(raw: unknown): ServerRequestBody {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as ServerRequestBody;
}

function characterIdsForUser(state: ServerState, userId: unknown): Set<string> {
  const uid = String(userId || "").trim();
  const out = new Set<string>();
  if (!uid) {
    return out;
  }
  for (const character of state.characters || []) {
    if (String(character?.user_id || "") !== uid) {
      continue;
    }
    const id = String(character?.character_id || "").trim();
    if (id) {
      out.add(id);
    }
  }
  return out;
}

function resolveHeldWorldObjectActorIdRuntime(args: {
  actorId: string;
  state: ServerState;
  target: WorldObject;
  userId: string;
  verb: string;
}): string {
  const verb = String(args.verb || "");
  const actorId = String(args.actorId || "").trim();
  if (actorId !== String(args.userId || "").trim()) {
    return actorId;
  }
  if (verb !== "drop" && verb !== "put" && verb !== "equip") {
    return actorId;
  }
  const holderId = String(args.target?.holder_id || "").trim();
  if (!holderId) {
    return actorId;
  }
  return characterIdsForUser(args.state, args.userId).has(holderId) ? holderId : actorId;
}

async function readBodyOrBadJson(req: IncomingMessage, res: ServerResponse): Promise<{ ok: true; body: ServerRequestBody } | { ok: false }> {
  return readJsonBodyOrErrorRuntime({
    req,
    res,
    maxBodyBytes: MAX_BODY,
    coerce: asServerRequestBody,
    errorMessage
  });
}

function defaultWorldSnapshot(): WorldSnapshotRuntime {
  return defaultWorldSnapshotRuntime(nowIso());
}

function rebuildNpcRuntimeState(state: ServerState): void {
  const introPhase = String(state?.npcRuntimePersist?.intro_phase || INTRO_PHASE_POST).trim().toLowerCase() === INTRO_PHASE_PRE
    ? INTRO_PHASE_PRE
    : INTRO_PHASE_POST;
  const talkFlags = Array.isArray(state?.npcRuntimePersist?.talk_flags)
    ? state.npcRuntimePersist.talk_flags.slice(0, 0x100)
    : defaultNpcRuntimeStateRuntime(state.npcBaseline).talk_flags;
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

function buildWorldObjectState(runtimeDir: string, rawDeltas: unknown): WorldObjectState {
  return buildWorldObjectStateFromBaselineRuntime({
    nowIso,
    nowMs: () => Date.now(),
    objectBaselineDir: OBJECT_BASELINE_DIR,
    rawDeltas,
    runtimeDir
  });
}

function worldObjectMeta(state: Pick<ServerState, "worldObjects">) {
  return {
    ...buildWorldObjectMeta(state, OBJECT_BASELINE_DIR),
    expired_objects: Array.isArray((state as Partial<ServerState>).recentExpiredWorldObjectKeys)
      ? [...((state as Partial<ServerState>).recentExpiredWorldObjectKeys || [])]
      : []
  };
}

function expireDueWorldObjectLifecycles(state: ServerState, nowMs = Date.now()): boolean {
  state.recentExpiredWorldObjectKeys = [];
  const expiration = expireDueWorldObjectLifecycleDeltasRuntime(state, nowMs);
  if (!expiration.changed) {
    return false;
  }
  state.recentExpiredWorldObjectKeys = expiration.expired_object_keys;
  state.worldObjects = buildWorldObjectState(RUNTIME_DIR, state.worldObjects.deltas);
  refreshWorldObjectIndexes(state);
  return true;
}

function reloadWorldObjectBaseline(state: ServerState): void {
  state.worldObjects = buildWorldObjectState(RUNTIME_DIR, null);
  state.mapRuntime = new U6MapRuntime(RUNTIME_DIR);
  writeJsonFileRuntime(FILES.worldObjectDeltas, []);
  state.worldInteractionLog = defaultWorldInteractionLogRuntime();
  writeJsonFileRuntime(FILES.worldInteractionLog, state.worldInteractionLog);
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
    state.worldClock = defaultWorldClockRuntime();
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

function loadState(): ServerState {
  ensureDataDir();
  const rawWorldObjectDeltas = readJsonFileValidatedRuntime(FILES.worldObjectDeltas, null, normalizeWorldObjectDeltas);
  const worldObjects = buildWorldObjectState(RUNTIME_DIR, rawWorldObjectDeltas);
  const npcBaseline = loadNpcBaselineRuntime(RUNTIME_DIR);
  const scheduleRuntime = loadScheduleRuntime(RUNTIME_DIR);
  const state: ServerState = {
    users: readJsonFileValidatedRuntime(FILES.users, [], normalizeServerUsersRuntime),
    tokens: readJsonFileValidatedRuntime(FILES.tokens, [], normalizeServerTokensRuntime),
    characters: readJsonFileValidatedRuntime(FILES.characters, [], normalizeServerCharactersRuntime),
    worldSnapshot: readJsonFileValidatedRuntime(FILES.worldSnapshot, defaultWorldSnapshot(), (raw: unknown) => normalizeWorldSnapshotRuntime(raw, nowIso())),
    presence: readJsonFileValidatedRuntime(FILES.presence, [], normalizePresenceRowsRuntime),
    worldClock: readJsonFileValidatedRuntime(FILES.worldClock, defaultWorldClockRuntime(), normalizeWorldClockRuntime),
    npcBaseline,
    scheduleRuntime,
    npcRuntimePersist: readJsonFileValidatedRuntime(FILES.npcRuntime, defaultNpcRuntimeStateRuntime(npcBaseline), (raw: unknown) => normalizeNpcRuntimeStateRuntime(raw, npcBaseline)),
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
    criticalPolicy: readJsonFileValidatedRuntime(FILES.criticalPolicy, defaultCriticalPolicyRuntime(), normalizeCriticalPolicyRuntime),
    worldObjects,
    mapRuntime: new U6MapRuntime(RUNTIME_DIR),
    recentExpiredWorldObjectKeys: [],
    worldInteractionLog: readJsonFileValidatedRuntime(FILES.worldInteractionLog, defaultWorldInteractionLogRuntime(), normalizeWorldInteractionLogRuntime)
  };
  if (!Array.isArray(state.presence)) {
    state.presence = [];
  }
  for (const user of state.users) {
    ensureUserSchemaRuntime(user);
  }
  rebuildNpcRuntimeState(state);
  ensureConversationRuntimeState(state, RUNTIME_DIR);
  return state;
}

function persistState(state: ServerState): void {
  writeJsonFileRuntime(FILES.users, state.users);
  writeJsonFileRuntime(FILES.tokens, state.tokens);
  writeJsonFileRuntime(FILES.characters, state.characters);
  writeJsonFileRuntime(FILES.worldSnapshot, state.worldSnapshot);
  writeJsonFileRuntime(FILES.presence, state.presence);
  writeJsonFileRuntime(FILES.worldClock, state.worldClock);
  writeJsonFileRuntime(FILES.npcRuntime, state.npcRuntimePersist || defaultNpcRuntimeStateRuntime(state.npcBaseline));
  writeJsonFileRuntime(FILES.criticalPolicy, state.criticalPolicy);
  writeJsonFileRuntime(FILES.worldObjectDeltas, state.worldObjects.deltas);
  writeJsonFileRuntime(FILES.worldInteractionLog, state.worldInteractionLog || defaultWorldInteractionLogRuntime());
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
  const token = parseAuthHeaderRuntime(req.headers.authorization || "");
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

async function deliverEmail(toEmail: unknown, subject: unknown, bodyText: unknown, meta: EmailDeliveryMetaRuntime = {}) {
  return deliverEmailRuntime({
    appendLog: (delivery: EmailDeliveryLogRuntime) => appendJsonLineRuntime(FILES.emailOutbox, delivery),
    bodyText,
    connect: (options: NetConnectOpts) => net.connect(options),
    errorMessage,
    fetchImpl: fetch,
    fromEmail: EMAIL_FROM,
    meta,
    mode: EMAIL_MODE,
    nowIso,
    resendApiKey: EMAIL_RESEND_API_KEY,
    resendBaseUrl: EMAIL_RESEND_BASE_URL,
    smtpHelo: EMAIL_SMTP_HELO,
    smtpHost: EMAIL_SMTP_HOST,
    smtpPass: EMAIL_SMTP_PASS,
    smtpPort: EMAIL_SMTP_PORT,
    smtpRejectUnauthorized: process.env.VM_EMAIL_SMTP_REJECT_UNAUTHORIZED,
    smtpSecure: EMAIL_SMTP_SECURE,
    smtpTimeoutMs: EMAIL_SMTP_TIMEOUT_MS,
    smtpUser: EMAIL_SMTP_USER,
    subject,
    tlsConnect: (options: ConnectionOptions) => tls.connect(options),
    toEmail
  });
}

function runCriticalItemMaintenance(state: Pick<ServerState, "criticalPolicy">, payload: unknown) {
  const recoveryEvents = readJsonLinesRuntime(FILES.recoveriesLog);
  const emitted = runCriticalItemMaintenanceRuntime({
    criticalPolicy: state.criticalPolicy,
    nowIso: nowIso(),
    payload,
    recoveryEvents
  });
  for (const event of emitted) {
    appendJsonLineRuntime(FILES.recoveriesLog, event);
  }
  return emitted;
}

const state = loadState();
prunePresence(state);
persistState(state);

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "OPTIONS") {
    sendCorsPreflightRuntime(res);
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    updateAuthoritativeClock(state);
    persistState(state);
    sendJson(res, 200, serverHealthPayloadRuntime({
      emailMode: EMAIL_MODE,
      now: nowIso(),
      tick: state.worldClock.tick,
      worldObjects: worldObjectMeta(state)
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/runtime/contract") {
    sendJson(res, 200, runtimeContractPayloadRuntime());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const login = loginAccountRuntime({
      body,
      nowIso: nowIso(),
      nowMs: Date.now(),
      randomHex: (bytes: number) => nodeCrypto.randomBytes(bytes).toString("hex"),
      tokens: state.tokens,
      users: state.users
    });
    if (!login.ok) {
      sendError(res, login.http, login.code, login.message);
      return;
    }
    // Ensure old sessions for this account do not survive re-login as ghost presences.
    state.presence = removePresenceForUserRuntime(state.presence, login.user.user_id, {
      nowMs: Date.now(),
      ttlMs: PRESENCE_TTL_MS
    });
    persistState(state);
    sendJson(res, 200, {
      token: login.token,
      user: publicUserPayloadRuntime(login.user, { includeEmail: true, includeEmailVerified: true })
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/set-email") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const emailSet = setAccountEmailRuntime(user, body && body.email);
    if (!emailSet.ok) {
      sendError(res, emailSet.http, emailSet.code, emailSet.message);
      return;
    }
    persistState(state);
    sendJson(res, 200, {
      user: publicUserPayloadRuntime(user, { includeEmail: true, includeEmailVerified: true })
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/send-email-verification") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    const email = normalizeEmailRuntime(user.email || "");
    if (!isValidEmailRuntime(email)) {
      sendError(res, 400, "bad_email", "set a valid email first");
      return;
    }
    const code = issueEmailVerificationCodeRuntime(user, {
      code: secureSixDigitEmailVerificationCodeRuntime((maxExclusive: number) => nodeCrypto.randomInt(maxExclusive)),
      issuedAt: nowIso(),
      expiresAtMs: Date.now() + (1000 * 60 * 15)
    });
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
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const verified = verifyAccountEmailRuntime(user, {
      code: body && body.code,
      nowMs: Date.now()
    });
    if (!verified.ok) {
      if (verified.code === "verification_expired") {
        persistState(state);
      }
      sendError(res, verified.http, verified.code, verified.message);
      return;
    }
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      user: publicUserPayloadRuntime(user, { includeEmail: true, includeEmailVerified: true })
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    const user = requireUser(state, req, res);
    if (!user) {
      return;
    }
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const passwordChanged = changeAccountPasswordRuntime(user, {
      oldPassword: body && body.old_password,
      newPassword: body && body.new_password
    });
    if (!passwordChanged.ok) {
      sendError(res, passwordChanged.http, passwordChanged.code, passwordChanged.message);
      return;
    }
    persistState(state);
    sendJson(res, 200, {
      ok: true,
      user: publicUserPayloadRuntime(user)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/recover-password") {
    const recovery = passwordRecoveryAccountRuntime({
      username: url.searchParams.get("username") || "",
      email: url.searchParams.get("email") || "",
      users: state.users
    });
    if (!recovery.ok) {
      sendError(res, recovery.http, recovery.code, recovery.message);
      return;
    }
    let delivery;
    try {
      delivery = await deliverEmail(
        recovery.email,
        "VirtueMachine Password Recovery",
        [
          `Your VirtueMachine password is: ${String(recovery.user.password_plaintext || "")}`,
          "",
          "Security notice: this prototype intentionally does not store passwords securely.",
          "Do not reuse any important or personal password here."
        ].join("\n"),
        { user_id: recovery.user.user_id, template: "recover_password" }
      );
    } catch (err) {
      sendError(res, 502, "email_delivery_failed", errorMessage(err));
      return;
    }
    persistState(state);
    sendJson(res, 200, {
      user: publicUserPayloadRuntime(recovery.user, { includeEmail: true, includeEmailVerified: true }),
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
    sendJson(res, 200, { characters: listUserCharactersRuntime(state.characters, user.user_id) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/characters") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const nameValidation = validateCharacterNameRuntime(body);
    if (!nameValidation.ok) {
      sendError(res, nameValidation.http, nameValidation.code, nameValidation.message);
      return;
    }

    const c = {
      character_id: nodeCrypto.randomUUID(),
      user_id: user.user_id,
      name: nameValidation.name,
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
    sendJson(res, 201, characterCreatedPayloadRuntime(c));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/critical-items/policy") {
    sendJson(res, 200, criticalPolicyPayloadRuntime(state.criticalPolicy));
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/critical-items/policy") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const policyValidation = validateCriticalPolicyBodyRuntime(body);
    if (!policyValidation.ok) {
      sendError(res, policyValidation.error.http, policyValidation.error.code, policyValidation.error.message);
      return;
    }
    state.criticalPolicy = normalizeCriticalPolicyRuntime(policyValidation.policy);
    persistState(state);
    sendJson(res, 200, criticalPolicyPayloadRuntime(state.criticalPolicy));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/critical-items/maintenance") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const events = runCriticalItemMaintenance(state, body || {});
    sendJson(res, 200, criticalMaintenancePayloadRuntime(events));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/presence/heartbeat") {
    const runtimeContract = runtimeContractFromHeadersRuntime(req.headers);
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const sessionValidation = validatePresenceSessionIdRuntime(body);
    if (!sessionValidation.ok) {
      sendError(res, sessionValidation.error.http, sessionValidation.error.code, sessionValidation.error.message);
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
    sendJson(res, 200, presenceHeartbeatAckPayloadRuntime({
      now: nowIso(),
      tick: clock.tick,
      runtimeContract
    }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/presence/leave") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const sessionValidation = validatePresenceSessionIdRuntime(body);
    if (!sessionValidation.ok) {
      sendError(res, sessionValidation.error.http, sessionValidation.error.code, sessionValidation.error.message);
      return;
    }
    const removed = removePresenceSessionRuntime(state.presence, {
      nowMs: Date.now(),
      sessionId: sessionValidation.sessionId,
      ttlMs: PRESENCE_TTL_MS,
      userId: user.user_id
    });
    state.presence = removed.rows;
    persistState(state);
    sendJson(res, 200, presenceLeaveAckPayloadRuntime(removed.key));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/clock") {
    const runtimeContract = runtimeContractFromHeadersRuntime(req.headers);
    const clock = updateAuthoritativeClock(state);
    persistState(state);
    sendJson(res, 200, worldClockPayloadRuntime({
      clock,
      introState: state.introState,
      npcStates: state.npcStates,
      npcOverrides: state.npcPilot,
      runtimeContract
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/intro-state") {
    sendJson(res, 200, introStatePayloadRuntime(state.introState));
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/intro-state") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const phaseValidation = validateIntroPhaseRuntime(bodyResult.body, INTRO_PHASE_PRE, INTRO_PHASE_POST);
    if (!phaseValidation.ok) {
      sendError(res, phaseValidation.error.http, phaseValidation.error.code, phaseValidation.error.message);
      return;
    }
    state.npcRuntimePersist = {
      ...state.npcRuntimePersist,
      intro_phase: phaseValidation.phase
    };
    rebuildNpcRuntimeState(state);
    persistState(state);
    sendJson(res, 200, introStateSavedPayloadRuntime(state.introState));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/presence") {
    prunePresence(state);
    persistState(state);
    sendJson(res, 200, presenceListPayloadRuntime(state.presence));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/objects") {
    if (expireDueWorldObjectLifecycles(state)) {
      persistState(state);
    }
    const runtimeContract = runtimeContractFromHeadersRuntime(req.headers);
    const query = worldObjectsQueryRuntime(url);
    const queryableWorldObjects = state.worldObjects.active.filter(
      (obj) => coordUseOfStatus(obj.status) === OBJ_COORD_USE_LOCXYZ
    );
    const selection = selectWorldObjectsViaSimCore({
      objects: queryableWorldObjects,
      tileFlags: state.worldObjects.tileFlags,
      hasX: query.hasX,
      x: query.x,
      hasY: query.hasY,
      y: query.y,
      hasZ: query.hasZ,
      z: query.z,
      radius: query.radius,
      projection: query.projection,
      limit: query.limit
    });
    if (!selection.ok) {
      sendError(res, 500, "world_query_bridge_failed", String(selection.message || "world query bridge failed"));
      return;
    }
    const byKey = new Map<string, WorldObject>();
    for (const obj of queryableWorldObjects) {
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
      if (query.includeFootprint) {
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
      query: query.responseQuery,
      runtime_contract: runtimeContract,
      objects: out
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/objects/interact") {
    if (expireDueWorldObjectLifecycles(state)) {
      persistState(state);
    }
    const runtimeContract = runtimeContractFromHeadersRuntime(req.headers);
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const verb = String(body && body.verb || "").trim().toLowerCase();
    const targetKey = String(body && body.target_key || "").trim();
    const containerKey = String(body && body.container_key || "").trim();
    const bodyActorId = String(body && body.actor_id || "").trim();
    let actorId = verb === "talk" ? String(bodyActorId || user.user_id || "").trim() : bodyActorId;
    const npcId = Number(body && body.npc_id) | 0;
    const actorX = Number.isFinite(Number(body && body.actor_x)) ? (Number(body.actor_x) | 0) : null;
    const actorY = Number.isFinite(Number(body && body.actor_y)) ? (Number(body.actor_y) | 0) : null;
    const actorZ = Number.isFinite(Number(body && body.actor_z)) ? (Number(body.actor_z) | 0) : null;
    const dropX = Number.isFinite(Number(body && body.drop_x)) ? (Number(body.drop_x) | 0) : null;
    const dropY = Number.isFinite(Number(body && body.drop_y)) ? (Number(body.drop_y) | 0) : null;
    const dropZ = Number.isFinite(Number(body && body.drop_z)) ? (Number(body.drop_z) | 0) : null;
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
    if (!actorId) {
      sendError(res, 400, "bad_actor_id", "actor_id is required for world object interaction");
      return;
    }
    const target = findActiveObjectByKey(state, targetKey);
    if (!target) {
      sendError(res, 404, "object_not_found", "target_key not found");
      return;
    }
    actorId = resolveHeldWorldObjectActorIdRuntime({
      actorId,
      state,
      target,
      userId: String(user.user_id || ""),
      verb
    });

    const actorPos = {
      x: actorX === null ? (target.x | 0) : actorX,
      y: actorY === null ? (target.y | 0) : actorY,
      z: actorZ === null ? (target.z | 0) : actorZ
    };
    const dropPos = {
      x: dropX === null ? actorPos.x : dropX,
      y: dropY === null ? actorPos.y : dropY,
      z: dropZ === null ? actorPos.z : dropZ
    };

    const container = containerKey ? findActiveObjectByKey(state, containerKey) : null;
    if (verb === "put" && !container) {
      sendError(res, 404, "container_not_found", "container_key not found");
      return;
    }
    if (verb === "take" && !canTakeWorldObject(target, state.worldObjects.typeWeights)) {
      sendError(res, 409, "object_not_takeable", "target object is not portable");
      return;
    }
    if ((verb === "drop" || verb === "put" || verb === "equip")
      && (
        String(target.holder_kind || "") !== "npc"
        || String(target.holder_id || "") !== actorId
        || (coordUseOfStatus(target.status) !== OBJ_COORD_USE_INVEN && coordUseOfStatus(target.status) !== OBJ_COORD_USE_EQUIP)
      )
    ) {
      sendError(res, 409, "object_not_held", "target object is not held by actor");
      return;
    }
    if (verb === "drop") {
      const dropValidation = validateWorldObjectDropPositionRuntime({
        actorPos,
        dropPos,
        canStepInto: (step: { to_x: number; to_y: number; to_z: number }) => canNpcStepInto(state, step)
      });
      if (!dropValidation.ok) {
        const error = dropValidation.error;
        sendError(res, Number(error?.http) || 409, String(error?.code || "drop_invalid"), String(error?.message || "drop target is invalid"));
        return;
      }
    }

    const targetChainResult = analyzeContainmentChainViaSimCore(state.worldObjects.active, target);
    if (!targetChainResult.ok) {
      sendError(res, 500, "assoc_bridge_failed", String(targetChainResult.message || "assoc-chain bridge failed"));
      return;
    }
    const targetChain = targetChainResult.value;
    let containerCycle = false;
    let containerChain = null;
    let explicitSelfContainerCycle = false;
    if (verb === "put" && container) {
      explicitSelfContainerCycle = String(container.object_key || "") === String(target.object_key || "");
      const containerChainResult = analyzeContainmentChainViaSimCore(state.worldObjects.active, container);
      if (!containerChainResult.ok) {
        sendError(res, 500, "assoc_bridge_failed", String(containerChainResult.message || "assoc-chain bridge failed"));
        return;
      }
      containerChain = containerChainResult.value;
      containerCycle = explicitSelfContainerCycle || (containerChain.assoc_chain || []).includes(String(target.object_key || ""));
    }

    const applied = applyCanonicalWorldInteractionCommand({
      verb,
      target,
      container,
      actorId,
      actorPos: verb === "drop" ? dropPos : actorPos,
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
            blocked_by: explicitSelfContainerCycle ? "" : String(containerChain?.blocked_by || "")
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
      const takeClone = applyBaselineTakeCloneRuntime(state, target, actorId, applied.patch || {}, Date.now());
      sourceTarget = takeClone.source;
      responseTarget = takeClone.clone;
      respawn = takeClone.respawn;
    } else {
      Object.assign(target, applied.patch || {});
      applySpawnedObjectLifecycleForInteractionRuntime(target, verb, Date.now());
      persistPatchedObject(state, target);
    }
    const event = recordWorldInteractionEventRuntime(state, {
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
    if (expireDueWorldObjectLifecycles(state)) {
      persistState(state);
    }
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
    sendJson(res, 200, worldObjectBaselineMutationResponseRuntime({
      at: nowIso(),
      kind: "reset",
      meta: worldObjectMeta(state),
      worldInteractionLog: state.worldInteractionLog
    }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/world/conversation/respond") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
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
    sendJson(res, 200, worldObjectBaselineMutationResponseRuntime({
      at: nowIso(),
      kind: "reload",
      meta: worldObjectMeta(state),
      worldInteractionLog: state.worldInteractionLog
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/world/snapshot") {
    sendJson(res, 200, worldSnapshotReadPayloadRuntime(state.worldSnapshot));
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/world/snapshot") {
    const bodyResult = await readBodyOrBadJson(req, res);
    if (!bodyResult.ok) {
      return;
    }
    const body = bodyResult.body;
    const saved = snapshotSaveRuntime({ body, nowIso: nowIso() });
    if (!saved) {
      sendError(res, 400, "bad_snapshot", "snapshot_base64 is required");
      return;
    }
    state.worldSnapshot = saved;
    persistState(state);
    sendJson(res, 200, worldSnapshotSavedPayloadRuntime(state.worldSnapshot));
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
      const sanitizedSnapshotBase64 = character.snapshot_base64
        ? sanitizeSnapshotInventoryBase64(String(character.snapshot_base64))
        : character.snapshot_base64;
      if (sanitizedSnapshotBase64 !== character.snapshot_base64) {
        const snapshotMeta = character.snapshot_meta && typeof character.snapshot_meta === "object"
          ? character.snapshot_meta as Record<string, unknown>
          : {};
        character.snapshot_base64 = sanitizedSnapshotBase64;
        character.snapshot_meta = {
          schema_version: Number(snapshotMeta.schema_version) || 1,
          sim_core_version: String(snapshotMeta.sim_core_version || "unknown"),
          saved_tick: Number(snapshotMeta.saved_tick) || 0,
          snapshot_hash: computeSnapshotHashRuntime(sanitizedSnapshotBase64)
        };
        character.updated_at = nowIso();
        persistState(state);
      }
      sendJson(res, 200, characterSnapshotPayloadRuntime(character, sanitizedSnapshotBase64));
      return;
    }

    if (req.method === "PUT") {
      const bodyResult = await readBodyOrBadJson(req, res);
      if (!bodyResult.ok) {
        return;
      }
      const body = bodyResult.body;
      const saved = snapshotSaveRuntime({
        body,
        nowIso: nowIso(),
        sanitizeSnapshotBase64: sanitizeSnapshotInventoryBase64
      });
      if (!saved) {
        sendError(res, 400, "bad_snapshot", "snapshot_base64 is required");
        return;
      }
      character.snapshot_base64 = saved.snapshot_base64;
      character.snapshot_meta = saved.snapshot_meta;
      character.updated_at = saved.updated_at;
      persistState(state);
      sendJson(res, 200, characterSnapshotPayloadRuntime(character));
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

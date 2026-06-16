import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type {
  ConversationRuntimeState,
  ConversationSessionMapRuntime
} from "../conversation_runtime_types.ts";

type ConversationRuntimeModule = {
  ensureConversationRuntimeState(state: ConversationRuntimeState, runtimeDir: unknown): void;
  replyAuthoritativeConversation(state: ConversationRuntimeState, input: {
    sessionId?: unknown;
    typed?: unknown;
  }): unknown;
  startAuthoritativeConversation(state: ConversationRuntimeState, input: {
    actorPos?: { x?: unknown; y?: unknown; z?: unknown };
    npcId?: unknown;
    playerName?: unknown;
  }): unknown;
};

type ConversationOkResult = {
  ok: true;
  payload: {
    kind?: string;
    lines?: ReadonlyArray<unknown>;
    session_id?: string;
    target_name?: string;
  };
};

const require = createRequire(import.meta.url);
const {
  ensureConversationRuntimeState,
  replyAuthoritativeConversation,
  startAuthoritativeConversation
} = require("../conversation_runtime.ts") as ConversationRuntimeModule;

function asOkResult(raw: unknown): ConversationOkResult {
  assert.equal(typeof raw, "object");
  assert.equal((raw as { ok?: unknown }).ok, true);
  return raw as ConversationOkResult;
}

const sessions: ConversationSessionMapRuntime = Object.create(null);
const state: ConversationRuntimeState = {
  conversationArchives: { a: null, b: null },
  conversationSessions: sessions,
  introState: { phase: "post_intro" },
  npcPilotById: new Map([[5, { x: 10, y: 10, z: 0 }]]),
  npcRuntime: {
    partySize: 1,
    talkFlags: new Array(0x100).fill(0)
  },
  npcRuntimeById: new Map([[5, { id: 5, type: 0x199, x: 10, y: 10, z: 0 }]]),
  worldClock: { time_h: 9 }
};

ensureConversationRuntimeState(state, "/missing-runtime-dir");
assert.equal(state.conversationSessions, sessions, "existing session map should be retained");

const started = asOkResult(startAuthoritativeConversation(state, {
  actorPos: { x: 11, y: 10, z: 0 },
  npcId: 5,
  playerName: "Avatar"
}));
assert.equal(started.payload.target_name, "Lord British");
const sessionId = String(started.payload.session_id || "");
assert.equal(typeof sessionId, "string");
assert.ok(sessionId.length > 0);
assert.ok(state.conversationSessions?.[sessionId], "started conversation should store a session");

const looked = asOkResult(replyAuthoritativeConversation(state, {
  sessionId,
  typed: "look"
}));
assert.equal(looked.payload.kind, "look");
assert.match(String((looked.payload.lines || []).join(" ")), /Lord British|NPC 5|someone/i);
assert.ok(state.conversationSessions?.[sessionId], "look should not end the session");

const ended = asOkResult(replyAuthoritativeConversation(state, {
  sessionId,
  typed: "bye"
}));
assert.equal(ended.payload.kind, "ended");
assert.equal(state.conversationSessions?.[sessionId], undefined);

console.log("conversation_runtime_test: ok");

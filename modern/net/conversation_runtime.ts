"use strict";

import type {
  ConversationArchivesRuntime,
  ConversationPositionRuntime,
  ConversationRuntimeState,
  ConversationSessionPayloadRuntime,
  ConversationSessionRuntime,
  ReplyAuthoritativeConversationInputRuntime,
  ReplyAuthoritativeConversationResultRuntime,
  StartAuthoritativeConversationInputRuntime,
  StartAuthoritativeConversationResultRuntime
} from "./conversation_runtime_types.ts";

const fs = require("node:fs");
const path = require("node:path");
const nodeCrypto = require("node:crypto");
const {
  buildConversationVmContext,
  conversationKeyMatchesInput,
  conversationMacroSymbolToIndex,
  renderConversationMacrosWithContext
} = require("../client-web/conversation/text_runtime.ts");
const { parseConversationRules } = require("../client-web/conversation/rules_runtime.ts");
const {
  decodeConversationOpeningResult,
  decodeConversationResponseOpcodeAware
} = require("../client-web/conversation/vm_runtime.ts");
const { conversationRunFromKeyCursor } = require("../client-web/conversation/dialog_runtime.ts");
const {
  canonicalTalkFallbackGreeting,
  canonicalizeOpeningLines,
  formatYouSeeLine
} = require("../client-web/conversation/presentation_runtime.ts");
const {
  loadLegacyConversationScriptForNpcRuntime,
  parseConversationHeaderAndDescRuntime,
  isLikelyValidConversationScriptRuntime
} = require("../client-web/conversation/archive_runtime.ts");

const CONV_OP_KEY = 0xef;
const CONV_OP_RES = 0xf6;
const CONV_OP_ENDRES = 0xee;
const CONV_OP_END = 0xff;
const CONV_OP_ASKTOP = 0xf7;
const CONV_OP_GET = 0xf8;
const INTRO_PHASE_PRE = "pre_intro";
const INTRO_PHASE_POST = "post_intro";
const INTRO_COMPAT_NPC_IDS = new Set([2, 5, 6]);

function readConversationArchives(runtimeDir: unknown): ConversationArchivesRuntime {
  const out: ConversationArchivesRuntime = { a: null, b: null };
  const dir = typeof runtimeDir === "string" ? runtimeDir : "";
  if (!dir) {
    return out;
  }
  try {
    out.a = new Uint8Array(fs.readFileSync(path.join(dir, "converse.a")));
  } catch (_err) {
    out.a = null;
  }
  try {
    out.b = new Uint8Array(fs.readFileSync(path.join(dir, "converse.b")));
  } catch (_err) {
    out.b = null;
  }
  return out;
}

function copyTalkFlagsBack(targetArray: unknown, sourceMap: unknown): void {
  if (!Array.isArray(targetArray) || !sourceMap || typeof sourceMap !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(sourceMap)) {
    const idx = Number(key) & 0xff;
    targetArray[idx] = Number(value) & 0xff;
  }
}

function effectiveTalkFlagsForSession(state: ConversationRuntimeState, npcId: unknown): unknown[] {
  const actual = Array.isArray(state?.npcRuntime?.talkFlags) ? state.npcRuntime.talkFlags : [];
  const introPhase = String(state?.introState?.phase || INTRO_PHASE_POST).trim().toLowerCase();
  if (introPhase !== INTRO_PHASE_PRE || !INTRO_COMPAT_NPC_IDS.has(Number(npcId) | 0)) {
    return actual;
  }
  return new Array(0x100).fill(0);
}

function inTalkRange(actorPos: ConversationPositionRuntime | null | undefined, targetPos: ConversationPositionRuntime | null | undefined): boolean {
  if (!actorPos || !targetPos) {
    return false;
  }
  if ((Number(actorPos.z) | 0) !== (Number(targetPos.z) | 0)) {
    return false;
  }
  const dx = Math.abs((Number(actorPos.x) | 0) - (Number(targetPos.x) | 0));
  const dy = Math.abs((Number(actorPos.y) | 0) - (Number(targetPos.y) | 0));
  return (dx + dy) <= 2;
}

function buildVmContext(state: ConversationRuntimeState, targetName: unknown, objNum: unknown, playerName: unknown) {
  return buildConversationVmContext({
    hour: Number(state?.worldClock?.time_h) | 0,
    player: String(playerName || "Avatar").trim() || "Avatar",
    target: String(targetName || "").trim(),
    greeting: "milady",
    partySize: Number(state?.npcRuntime?.partySize) | 0,
    objNum: Number(objNum) | 0,
    talkFlags: effectiveTalkFlagsForSession(state, objNum)
  });
}

function buildConversationSessionPayload(
  session: ConversationSessionRuntime,
  openingLines: unknown,
  desc: unknown
): ConversationSessionPayloadRuntime {
  return {
    session_id: String(session.sessionId || ""),
    npc_id: Number(session.npcId) | 0,
    target_name: String(session.targetName || ""),
    desc: String(desc || ""),
    opening_lines: Array.isArray(openingLines) ? openingLines : [],
    next_pc: Number(session.pc) | 0,
    stop_opcode: Number(session.stopOpcode) | 0
  };
}

function resolveNpcConversation(state: ConversationRuntimeState, npcId: unknown) {
  const npc = state?.npcRuntimeById?.get(Number(npcId) | 0) || null;
  if (!npc) {
    return null;
  }
  const script = loadLegacyConversationScriptForNpcRuntime(state?.conversationArchives, npc.id, npc.type);
  const header = parseConversationHeaderAndDescRuntime(script);
  return {
    npc,
    script,
    header,
    valid: isLikelyValidConversationScriptRuntime(script, header)
  };
}

function canonicalTargetName(header: { name?: unknown } | null | undefined, npcId: unknown): string {
  const name = String(header?.name || "").trim();
  if (name) {
    return name;
  }
  if ((Number(npcId) | 0) === 5) return "Lord British";
  if ((Number(npcId) | 0) === 6) return "Nystul";
  if ((Number(npcId) | 0) === 2) return "Dupre";
  return `NPC ${Number(npcId) | 0}`;
}

function startAuthoritativeConversation(
  state: ConversationRuntimeState,
  input: StartAuthoritativeConversationInputRuntime
): StartAuthoritativeConversationResultRuntime {
  const npcId = Number(input?.npcId) | 0;
  const actorPos = input?.actorPos || { x: 0, y: 0, z: 0 };
  const resolved = resolveNpcConversation(state, npcId);
  if (!resolved) {
    return { ok: false, http: 404, code: "npc_not_found", message: "npc_id not found" };
  }
  const npcPos = state.npcPilotById?.get(npcId) || resolved.npc;
  if (!inTalkRange(actorPos, npcPos)) {
    return { ok: false, http: 409, code: "talk_out_of_range", message: "npc is out of talk range" };
  }
  const targetName = canonicalTargetName(resolved.header, npcId);
  const desc = String(resolved.header?.desc || "").trim();
  const vmContext = buildVmContext(state, targetName, npcId, input?.playerName);
  const openingResult = resolved.valid
    ? decodeConversationOpeningResult(resolved.script, Number(resolved.header?.mainPc) | 0, vmContext)
    : { lines: [], stopOpcode: 0, stopPc: -1, nextPc: -1 };
  const openingLinesRaw = Array.isArray(openingResult?.lines) ? openingResult.lines : [];
  const fallback = canonicalTalkFallbackGreeting(
    npcId,
    vmContext,
    conversationMacroSymbolToIndex
  );
  const openingLines = canonicalizeOpeningLines(npcId, openingLinesRaw, fallback)
    .map((line) => renderConversationMacrosWithContext(String(line || "").trim(), vmContext))
    .filter(Boolean);
  const sessionId = nodeCrypto.randomUUID();
  const session: ConversationSessionRuntime = {
    sessionId,
    npcId,
    targetName,
    desc,
    persistTalkFlags: String(state?.introState?.phase || INTRO_PHASE_POST).trim().toLowerCase() !== INTRO_PHASE_PRE,
    pc: resolved.valid ? (Number(openingResult.stopPc) | 0) : -1,
    stopOpcode: resolved.valid ? (Number(openingResult.stopOpcode) | 0) : 0,
    script: resolved.valid ? resolved.script : null,
    vmContext,
    rules: resolved.valid
      ? parseConversationRules(resolved.script, Number(resolved.header?.mainPc) | 0, {
        KEY: CONV_OP_KEY,
        RES: CONV_OP_RES,
        ENDRES: CONV_OP_ENDRES
      })
      : []
  };
  if (!state.conversationSessions || typeof state.conversationSessions !== "object") {
    state.conversationSessions = Object.create(null);
  }
  state.conversationSessions[sessionId] = session;
  if (session.persistTalkFlags) {
    copyTalkFlagsBack(state?.npcRuntime?.talkFlags, vmContext.talkFlags);
  }
  return {
    ok: true,
    session,
    payload: buildConversationSessionPayload(session, openingLines, desc)
  };
}

function replyAuthoritativeConversation(
  state: ConversationRuntimeState,
  input: ReplyAuthoritativeConversationInputRuntime
): ReplyAuthoritativeConversationResultRuntime {
  const sessionId = String(input?.sessionId || "").trim();
  const typed = String(input?.typed || "").trim();
  const sessions = state?.conversationSessions;
  const session = sessions && typeof sessions === "object" ? sessions[sessionId] : null;
  if (!session) {
    return { ok: false, http: 404, code: "conversation_session_not_found", message: "conversation session not found" };
  }
  const query = typed || "bye";
  if (String(query).toLowerCase() === "bye" || String(query).toLowerCase() === "farewell") {
    delete sessions[sessionId];
    return {
      ok: true,
      payload: {
        kind: "ended",
        lines: ["Fare thee well."],
        next_pc: -1,
        stop_opcode: 0,
        ended: true
      }
    };
  }
  if (String(query).toLowerCase() === "look") {
    return {
      ok: true,
      payload: {
        kind: "look",
        lines: [formatYouSeeLine(String(session.desc || session.targetName || "someone"))],
        next_pc: Number(session.pc) | 0,
        stop_opcode: Number(session.stopOpcode) | 0,
        ended: false
      }
    };
  }
  if (session.script instanceof Uint8Array && (Number(session.pc) | 0) >= 0) {
    const cursorReply = conversationRunFromKeyCursor({
      scriptBytes: session.script,
      startPc: Number(session.pc) | 0,
      typed: query,
      vmContext: session.vmContext,
      opcodes: {
        ASKTOP: CONV_OP_ASKTOP,
        GET: CONV_OP_GET,
        KEY: CONV_OP_KEY,
        RES: CONV_OP_RES,
        ENDRES: CONV_OP_ENDRES,
        END: CONV_OP_END
      },
      keyMatchesInput: conversationKeyMatchesInput,
      decodeResponseOpcodeAware: decodeConversationResponseOpcodeAware,
      renderMacros: (line, ctx) => renderConversationMacrosWithContext(line, ctx)
    });
    if (cursorReply && cursorReply.kind === "ok") {
      session.pc = Number(cursorReply.nextPc) | 0;
      session.stopOpcode = Number(cursorReply.stopOpcode) | 0;
      if (session.persistTalkFlags) {
        copyTalkFlagsBack(state?.npcRuntime?.talkFlags, session.vmContext?.talkFlags);
      }
      return {
        ok: true,
        payload: {
          kind: "response",
          lines: Array.isArray(cursorReply.lines) ? cursorReply.lines : [],
          next_pc: Number(session.pc) | 0,
          stop_opcode: Number(session.stopOpcode) | 0,
          ended: false
        }
      };
    }
    if (cursorReply && cursorReply.kind === "no-match") {
      return {
        ok: true,
        payload: {
          kind: "response",
          lines: ["No response."],
          next_pc: Number(session.pc) | 0,
          stop_opcode: Number(session.stopOpcode) | 0,
          ended: false
        }
      };
    }
  }
  return {
    ok: true,
    payload: {
      kind: "response",
      lines: ["No response."],
      next_pc: Number(session.pc) | 0,
      stop_opcode: Number(session.stopOpcode) | 0,
      ended: false
    }
  };
}

function ensureConversationRuntimeState(state: ConversationRuntimeState, runtimeDir: unknown): void {
  if (!state.conversationArchives) {
    state.conversationArchives = readConversationArchives(runtimeDir);
  }
  if (!state.conversationSessions || typeof state.conversationSessions !== "object") {
    state.conversationSessions = Object.create(null);
  }
}

module.exports = {
  ensureConversationRuntimeState,
  startAuthoritativeConversation,
  replyAuthoritativeConversation
};

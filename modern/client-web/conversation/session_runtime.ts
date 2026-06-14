import type { ConversationRule } from "./rules_runtime.ts";

export interface DebugChatLedgerEntry {
  tick: number;
  line: string;
  ts?: number;
  actorId?: number | null;
  convId?: number | null;
  objType?: number | null;
}

export interface LegacyConversationState {
  debugChatLedger?: DebugChatLedgerEntry[];
  legacyLedgerLines?: string[];
  legacyLedgerPrompt?: boolean;
  legacyPromptAnimMs?: number;
  legacyPromptAnimPhase?: number;
  legacyConversationActive?: boolean;
  legacyConversationAuthoritative?: boolean;
  legacyConversationSessionId?: string;
  legacyConversationInput?: string;
  legacyConversationTargetName?: string;
  legacyConversationActorEntityId?: number;
  legacyConversationPortraitTile?: number | null;
  legacyConversationTargetObjNum?: number;
  legacyConversationTargetObjType?: number;
  legacyConversationNpcKey?: string;
  legacyConversationPendingPrompt?: string;
  legacyConversationShowInventory?: boolean;
  legacyConversationEquipmentSlots?: LegacyConversationEquipmentSlot[];
  legacyConversationPaging?: boolean;
  legacyConversationPages?: string[][];
  legacyConversationScript?: unknown;
  legacyConversationDescText?: string;
  legacyConversationRules?: ConversationRule[];
  legacyConversationPc?: number;
  legacyConversationInputOpcode?: number;
  legacyConversationVmContext?: unknown;
  legacyConversationPrevStatus?: number;
  legacyStatusDisplay?: number;
}

export interface LegacyConversationEquipmentSlot {
  id?: unknown;
  index?: unknown;
  item?: unknown;
  label?: unknown;
  name?: unknown;
  slot?: unknown;
}

interface DebugChatLedgerEntrySource {
  actorId?: unknown;
  convId?: unknown;
  line?: unknown;
  objType?: unknown;
  tick?: unknown;
}

export interface PushLedgerOptions {
  maxChars?: number;
  maxLines?: number;
  tick?: number;
  nowMs?: number;
}

export interface ConversationPaginationOptions {
  pageMaxLines?: number;
  maxChars?: number;
  tick?: number;
  nowMs?: number;
}

export interface ConversationReply {
  kind: string;
  lines?: ConversationReplyLine[];
}

export type ConversationReplyLine = number | string | null | undefined;

export interface SubmitConversationDeps {
  pushLedgerMessage?: (line: string) => void;
  pushPrompt?: () => void;
  showPrompt?: () => void;
  endConversation?: () => void;
  formatYouSeeLine?: (text: string) => string;
  reply?: (text: string) => ConversationReply;
  startPagination?: (lines: string[]) => boolean;
  unimplementedFallbackText?: string;
}

export interface ConversationKeyEvent {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface ConversationKeydownDeps {
  endConversation?: () => void;
  advancePagination?: () => void;
  submitInput?: () => unknown;
  maxChars?: number;
}

export function wrapLegacyLedgerLines(text: unknown, maxChars: unknown): string[] {
  const out: string[] = [];
  const limit = Math.max(1, Number(maxChars) | 0);
  const src = String(text || "").replace(/\s+/g, " ").trim();
  if (!src) {
    return out;
  }
  let line = "";
  for (const word of src.split(" ")) {
    const token = String(word || "");
    if (!token) continue;
    if (!line) {
      if (token.length <= limit) {
        line = token;
      } else {
        for (let i = 0; i < token.length; i += limit) {
          out.push(token.slice(i, i + limit));
        }
      }
      continue;
    }
    const merged = `${line} ${token}`;
    if (merged.length <= limit) {
      line = merged;
    } else {
      out.push(line);
      if (token.length <= limit) {
        line = token;
      } else {
        line = "";
        for (let i = 0; i < token.length; i += limit) {
          out.push(token.slice(i, i + limit));
        }
      }
    }
  }
  if (line) {
    out.push(line);
  }
  return out;
}

export function showLegacyLedgerPrompt(state: LegacyConversationState): void {
  if (!state?.legacyLedgerPrompt) {
    state.legacyPromptAnimMs = 0;
    state.legacyPromptAnimPhase = 0;
  }
  state.legacyLedgerPrompt = true;
}

export function pushLedgerMessage(state: LegacyConversationState, text: unknown, opts: PushLedgerOptions = {}): void {
  const maxChars = Math.max(1, Number(opts.maxChars) | 0);
  const maxLines = Math.max(1, Number(opts.maxLines) | 0);
  const tick = Number(opts.tick) >>> 0;
  const nowMs = Number(opts.nowMs) || Date.now();
  const wrapped = (text === "") ? [""] : wrapLegacyLedgerLines(text, maxChars);
  if (!wrapped.length) {
    return;
  }
  const convoMeta = state?.legacyConversationActive
    ? {
      actorId: Number(state.legacyConversationActorEntityId) | 0,
      convId: Number(state.legacyConversationTargetObjNum) | 0,
      objType: Number(state.legacyConversationTargetObjType) & 0x03ff
    }
    : null;
  if (!Array.isArray(state.debugChatLedger)) {
    state.debugChatLedger = [];
  }
  for (const line of wrapped) {
    state.debugChatLedger.push({
      tick,
      line: String(line || ""),
      ts: nowMs,
      actorId: convoMeta ? convoMeta.actorId : null,
      convId: convoMeta ? convoMeta.convId : null,
      objType: convoMeta ? convoMeta.objType : null
    });
  }
  const maxEntries = 2000;
  if (state.debugChatLedger.length > maxEntries) {
    state.debugChatLedger.splice(0, state.debugChatLedger.length - maxEntries);
  }
  if (!Array.isArray(state.legacyLedgerLines)) {
    state.legacyLedgerLines = [];
  }
  for (const line of wrapped) {
    state.legacyLedgerLines.push(line);
  }
  const extra = state.legacyLedgerLines.length - maxLines;
  if (extra > 0) {
    state.legacyLedgerLines.splice(0, extra);
  }
}

export function buildDebugChatLedgerText(entries: unknown): string {
  const lines: string[] = [];
  const src = Array.isArray(entries) ? entries : [];
  const hasMetaNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0);
  for (const entry of src) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const row = entry as DebugChatLedgerEntrySource;
    const tick = Number(row.tick) >>> 0;
    const msg = String(row.line || "");
    const actorId = row.actorId;
    const convId = row.convId;
    const objType = row.objType;
    const hasMeta = hasMetaNumber(actorId)
      && hasMetaNumber(convId)
      && hasMetaNumber(objType);
    if (hasMeta) {
      lines.push(`[${String(tick).padStart(7, "0")}] ${msg} {actor=${Number(actorId)} conv=${Number(convId)} type=0x${(Number(objType) & 0x03ff).toString(16)}}`);
    } else {
      lines.push(`[${String(tick).padStart(7, "0")}] ${msg}`);
    }
  }
  return lines.join("\n");
}

export function paginateLedgerMessages(lines: unknown, maxLines: unknown, maxChars: unknown): string[][] {
  const src = Array.isArray(lines) ? lines : [];
  const pageMax = Math.max(1, Number(maxLines) | 0);
  const lineMax = Math.max(1, Number(maxChars) | 0);
  const pages: string[][] = [];
  let cur: string[] = [];
  for (const item of src) {
    const wrapped = (item === "") ? [""] : wrapLegacyLedgerLines(item, lineMax);
    if (!wrapped.length) {
      continue;
    }
    for (const line of wrapped) {
      if (cur.length >= pageMax) {
        pages.push(cur);
        cur = [];
      }
      cur.push(line);
    }
  }
  if (cur.length) {
    pages.push(cur);
  }
  return pages;
}

export function startLegacyConversationPagination(
  state: LegacyConversationState,
  lines: unknown,
  opts: ConversationPaginationOptions = {}
): boolean {
  const pages = paginateLedgerMessages(lines, opts.pageMaxLines, opts.maxChars);
  if (!pages.length) {
    return false;
  }
  const tick = Number(opts.tick) >>> 0;
  const nowMs = Number(opts.nowMs) || Date.now();
  if (!Array.isArray(state.debugChatLedger)) {
    state.debugChatLedger = [];
  }
  for (const page of pages) {
    for (const line of page) {
      state.debugChatLedger.push({
        tick,
        line: String(line || ""),
        ts: nowMs
      });
    }
  }
  const maxEntries = 2000;
  if (state.debugChatLedger.length > maxEntries) {
    state.debugChatLedger.splice(0, state.debugChatLedger.length - maxEntries);
  }
  state.legacyConversationPages = pages;
  state.legacyConversationPaging = true;
  state.legacyLedgerPrompt = false;
  state.legacyLedgerLines = pages[0].slice();
  return true;
}

export function advanceLegacyConversationPagination(state: LegacyConversationState, onEndPrompt: unknown): boolean {
  if (!state.legacyConversationPaging) {
    return false;
  }
  if (Array.isArray(state.legacyConversationPages) && state.legacyConversationPages.length > 1) {
    state.legacyConversationPages.shift();
    state.legacyLedgerLines = state.legacyConversationPages[0].slice();
    return true;
  }
  state.legacyConversationPages = [];
  state.legacyConversationPaging = false;
  if (typeof onEndPrompt === "function") {
    onEndPrompt();
  }
  return true;
}

export function endLegacyConversation(state: LegacyConversationState): void {
  state.legacyConversationActive = false;
  state.legacyConversationAuthoritative = false;
  state.legacyConversationSessionId = "";
  state.legacyConversationInput = "";
  state.legacyConversationTargetName = "";
  state.legacyConversationActorEntityId = 0;
  state.legacyConversationPortraitTile = null;
  state.legacyConversationTargetObjNum = 0;
  state.legacyConversationTargetObjType = 0;
  state.legacyConversationNpcKey = "";
  state.legacyConversationPendingPrompt = "";
  state.legacyConversationShowInventory = false;
  state.legacyConversationEquipmentSlots = [];
  state.legacyConversationPaging = false;
  state.legacyConversationPages = [];
  state.legacyConversationScript = null;
  state.legacyConversationDescText = "";
  state.legacyConversationRules = [];
  state.legacyConversationPc = -1;
  state.legacyConversationInputOpcode = 0;
  state.legacyConversationVmContext = null;
  state.legacyLedgerPrompt = false;
  state.legacyPromptAnimMs = 0;
  state.legacyPromptAnimPhase = 0;
  state.legacyStatusDisplay = Number(state.legacyConversationPrevStatus) | 0;
}

export function submitLegacyConversationInput(state: LegacyConversationState, deps: SubmitConversationDeps = {}) {
  const typed = String(state.legacyConversationInput || "").trim();
  state.legacyConversationInput = "";
  state.legacyLedgerPrompt = false;
  const pushLedgerMessageFn = (typeof deps.pushLedgerMessage === "function")
    ? deps.pushLedgerMessage
    : (() => {});
  const pushPromptFn = (typeof deps.pushPrompt === "function")
    ? deps.pushPrompt
    : (() => {});
  if (!typed) {
    pushPromptFn();
    return { kind: "prompt" };
  }
  pushLedgerMessageFn(typed);
  const cmd = typed.toLowerCase();
  if (cmd === "bye" || cmd === "farewell") {
    pushLedgerMessageFn("Fare thee well.");
    if (typeof deps.showPrompt === "function") {
      deps.showPrompt();
    }
    if (typeof deps.endConversation === "function") {
      deps.endConversation();
    }
    return { kind: "ended", diagText: "Conversation ended." };
  }
  if (cmd === "look") {
    const desc = String(state.legacyConversationDescText || "").trim();
    const formatYouSeeLineFn = (typeof deps.formatYouSeeLine === "function")
      ? deps.formatYouSeeLine
      : ((s: string) => `You see ${String(s || "").trim()}.`);
    pushLedgerMessageFn(formatYouSeeLineFn(desc || state.legacyConversationTargetName || "someone"));
    pushPromptFn();
    return { kind: "look" };
  }
  const replyFn = (typeof deps.reply === "function")
    ? deps.reply
    : (() => ({ kind: "no-match", lines: [] }));
  const reply = replyFn(typed);
  if (reply && reply.kind === "ok") {
    const lines = (Array.isArray(reply.lines) ? reply.lines : [])
      .map((line) => String(line || "").trim())
      .filter(Boolean);
    if (typeof deps.startPagination === "function" && deps.startPagination(lines)) {
      return { kind: "paged" };
    }
    for (const line of lines) {
      const msg = String(line || "").trim();
      if (msg) pushLedgerMessageFn(msg);
    }
  } else if (reply && reply.kind === "unimplemented") {
    const fallbackText = String(deps.unimplementedFallbackText || "No response.").trim() || "No response.";
    pushLedgerMessageFn(fallbackText);
  } else {
    pushLedgerMessageFn("No response.");
  }
  pushPromptFn();
  return { kind: "response" };
}

export function handleLegacyConversationKeydown(
  state: LegacyConversationState,
  ev: ConversationKeyEvent,
  deps: ConversationKeydownDeps = {}
) {
  const key = String(ev?.key || "");
  if (key === "Escape") {
    if (typeof deps.endConversation === "function") {
      deps.endConversation();
    }
    return { handled: true, kind: "cancelled", diagText: "Conversation cancelled." };
  }
  if (state.legacyConversationPaging) {
    if (typeof deps.advancePagination === "function") {
      deps.advancePagination();
    }
    return { handled: true, kind: "paging-advance" };
  }
  if (key === "Enter") {
    if (typeof deps.submitInput === "function") {
      const out = deps.submitInput();
      return { handled: true, kind: "submit", submit: out || null };
    }
    return { handled: true, kind: "submit" };
  }
  if (key === "Backspace") {
    const input = String(state.legacyConversationInput || "");
    if (input.length > 0) {
      state.legacyConversationInput = input.slice(0, -1);
    }
    return { handled: true, kind: "backspace" };
  }
  if (key === "Tab") {
    return { handled: true, kind: "tab" };
  }
  if (key.length === 1 && !ev?.ctrlKey && !ev?.metaKey && !ev?.altKey) {
    const maxChars = Math.max(1, Number(deps.maxChars) | 0);
    const input = String(state.legacyConversationInput || "");
    if (input.length < maxChars) {
      state.legacyConversationInput = input + key;
    }
    return { handled: true, kind: "char" };
  }
  return { handled: false, kind: "noop" };
}

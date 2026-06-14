import type { ConversationRule } from "../client-web/conversation/rules_runtime.ts";
import type { ConversationVmContext } from "../client-web/conversation/text_runtime.ts";

export type ConversationArchivesRuntime = {
  a: Uint8Array | null;
  b: Uint8Array | null;
};

export type ConversationPositionRuntime = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

export type ConversationNpcRuntime = ConversationPositionRuntime & {
  id?: unknown;
  type?: unknown;
};

export type ConversationSessionRuntime = {
  desc: string;
  npcId: number;
  pc: number;
  persistTalkFlags: boolean;
  rules: ConversationRule[];
  script: Uint8Array | null;
  sessionId: string;
  stopOpcode: number;
  targetName: string;
  vmContext: ConversationVmContext;
};

export type ConversationSessionMapRuntime = Record<string, ConversationSessionRuntime>;

export type ConversationRuntimeState = {
  conversationArchives?: ConversationArchivesRuntime | null;
  conversationSessions?: ConversationSessionMapRuntime | null;
  introState?: { phase?: unknown } | null;
  npcPilotById?: { get(id: number): ConversationPositionRuntime | null | undefined } | null;
  npcRuntime?: {
    partySize?: unknown;
    talkFlags?: unknown;
  } | null;
  npcRuntimeById?: { get(id: number): ConversationNpcRuntime | null | undefined } | null;
  worldClock?: { time_h?: unknown } | null;
};

export type StartAuthoritativeConversationInputRuntime = {
  actorPos?: ConversationPositionRuntime | null;
  npcId?: unknown;
  playerName?: unknown;
};

export type ConversationSessionPayloadRuntime = {
  desc: string;
  next_pc: number;
  npc_id: number;
  opening_lines: string[];
  session_id: string;
  stop_opcode: number;
  target_name: string;
};

export type AuthoritativeConversationFailureRuntime = {
  code: string;
  http: number;
  message: string;
  ok: false;
};

export type StartAuthoritativeConversationResultRuntime =
  | AuthoritativeConversationFailureRuntime
  | {
    ok: true;
    payload: ConversationSessionPayloadRuntime;
    session: ConversationSessionRuntime;
  };

export type ReplyAuthoritativeConversationInputRuntime = {
  sessionId?: unknown;
  typed?: unknown;
};

export type ReplyAuthoritativeConversationPayloadRuntime = {
  ended: boolean;
  kind: "ended" | "look" | "response";
  lines: string[];
  next_pc: number;
  stop_opcode: number;
};

export type ReplyAuthoritativeConversationResultRuntime =
  | AuthoritativeConversationFailureRuntime
  | {
    ok: true;
    payload: ReplyAuthoritativeConversationPayloadRuntime;
  };

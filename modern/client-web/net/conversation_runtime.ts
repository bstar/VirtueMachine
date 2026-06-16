import { netJsonPostInitRuntime } from "./request_runtime.ts";
import type { WorldRuntimeJson, WorldRuntimeRequest } from "./world_runtime.ts";

export type AuthoritativeConversationActorRuntime = {
  id?: unknown;
};

export type AuthoritativeConversationStartArgsRuntime = {
  actor: AuthoritativeConversationActorRuntime | null | undefined;
  actorId: unknown;
  actorX: unknown;
  actorY: unknown;
  actorZ: unknown;
  playerName: unknown;
};

export type AuthoritativeConversationStartPayloadRuntime = WorldRuntimeJson & {
  conversation_session?: {
    desc?: unknown;
    next_pc?: unknown;
    npc_id?: unknown;
    opening_lines?: unknown;
    session_id?: unknown;
    stop_opcode?: unknown;
    target_name?: unknown;
  };
};

export type AuthoritativeConversationReplyPayloadRuntime = WorldRuntimeJson & {
  ended?: unknown;
  kind?: unknown;
  lines?: unknown;
  next_pc?: unknown;
  stop_opcode?: unknown;
};

export async function requestStartAuthoritativeConversationRuntime(
  args: AuthoritativeConversationStartArgsRuntime,
  request: WorldRuntimeRequest
): Promise<AuthoritativeConversationStartPayloadRuntime | null> {
  return request("/api/world/objects/interact", netJsonPostInitRuntime({
    verb: "talk",
    npc_id: Number(args.actor?.id) | 0,
    actor_id: String(args.actorId || "Avatar"),
    actor_x: Number(args.actorX) | 0,
    actor_y: Number(args.actorY) | 0,
    actor_z: Number(args.actorZ) | 0,
    player_name: String(args.playerName || "Avatar")
  }), true) as Promise<AuthoritativeConversationStartPayloadRuntime | null>;
}

export async function requestReplyAuthoritativeConversationRuntime(
  args: {
    sessionId: unknown;
    typed: unknown;
  },
  request: WorldRuntimeRequest
): Promise<AuthoritativeConversationReplyPayloadRuntime | null> {
  return request("/api/world/conversation/respond", netJsonPostInitRuntime({
    session_id: String(args.sessionId || ""),
    typed: String(args.typed || "")
  }), true) as Promise<AuthoritativeConversationReplyPayloadRuntime | null>;
}

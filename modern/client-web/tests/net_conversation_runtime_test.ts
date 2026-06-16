import assert from "node:assert/strict";
import {
  requestReplyAuthoritativeConversationRuntime,
  requestStartAuthoritativeConversationRuntime
} from "../net/conversation_runtime.ts";

{
  const requested: Array<{ auth?: boolean; body: unknown; method?: string; route: string }> = [];
  const out = await requestStartAuthoritativeConversationRuntime({
    actor: { id: 42 },
    actorId: "avatar-1",
    actorX: 307,
    actorY: 347,
    actorZ: 0,
    playerName: "Rhyguy"
  }, async (route, init, auth) => {
    requested.push({
      auth,
      body: JSON.parse(String(init?.body || "{}")),
      method: init?.method,
      route
    });
    return { ok: true, conversation_session: { session_id: "s1" } };
  });
  assert.deepEqual(requested, [{
    auth: true,
    body: {
      verb: "talk",
      npc_id: 42,
      actor_id: "avatar-1",
      actor_x: 307,
      actor_y: 347,
      actor_z: 0,
      player_name: "Rhyguy"
    },
    method: "POST",
    route: "/api/world/objects/interact"
  }]);
  assert.deepEqual(out, { ok: true, conversation_session: { session_id: "s1" } });
}

{
  const requested: Array<{ auth?: boolean; body: unknown; method?: string; route: string }> = [];
  await requestStartAuthoritativeConversationRuntime({
    actor: null,
    actorId: "",
    actorX: "bad",
    actorY: 2.9,
    actorZ: null,
    playerName: ""
  }, async (route, init, auth) => {
    requested.push({
      auth,
      body: JSON.parse(String(init?.body || "{}")),
      method: init?.method,
      route
    });
    return null;
  });
  assert.deepEqual(requested, [{
    auth: true,
    body: {
      verb: "talk",
      npc_id: 0,
      actor_id: "Avatar",
      actor_x: 0,
      actor_y: 2,
      actor_z: 0,
      player_name: "Avatar"
    },
    method: "POST",
    route: "/api/world/objects/interact"
  }]);
}

{
  const requested: Array<{ auth?: boolean; body: unknown; method?: string; route: string }> = [];
  const out = await requestReplyAuthoritativeConversationRuntime({
    sessionId: " session-1 ",
    typed: " job "
  }, async (route, init, auth) => {
    requested.push({
      auth,
      body: JSON.parse(String(init?.body || "{}")),
      method: init?.method,
      route
    });
    return { ok: true, lines: ["reply"] };
  });
  assert.deepEqual(requested, [{
    auth: true,
    body: {
      session_id: " session-1 ",
      typed: " job "
    },
    method: "POST",
    route: "/api/world/conversation/respond"
  }]);
  assert.deepEqual(out, { ok: true, lines: ["reply"] });
}

console.log("net_conversation_runtime_test: ok");

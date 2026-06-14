import assert from "node:assert/strict";
import {
  applyAuthoritativeNpcStatesRuntime,
  applyAuthoritativeWorldClockToSim,
  authoritativeNpcStateRowsFromJsonRuntime,
  performPresenceHeartbeat,
  performPresencePoll,
  performWorldClockPoll,
  projectRemotePresencePlayers,
  remotePresencePlayersFromJsonRuntime,
  type AuthoritativeNpcEntityRuntime
} from "../net/presence_runtime.ts";

const decodedRemotePlayers = remotePresencePlayersFromJsonRuntime([
  { session_id: "self-session", user_id: "u1", username: "avatar", updated_at_ms: 10 },
  { session_id: "s2", user_id: "u2", username: "dupre", updated_at_ms: 10 },
  { session_id: "s3", user_id: "u2", username: "dupre", updated_at_ms: 20 },
  { session_id: "s4", user_id: "u3", username: "shamino", updated_at_ms: 5 },
  null
]);
assert.equal(decodedRemotePlayers.length, 4);
assert.deepEqual(remotePresencePlayersFromJsonRuntime(null), []);
const projected = projectRemotePresencePlayers(decodedRemotePlayers, {
  sessionId: "self-session",
  userId: "u1",
  username: "avatar"
});
assert.deepEqual(projected.map((p) => p.session_id), ["s3", "s4"]);

{
  let resetCount = 0;
  const calls: string[] = [];
  await performPresenceHeartbeat({
    session_id: "s1",
    character_name: "Avatar",
    map_x: 1,
    map_y: 2,
    map_z: 0,
    facing_dx: 0,
    facing_dy: 1,
    tick: 99,
    mode: "avatar"
  }, {
    isAuthenticated: () => true,
    isSessionStarted: () => true,
    request: async (route, init, auth) => {
      calls.push(`${init?.method}:${route}:${auth}`);
      assert.equal(JSON.parse(String(init?.body || "{}")).tick, 99);
      return {};
    },
    resetBackgroundFailures: () => { resetCount += 1; }
  });
  assert.deepEqual(calls, ["POST:/api/world/presence/heartbeat:true"]);
  assert.equal(resetCount, 1);
}

{
  let inFlight = false;
  let players: unknown[] = [];
  await performPresencePoll({
    isAuthenticated: () => true,
    request: async () => ({
      players: [
        { session_id: "s1", user_id: "self", username: "avatar", updated_at_ms: 1 },
        { session_id: "s2", user_id: "remote", username: "iolo", updated_at_ms: 2 },
        null
      ]
    }),
    resetBackgroundFailures: () => {},
    isPollInFlight: () => inFlight,
    setPollInFlight: (next) => { inFlight = next; },
    setRemotePlayers: (next) => { players = next; },
    selfIdentity: () => ({ sessionId: "s1", userId: "self", username: "avatar" })
  });
  assert.equal(inFlight, false);
  assert.deepEqual(players.map((p) => String((p as { username?: unknown }).username)), ["iolo"]);
}

{
  let applied = null as null | { tick: number; time_m: number; time_h: number; date_d: number; date_m: number; date_y: number };
  applyAuthoritativeWorldClockToSim({
    tick: 123,
    time_m: 4,
    time_h: 5,
    date_d: 6,
    date_m: 7,
    date_y: 8
  }, (next) => { applied = next; });
  assert.deepEqual(applied, { tick: 123, time_m: 4, time_h: 5, date_d: 6, date_m: 7, date_y: 8 });
}

{
  const entries = [{
    id: 10,
    x: 1,
    y: 2,
    z: 0
  }, {
    id: 11,
    x: 9,
    y: 9,
    z: 0
  }];
  const decodedNpcRows = authoritativeNpcStateRowsFromJsonRuntime([{
    npc_id: 10,
    x: 3,
    y: 4,
    z: 1,
    action: 0x102,
    direction: 9,
    pose: " Stand ",
    path_status: " OK ",
    schedule_index: 7
  }, null]);
  assert.equal(decodedNpcRows.length, 1);
  assert.deepEqual(authoritativeNpcStateRowsFromJsonRuntime(null), []);
  const applied = applyAuthoritativeNpcStatesRuntime(entries, decodedNpcRows, 123.5);
  assert.equal(applied, 1);
  assert.deepEqual(entries[0], {
    id: 10,
    x: 3,
    y: 4,
    z: 1,
    homeX: 3,
    homeY: 4,
    authoritative: true,
    authoritativeLastX: 3,
    authoritativeLastY: 4,
    authoritativeLastZ: 1,
    authoritativeUpdatedAtMs: 123.5,
    authoritativeMovedAtMs: 123.5,
    movable: false,
    authoritativeAction: 0x02,
    authoritativeMode: 0x02,
    authoritativeDirection: 1,
    authoritativePose: "stand",
    authoritativePathStatus: "ok",
    authoritativeScheduleIndex: 7
  });
  assert.deepEqual(entries[1], {
    id: 11,
    x: 9,
    y: 9,
    z: 0
  });
}

{
  const entries: AuthoritativeNpcEntityRuntime[] = [{
    id: 10,
    authoritativeLastX: 3,
    authoritativeLastY: 4,
    authoritativeLastZ: 1,
    authoritativeMovedAtMs: 100,
    x: 3,
    y: 4,
    z: 1
  }];
  applyAuthoritativeNpcStatesRuntime(entries, [{
    npc_id: 10,
    x: 3,
    y: 4,
    z: 1,
    mode: 5
  }], 200);
  assert.equal(entries[0].authoritativeMovedAtMs, 100);
  assert.equal(entries[0].authoritativeMode, 5);
  assert.equal(entries[0].authoritativeDirection, 4);

  applyAuthoritativeNpcStatesRuntime(entries, [{
    npc_id: 10,
    x: 4,
    y: 4,
    z: 1
  }], 300);
  assert.equal(entries[0].authoritativeMovedAtMs, 300);
}

assert.equal(applyAuthoritativeNpcStatesRuntime(null, [{ npc_id: 1 }], 1), 0);
assert.equal(applyAuthoritativeNpcStatesRuntime([{ id: 1 }], null, 1), 0);
assert.equal(applyAuthoritativeNpcStatesRuntime([{ id: 1 }], [{ npc_id: "bad", x: 1, y: 2, z: 0 }], 1), 0);

{
  let appliedTick = 0;
  await performWorldClockPoll({
    isAuthenticated: () => true,
    request: async (route, init, auth) => {
      assert.equal(`${init?.method}:${route}:${auth}`, "GET:/api/world/clock:true");
      return { tick: 42 };
    },
    resetBackgroundFailures: () => {},
    isPollInFlight: () => false,
    setPollInFlight: () => {},
    applyClock: (clock) => {
      appliedTick = Number(clock?.tick) >>> 0;
    }
  });
  assert.equal(appliedTick, 42);
}

console.log("net_presence_runtime_test: ok");

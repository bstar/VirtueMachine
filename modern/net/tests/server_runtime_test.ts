import assert from "node:assert/strict";
import {
  advanceWorldClockMinuteRuntime,
  buildPresenceHeartbeatRowRuntime,
  clampIntRuntime,
  computeSnapshotHashRuntime,
  decodePackedCoordRuntime,
  defaultCriticalPolicyRuntime,
  defaultWorldInteractionLogRuntime,
  defaultWorldClockRuntime,
  defaultWorldSnapshotRuntime,
  deterministicRecoveryTickLastRuntime,
  hashInteractionEventRuntime,
  normalizeCriticalPolicyRuntime,
  normalizePresenceRowsRuntime,
  normalizeWorldInteractionLogRuntime,
  normalizeWorldClockRuntime,
  normalizeWorldSnapshotRuntime,
  parseU16LERuntime,
  presenceRowsPayloadRuntime,
  prunePresenceRowsRuntime,
  queryIntOrRuntime,
  recordWorldInteractionEventRuntime,
  removePresenceForUserRuntime,
  removePresenceSessionRuntime,
  type PresenceRowRuntime,
  upsertPresenceRowRuntime,
  runCriticalItemMaintenanceRuntime
} from "../server_runtime.ts";

assert.deepEqual(defaultWorldClockRuntime(1234), {
  tick: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 1,
  last_advanced_at_ms: 1234
});

assert.deepEqual(normalizeWorldClockRuntime({
  tick: -1,
  time_m: 59,
  time_h: 23,
  date_d: 0,
  date_m: 13,
  date_y: 5,
  last_advanced_at_ms: 0
}, 999), {
  tick: 0xffffffff,
  time_m: 59,
  time_h: 23,
  date_d: 1,
  date_m: 13,
  date_y: 5,
  last_advanced_at_ms: 999
});

assert.deepEqual(defaultWorldSnapshotRuntime("now"), {
  snapshot_meta: {
    schema_version: 1,
    sim_core_version: "unknown",
    saved_tick: 0,
    snapshot_hash: null
  },
  snapshot_base64: null,
  updated_at: "now"
});

assert.deepEqual(normalizeWorldSnapshotRuntime({
  snapshot_meta: {
    schema_version: "2",
    sim_core_version: "sim-core",
    saved_tick: -1,
    snapshot_hash: 123
  },
  snapshot_base64: "encoded",
  updated_at: "saved"
}, "now"), {
  snapshot_meta: {
    schema_version: 2,
    sim_core_version: "sim-core",
    saved_tick: 0xffffffff,
    snapshot_hash: "123"
  },
  snapshot_base64: "encoded",
  updated_at: "saved"
});

assert.deepEqual(normalizeWorldSnapshotRuntime({ snapshot_meta: "bad" }, "now"), {
  snapshot_meta: {
    schema_version: 1,
    sim_core_version: "unknown",
    saved_tick: 0,
    snapshot_hash: null
  },
  snapshot_base64: null,
  updated_at: "now"
});

assert.equal(parseU16LERuntime(new Uint8Array([0x34, 0x12]), 0), 0x1234);
assert.deepEqual(decodePackedCoordRuntime(0xff, 0x03, 0xf0), { x: 0x3ff, y: 0, z: 0x0f });

assert.equal(clampIntRuntime(-5, 0, 10), 0);
assert.equal(clampIntRuntime(99, 0, 10), 10);
assert.equal(clampIntRuntime(7, 0, 10), 7);

const url = new URL("http://example.test/?x=42&bad=nope");
assert.equal(queryIntOrRuntime(url, "x", 1), 42);
assert.equal(queryIntOrRuntime(url, "bad", 1), 1);
assert.equal(queryIntOrRuntime(url, "missing", 1), 1);

const clock = {
  tick: 0,
  time_m: 59,
  time_h: 23,
  date_d: 28,
  date_m: 13,
  date_y: 1,
  last_advanced_at_ms: 0
};
advanceWorldClockMinuteRuntime(clock, {
  daysPerMonth: 28,
  hoursPerDay: 24,
  minutesPerHour: 60,
  monthsPerYear: 13
});
assert.deepEqual(clock, {
  tick: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 2,
  last_advanced_at_ms: 0
});

assert.equal(
  computeSnapshotHashRuntime(""),
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
);
assert.equal(deterministicRecoveryTickLastRuntime([
  { item_id: "a", tick: 10 },
  { item_id: "b", tick: 30 },
  { item_id: "a", tick: 20 }
], "a"), 20);
assert.equal(deterministicRecoveryTickLastRuntime([{ item_id: "b", tick: 30 }], "a"), null);

assert.deepEqual(defaultCriticalPolicyRuntime(), [{
  item_id: "item_moonstone",
  policy_type: "regenerative_unique",
  anchor_locations: [{ x: 307, y: 347, z: 0 }],
  cooldown_ticks: 120,
  min_count: 1,
  quest_gate: null
}]);

assert.deepEqual(normalizeCriticalPolicyRuntime([
  {
    item_id: " item_a ",
    policy_type: "instance_quota",
    anchor_locations: [{ x: "4", y: "5", z: "1" }, "bad"],
    cooldown_ticks: "12",
    min_count: "2",
    quest_gate: "quest"
  },
  { item_id: "item_a", policy_type: "duplicate" },
  { item_id: "", policy_type: "missing" }
]), [{
  item_id: "item_a",
  policy_type: "instance_quota",
  anchor_locations: [{ x: 4, y: 5, z: 1 }],
  cooldown_ticks: 12,
  min_count: 2,
  quest_gate: "quest"
}]);
assert.deepEqual(normalizeCriticalPolicyRuntime("bad"), defaultCriticalPolicyRuntime());
assert.deepEqual(normalizeCriticalPolicyRuntime([]), defaultCriticalPolicyRuntime());

assert.deepEqual(runCriticalItemMaintenanceRuntime({
  criticalPolicy: [{
    item_id: "b_item",
    policy_type: "regenerative_unique",
    anchor_locations: [{ x: "4", y: "5", z: "1" }],
    cooldown_ticks: 10,
    min_count: 1
  }, {
    item_id: "a_item",
    policy_type: "instance_quota",
    anchor_locations: [{ x: 1, y: 2, z: 0 }],
    cooldown_ticks: 0,
    min_count: 2
  }],
  nowIso: "2026-06-14T00:00:00.000Z",
  payload: {
    tick: 100,
    world_items: [
      { item_id: "a_item", reachable: true },
      { item_id: "b_item", reachable: false }
    ]
  },
  recoveryEvents: []
}), [{
  kind: "critical_item_recovery",
  at: "2026-06-14T00:00:00.000Z",
  tick: 100,
  item_id: "a_item",
  reason: "below_min_count",
  restored_to: { x: 1, y: 2, z: 0 }
}, {
  kind: "critical_item_recovery",
  at: "2026-06-14T00:00:00.000Z",
  tick: 100,
  item_id: "b_item",
  reason: "missing_or_unreachable",
  restored_to: { x: 4, y: 5, z: 1 }
}]);

assert.deepEqual(runCriticalItemMaintenanceRuntime({
  criticalPolicy: [{
    item_id: "cooldown_item",
    policy_type: "regenerative_unique",
    anchor_locations: [{ x: 0, y: 0, z: 0 }],
    cooldown_ticks: 50,
    min_count: 1
  }],
  nowIso: "2026-06-14T00:00:00.000Z",
  payload: { tick: 120, world_items: [] },
  recoveryEvents: [{ item_id: "cooldown_item", tick: 100 }]
}), []);

assert.deepEqual(defaultWorldInteractionLogRuntime(), {
  schema_version: 1,
  seq: 0,
  checkpoint_hash: "",
  events: []
});

const normalizedLog = normalizeWorldInteractionLogRuntime({
  seq: -5,
  checkpoint_hash: 123,
  events: Array.from({ length: 514 }, (_v, i) => ({
    seq: i,
    verb: i === 513 ? "take" : "",
    status: 0x1ff,
    runtime_profile: i === 513 ? "canonical_plus" : "bad",
    runtime_extensions: i === 513 ? ["housing", "bad_ext", "quest_system"] : ""
  }))
});
assert.equal(normalizedLog.seq, 0);
assert.equal(normalizedLog.checkpoint_hash, "123");
assert.equal(normalizedLog.events.length, 512);
assert.equal(normalizedLog.events[0].seq, 2);
assert.equal(normalizedLog.events[511].verb, "take");
assert.equal(normalizedLog.events[511].status, 0xff);
assert.equal(normalizedLog.events[511].runtime_profile, "canonical_plus");
assert.deepEqual(normalizedLog.events[511].runtime_extensions, ["bad_ext", "housing", "quest_system"]);

const state = { worldInteractionLog: defaultWorldInteractionLogRuntime() };
const firstEvent = recordWorldInteractionEventRuntime(state, {
  verb: "take",
  actor_id: "avatar",
  target_key: "a01",
  status: 0x101,
  x: "307",
  y: "347",
  z: "0",
  runtime_profile: "canonical_plus",
  runtime_extensions: "quest_system,housing"
});
assert.equal(firstEvent.seq, 1);
assert.equal(firstEvent.status, 1);
assert.equal(state.worldInteractionLog.seq, 1);
assert.deepEqual(firstEvent.runtime_extensions, ["housing", "quest_system"]);
assert.equal(
  state.worldInteractionLog.checkpoint_hash,
  hashInteractionEventRuntime("", firstEvent)
);

for (let i = 0; i < 520; i += 1) {
  recordWorldInteractionEventRuntime(state, { verb: "noop", target_key: `k${i}` });
}
assert.equal(state.worldInteractionLog.events.length, 512);
assert.equal(state.worldInteractionLog.events[0].seq, 10);
assert.equal(state.worldInteractionLog.seq, 521);

assert.deepEqual(normalizePresenceRowsRuntime(null), []);
assert.deepEqual(normalizePresenceRowsRuntime([{
  user_id: 7,
  username: "Avatar",
  session_id: "s1",
  character_name: "Dupre",
  map_x: "10",
  map_y: "20",
  map_z: "1",
  facing_dx: "-1",
  facing_dy: "0",
  tick: -1,
  mode: "",
  runtime_profile: "canonical_plus",
  runtime_extensions: ["quest_system", "housing"],
  updated_at_ms: "123"
}]), [{
  user_id: "7",
  username: "Avatar",
  session_id: "s1",
  character_name: "Dupre",
  map_x: 10,
  map_y: 20,
  map_z: 1,
  facing_dx: -1,
  facing_dy: 0,
  tick: 0xffffffff,
  mode: "avatar",
  runtime_profile: "canonical_plus",
  runtime_extensions: ["housing", "quest_system"],
  updated_at_ms: 123
}]);

const presenceRows: PresenceRowRuntime[] = [{
  user_id: "u1",
  username: "Avatar",
  session_id: "s1",
  character_name: "Avatar",
  map_x: 1,
  map_y: 2,
  map_z: 0,
  facing_dx: 1,
  facing_dy: 0,
  tick: 10,
  mode: "avatar",
  runtime_profile: "canonical_strict",
  runtime_extensions: [],
  updated_at_ms: 100
}, {
  user_id: "u2",
  username: "Dupre",
  session_id: "s2",
  character_name: "Dupre",
  map_x: 3,
  map_y: 4,
  map_z: 0,
  facing_dx: 0,
  facing_dy: 1,
  tick: 11,
  mode: "avatar",
  runtime_profile: "canonical_plus",
  runtime_extensions: ["quest_system"],
  updated_at_ms: 10
}];
assert.deepEqual(prunePresenceRowsRuntime(presenceRows, { nowMs: 110, ttlMs: 50 }), [presenceRows[0]]);

const upserted = upsertPresenceRowRuntime(presenceRows, {
  ...presenceRows[0],
  user_id: "u3",
  session_id: "s1",
  username: "Iolo",
  updated_at_ms: 120
}, { nowMs: 120, ttlMs: 200 });
assert.deepEqual(upserted.map((p) => `${p.user_id}:${p.session_id}`), ["u2:s2", "u3:s1"]);

assert.deepEqual(
  removePresenceForUserRuntime(presenceRows, "u1", { nowMs: 110, ttlMs: 200 }).map((p) => p.user_id),
  ["u2"]
);
const removedSession = removePresenceSessionRuntime(presenceRows, {
  nowMs: 110,
  sessionId: "s1",
  ttlMs: 200,
  userId: "u1"
});
assert.equal(removedSession.key, "u1:s1");
assert.deepEqual(removedSession.rows.map((p) => p.session_id), ["s2"]);

assert.deepEqual(buildPresenceHeartbeatRowRuntime({
  body: {
    session_id: " session-123 ",
    character_name: " Avatar ",
    map_x: "307",
    map_y: "347",
    map_z: "0",
    facing_dx: "-1",
    facing_dy: "0",
    mode: "ghost"
  },
  clockTick: -1,
  nowMs: 500,
  runtimeContract: {
    profile: "canonical_plus",
    extensions: ["housing", "bad_ext", "quest_system"]
  },
  userId: "u1",
  username: "Avatar"
}), {
  user_id: "u1",
  username: "Avatar",
  session_id: "session-123",
  character_name: "Avatar",
  map_x: 307,
  map_y: 347,
  map_z: 0,
  facing_dx: -1,
  facing_dy: 0,
  tick: 0xffffffff,
  mode: "ghost",
  runtime_profile: "canonical_plus",
  runtime_extensions: ["bad_ext", "housing", "quest_system"],
  updated_at_ms: 500
});

assert.deepEqual(presenceRowsPayloadRuntime([{
  ...presenceRows[0],
  tick: -1,
  mode: "",
  runtime_profile: "bad",
  runtime_extensions: ["housing", "quest_system"]
}]), [{
  user_id: "u1",
  username: "Avatar",
  session_id: "s1",
  character_name: "Avatar",
  map_x: 1,
  map_y: 2,
  map_z: 0,
  facing_dx: 1,
  facing_dy: 0,
  tick: 0xffffffff,
  mode: "avatar",
  runtime_profile: "canonical_strict",
  runtime_extensions: ["housing", "quest_system"],
  updated_at_ms: 100
}]);

console.log("server_runtime_test: ok");

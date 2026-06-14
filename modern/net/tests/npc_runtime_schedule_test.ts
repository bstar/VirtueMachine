import assert from "node:assert/strict";
import {
  INTRO_PHASE_POST_RUNTIME,
  INTRO_PHASE_PRE_RUNTIME,
  buildCastlePilotNpcOverrides,
  buildScheduledNpcStatesRuntime,
  defaultNpcRuntimeStateRuntime,
  normalizeNpcRuntimeStateRuntime,
  type NpcBaselineRuntime,
  type ScheduledNpcStateRuntime,
  type U6ScheduleTableRuntime
} from "../npc_runtime.ts";

const AI_SIT = 0x92;
const AI_FINDPATH = 0x81;

const baseline: NpcBaselineRuntime = {
  entries: [
    {
      id: 2,
      x: 0,
      y: 0,
      z: 0,
      status: 0,
      npcStatus: 0,
      qual: 0,
      type: 0x178,
      frame: 1,
      baseTile: 100,
      tileId: 101,
      order: 2,
      source: "objlist"
    }
  ],
  assocEntries: [],
  talkFlags: [1, 2, 3],
  schedIndex: [],
  npcMode: [],
  npcComMode: [],
  movePts: [],
  leader: [],
  npcFlag: [],
  level: [],
  party: [],
  partySize: 0,
  origShapeType: []
};

const defaultPersist = defaultNpcRuntimeStateRuntime(baseline);
assert.equal(defaultPersist.intro_phase, INTRO_PHASE_POST_RUNTIME);
assert.equal(defaultPersist.talk_flags.length, 3);
assert.deepEqual(defaultPersist.talk_flags, [1, 2, 3]);

const fallbackPersist = defaultNpcRuntimeStateRuntime(null);
assert.equal(fallbackPersist.talk_flags.length, 0x100);
assert.equal(fallbackPersist.talk_flags[0], 0);

const normalizedPersist = normalizeNpcRuntimeStateRuntime({
  intro_phase: " PRE_INTRO ",
  talk_flags: [0x101, -1, "7"]
}, baseline);
assert.equal(normalizedPersist.intro_phase, INTRO_PHASE_PRE_RUNTIME);
assert.deepEqual(normalizedPersist.talk_flags.slice(0, 3), [1, 0xff, 7]);

const invalidPersist = normalizeNpcRuntimeStateRuntime({
  intro_phase: "bad",
  talk_flags: "bad"
}, baseline);
assert.equal(invalidPersist.intro_phase, INTRO_PHASE_POST_RUNTIME);
assert.deepEqual(invalidPersist.talk_flags, [1, 2, 3]);

const npcOffsets = new Array(0x101).fill(0);
npcOffsets[2] = 0;
npcOffsets[3] = 1;

const schedule: U6ScheduleTableRuntime = {
  npcOffsets,
  entryCount: 1,
  entries: [
    {
      time: 0,
      action: AI_SIT,
      xyz_raw: 0,
      x: 2,
      y: 0,
      z: 0
    }
  ]
};

const previous: ScheduledNpcStateRuntime[] = [
  {
    npc_id: 2,
    x: 0,
    y: 0,
    z: 0,
    target_x: 2,
    target_y: 0,
    target_z: 0,
    action: AI_SIT,
    mode: AI_FINDPATH,
    direction: 2,
    pose: "walk",
    schedule_index: 0,
    source: "schedule",
    path_status: "walking",
    unsupported_action: false,
    last_schedule_hour: 0,
    last_schedule_date_d: 1
  }
];

const blocked = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 8 },
  previous,
  1,
  { canStep: (step) => !(step.to_x === 1 && step.to_y === 0) }
);

assert.equal(blocked.length, 1);
assert.equal(blocked[0].x, 0, "blocked schedule step must preserve x");
assert.equal(blocked[0].y, 1, "schedule step should route around a blocked direct x step");
assert.equal(blocked[0].path_status, "walking");
assert.equal(blocked[0].pose, "walk");

const fullyBlocked = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 8 },
  previous,
  1,
  { canStep: () => false }
);

assert.equal(fullyBlocked.length, 1);
assert.equal(fullyBlocked[0].x, 0, "fully blocked schedule step must preserve x");
assert.equal(fullyBlocked[0].y, 0, "fully blocked schedule step must preserve y");
assert.equal(fullyBlocked[0].path_status, "blocked");
assert.equal(fullyBlocked[0].pose, "walk");

const allowed = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 8 },
  previous,
  1,
  { canStep: () => true }
);

assert.equal(allowed.length, 1);
assert.equal(allowed[0].x, 1, "allowed schedule step should advance one tile");
assert.equal(allowed[0].path_status, "walking");

const firstSchedulePass = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 0 },
  [],
  0,
  { canStep: () => true }
);

assert.equal(firstSchedulePass.length, 1);
assert.equal(firstSchedulePass[0].x, 0, "first scheduled state must start from baseline x instead of teleporting to target");
assert.equal(firstSchedulePass[0].y, 0, "first scheduled state must start from baseline y instead of teleporting to target");
assert.equal(firstSchedulePass[0].target_x, 2);
assert.equal(firstSchedulePass[0].path_status, "walking");

const firstScheduleStep = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 8 },
  firstSchedulePass,
  1,
  { canStep: () => true }
);

assert.equal(firstScheduleStep[0].x, 1, "first movement after startup should advance through pathing");
assert.equal(firstScheduleStep[0].y, 0);

const furniturePermissive = buildScheduledNpcStatesRuntime(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 8 },
  previous,
  1,
  {
    canStep: (step) => {
      // Mirrors scheduled NPC behavior: furniture cells may be passable, but walls remain blocked.
      return !(step.to_x === 0 && step.to_y === 1);
    }
  }
);

assert.equal(furniturePermissive.length, 1);
assert.equal(furniturePermissive[0].x, 1, "schedule pathing should be able to use a direct furniture-passable cell");
assert.equal(furniturePermissive[0].y, 0);
assert.equal(furniturePermissive[0].path_status, "walking");

assert.deepEqual(buildCastlePilotNpcOverrides(
  baseline,
  schedule,
  { time_h: 0, date_d: 1, tick: 0 }
), [{
  npc_id: 2,
  x: 2,
  y: 0,
  z: 0,
  action: AI_SIT,
  schedule_index: 0,
  source: "schedule"
}]);

assert.deepEqual(buildCastlePilotNpcOverrides(
  baseline,
  { npcOffsets: new Array(0x101).fill(0), entryCount: 0, entries: [] },
  { time_h: 0, date_d: 1, tick: 0 }
), [{
  npc_id: 2,
  x: 0,
  y: 0,
  z: 0,
  action: 0,
  schedule_index: 0,
  source: "objlist"
}]);

console.log("npc_runtime_schedule_test: ok");

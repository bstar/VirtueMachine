import assert from "node:assert/strict";
import {
  LEGACY_COMMAND_TYPE_RUNTIME,
  LEGACY_MOUSE_CURSOR_INDEX_RUNTIME,
  LEGACY_TARGET_VERB_RUNTIME,
  LEGACY_WORLD_CURSOR_TILE_RUNTIME,
  buildLegacyWireCommandRuntime,
  legacyKeyboardCommandActionRuntime,
  legacyNonTargetCommandPatchRuntime,
  legacyTargetStartPlanRuntime,
  legacyVerbCommandTypeRuntime,
  legacyVerbLabelRuntime,
  legacyVerbMouseCursorIndexRuntime,
  legacyVerbSelectRangeRuntime,
  legacyVerbWorldCursorTileRuntime,
  normalizeLegacyTargetVerbRuntime
} from "../sim/legacy_command_runtime.ts";
import {
  applySimCommandActionPlanRuntime,
  appendCommandLogRuntime,
  enqueueCommandRuntime,
  filterFutureCommandsOfTypeRuntime,
  moveDeltaFromKeyRuntime,
  normalizedAvatarMoveDeltaRuntime,
  partitionCommandsForTickRuntime,
  queueAvatarMoveCommandRuntime,
  queueCellCommandRuntime,
  queueFacingUseCommandRuntime,
  queueLegacyTargetVerbCommandRuntime,
  resetMoveInputThrottleRuntime,
  simCommandActionRuntime,
  simCommandDispatchRuntime,
  shouldSuppressRepeatedMoveRuntime,
  upsertMoveCommandForTickRuntime,
  type AvatarMoveQueueStateRuntime,
  type SimCommandRuntime
} from "../sim/queue_runtime.ts";

const MOVE = 1;
const USE = 2;

assert.equal(normalizeLegacyTargetVerbRuntime("Attack"), LEGACY_TARGET_VERB_RUNTIME.ATTACK);
assert.equal(normalizeLegacyTargetVerbRuntime("invalid"), null);
assert.equal(legacyVerbLabelRuntime("cast"), "Cast");
assert.equal(legacyVerbSelectRangeRuntime("get"), -1);
assert.equal(legacyVerbWorldCursorTileRuntime("get"), LEGACY_WORLD_CURSOR_TILE_RUNTIME.DIRECTION);
assert.equal(legacyVerbWorldCursorTileRuntime("drop"), LEGACY_WORLD_CURSOR_TILE_RUNTIME.SELECT);
assert.equal(legacyVerbMouseCursorIndexRuntime("drop"), LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.SELECT);
assert.equal(legacyVerbMouseCursorIndexRuntime("invalid"), LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.POINTER);
assert.equal(legacyVerbCommandTypeRuntime("talk"), LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL);
assert.deepEqual(legacyKeyboardCommandActionRuntime("a"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.ATTACK });
assert.deepEqual(legacyKeyboardCommandActionRuntime("c"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.CAST });
assert.deepEqual(legacyKeyboardCommandActionRuntime("t"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.TALK });
assert.deepEqual(legacyKeyboardCommandActionRuntime("l"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.LOOK });
assert.deepEqual(legacyKeyboardCommandActionRuntime("g"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.GET });
assert.deepEqual(legacyKeyboardCommandActionRuntime("d"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.DROP });
assert.deepEqual(legacyKeyboardCommandActionRuntime("m"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.MOVE });
assert.deepEqual(legacyKeyboardCommandActionRuntime("u"), { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.USE });
assert.deepEqual(legacyKeyboardCommandActionRuntime("i"), { kind: "status_inventory" });
assert.deepEqual(legacyKeyboardCommandActionRuntime("p"), { kind: "status_party" });
assert.deepEqual(legacyKeyboardCommandActionRuntime("r"), { kind: "rest" });
assert.deepEqual(legacyKeyboardCommandActionRuntime("b"), { kind: "toggle_combat" });
assert.deepEqual(legacyKeyboardCommandActionRuntime("x"), { kind: "none" });
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 0,
  inventoryStatusDisplay: 0x92,
  key: "i",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag ok",
  diagText: "Status: inventory/equipment.",
  handled: true,
  legacyStatusDisplay: 0x92
});
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 0,
  inventoryStatusDisplay: 0x92,
  key: "p",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag ok",
  diagText: "Status: party/command.",
  handled: true,
  legacyStatusDisplay: 0x91
});
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 0,
  inventoryStatusDisplay: 0x92,
  key: "r",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag ok",
  diagText: "Rest: legacy key mapped; rest system integration pending.",
  handled: true
});
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 0,
  inventoryStatusDisplay: 0x92,
  key: "b",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag ok",
  diagText: "Combat mode: ON",
  handled: true,
  inCombat: 1
});
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 1,
  inventoryStatusDisplay: 0x92,
  key: "b",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag ok",
  diagText: "Combat mode: OFF",
  handled: true,
  inCombat: 0
});
assert.deepEqual(legacyNonTargetCommandPatchRuntime({
  currentInCombat: 0,
  inventoryStatusDisplay: 0x92,
  key: "x",
  partyStatusDisplay: 0x91
}), {
  diagClass: "diag warn",
  diagText: "",
  handled: false
});
assert.deepEqual(legacyTargetStartPlanRuntime({
  dropStatusDisplay: 0x92,
  hasDropItem: true,
  movementMode: "ghost",
  verb: "talk"
}), {
  action: "blocked",
  diagClass: "diag warn",
  diagText: "Legacy targeting requires Avatar mode.",
  ledgerLines: []
});
assert.deepEqual(legacyTargetStartPlanRuntime({
  dropStatusDisplay: 0x92,
  hasDropItem: false,
  movementMode: "avatar",
  verb: "drop"
}), {
  action: "blocked",
  diagClass: "diag warn",
  diagText: "Drop: inventory is empty.",
  ledgerLines: [">Drop-nothing", "Not possible"]
});
assert.deepEqual(legacyTargetStartPlanRuntime({
  dropStatusDisplay: 0x92,
  hasDropItem: true,
  movementMode: "avatar",
  verb: "drop"
}), {
  action: "begin",
  legacyStatusDisplay: 0x92,
  shouldPromptDropTarget: true
});
assert.deepEqual(legacyTargetStartPlanRuntime({
  dropStatusDisplay: 0x92,
  movementMode: "avatar",
  verb: "talk"
}), {
  action: "begin",
  shouldPromptDropTarget: false
});
assert.deepEqual(buildLegacyWireCommandRuntime(7, LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, 10, 11), {
  tick: 7,
  type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL,
  arg0: 10,
  arg1: 11
});
assert.deepEqual(moveDeltaFromKeyRuntime({ key: "ArrowUp" }, false), [0, -1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ key: "ArrowDown" }, false), [0, 1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ key: "ArrowLeft" }, false), [-1, 0]);
assert.deepEqual(moveDeltaFromKeyRuntime({ key: "ArrowRight" }, false), [1, 0]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad8" }, false), [0, -1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad2" }, false), [0, 1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad4" }, false), [-1, 0]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad6" }, false), [1, 0]);
assert.equal(moveDeltaFromKeyRuntime({ key: "a" }, true), null);
assert.equal(moveDeltaFromKeyRuntime({ code: "Numpad7" }, false), null);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad7" }, true), [-1, -1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad9" }, true), [1, -1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad1" }, true), [-1, 1]);
assert.deepEqual(moveDeltaFromKeyRuntime({ code: "Numpad3" }, true), [1, 1]);
const dispatchCases: Array<[number, ReturnType<typeof simCommandDispatchRuntime>]> = [
  [LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, "move_avatar"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING, "use_facing"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, "use_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.LOOK_AT_CELL, "look_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL, "talk_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.GET_AT_CELL, "get_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.ATTACK_AT_CELL, "attack_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.CAST_AT_CELL, "cast_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.DROP_AT_CELL, "drop_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AT_CELL, "move_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_VERB_AT_CELL, "use_verb_at_cell"],
  [9999, "unknown"]
];
assert.deepEqual(dispatchCases.map(([commandType]) => [commandType, simCommandDispatchRuntime(commandType)]), [
  [LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, "move_avatar"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING, "use_facing"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, "use_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.LOOK_AT_CELL, "look_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL, "talk_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.GET_AT_CELL, "get_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.ATTACK_AT_CELL, "attack_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.CAST_AT_CELL, "cast_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.DROP_AT_CELL, "drop_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AT_CELL, "move_at_cell"],
  [LEGACY_COMMAND_TYPE_RUNTIME.USE_VERB_AT_CELL, "use_verb_at_cell"],
  [9999, "unknown"]
]);
assert.deepEqual(simCommandActionRuntime({
  command: { tick: 1, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 1, arg1: 0 },
  movementMode: "ghost"
}), {
  action: "move_avatar",
  arg0: 1,
  arg1: 0,
  facingDx: 0,
  facingDy: 0,
  shouldUpdateFacing: false
});
assert.deepEqual(simCommandActionRuntime({
  command: { tick: 1, type: LEGACY_COMMAND_TYPE_RUNTIME.LOOK_AT_CELL, arg0: 10, arg1: 11 },
  movementMode: "ghost"
}), {
  action: "none",
  arg0: 10,
  arg1: 11,
  facingDx: 0,
  facingDy: 0,
  shouldUpdateFacing: false
});
assert.deepEqual(simCommandActionRuntime({
  command: { tick: 1, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, arg0: 12, arg1: 8 },
  movementMode: "avatar",
  avatarX: 10,
  avatarY: 10
}), {
  action: "use_at_cell",
  arg0: 12,
  arg1: 8,
  facingDx: 1,
  facingDy: -1,
  shouldUpdateFacing: true
});
assert.deepEqual(simCommandActionRuntime({
  command: { tick: 1, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, arg0: 10, arg1: 10 },
  movementMode: "avatar",
  avatarX: 10,
  avatarY: 10
}), {
  action: "use_at_cell",
  arg0: 10,
  arg1: 10,
  facingDx: 0,
  facingDy: 0,
  shouldUpdateFacing: false
});
assert.deepEqual(simCommandActionRuntime({
  command: { tick: 1, type: 9999, arg0: 1, arg1: 2 },
  movementMode: "avatar"
}), {
  action: "none",
  arg0: 1,
  arg1: 2,
  facingDx: 0,
  facingDy: 0,
  shouldUpdateFacing: false
});

{
  const sim = { commandsApplied: 0, calls: [] as string[] };
  const result = applySimCommandActionPlanRuntime({
    handlers: {},
    plan: {
      action: "none",
      arg0: 1,
      arg1: 2,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    },
    sim
  });
  assert.deepEqual(result, {
    action: "none",
    applied: true,
    commandsApplied: 1,
    facingUpdated: false
  });
  assert.equal(sim.commandsApplied, 1);
  assert.deepEqual(sim.calls, []);
}

{
  const sim = { commandsApplied: 4, calls: [] as string[] };
  const facingState = { avatarFacingDx: 0, avatarFacingDy: 1 };
  const result = applySimCommandActionPlanRuntime({
    facingState,
    handlers: {
      useAtCell: (_sim, x, y) => _sim.calls.push(`use:${x},${y}`)
    },
    plan: {
      action: "use_at_cell",
      arg0: 12,
      arg1: 8,
      facingDx: 1,
      facingDy: -1,
      shouldUpdateFacing: true
    },
    sim
  });
  assert.deepEqual(result, {
    action: "use_at_cell",
    applied: true,
    commandsApplied: 5,
    facingUpdated: true
  });
  assert.deepEqual(facingState, { avatarFacingDx: 1, avatarFacingDy: -1 });
  assert.deepEqual(sim.calls, ["use:12,8"]);
}

{
  const sim = { commandsApplied: 7, calls: [] as string[] };
  const result = applySimCommandActionPlanRuntime({
    handlers: {
      moveAvatar: (_sim, dx, dy) => {
        _sim.calls.push(`move:${dx},${dy}`);
        return false;
      }
    },
    plan: {
      action: "move_avatar",
      arg0: 1,
      arg1: 0,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    },
    sim
  });
  assert.deepEqual(result, {
    action: "move_avatar",
    applied: false,
    commandsApplied: 7,
    facingUpdated: false
  });
  assert.deepEqual(sim.calls, ["move:1,0"]);
}

{
  const sim = { commandsApplied: 2, calls: [] as string[] };
  applySimCommandActionPlanRuntime({
    handlers: {
      dropAtCell: (_sim, x, y) => _sim.calls.push(`drop:${x},${y}`),
      useAtCell: (_sim, x, y) => _sim.calls.push(`use:${x},${y}`)
    },
    plan: {
      action: "drop_at_cell",
      arg0: 3,
      arg1: 4,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    },
    sim
  });
  applySimCommandActionPlanRuntime({
    handlers: {
      dropAtCell: (_sim, x, y) => _sim.calls.push(`drop:${x},${y}`),
      useAtCell: (_sim, x, y) => _sim.calls.push(`use:${x},${y}`)
    },
    plan: {
      action: "use_verb_at_cell",
      arg0: 5,
      arg1: 6,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    },
    sim
  });
  assert.equal(sim.commandsApplied, 4);
  assert.deepEqual(sim.calls, ["drop:3,4", "use:5,6"]);
}

const commandLog = [{ type: 99, tick: 0 }];
appendCommandLogRuntime(commandLog, { type: USE, tick: 1 }, 1);
assert.deepEqual(commandLog, [{ type: USE, tick: 1 }]);

const clonedCommand = { type: USE, tick: 2, arg0: 4 };
appendCommandLogRuntime(commandLog, clonedCommand, 2);
clonedCommand.arg0 = 9;
assert.deepEqual(commandLog[1], { type: USE, tick: 2, arg0: 4 });

assert.equal(shouldSuppressRepeatedMoveRuntime({
  dx: 1,
  dy: 0,
  lastDx: 1,
  lastDy: 0,
  lastQueuedAtMs: 100,
  nowMs: 120,
  minIntervalMs: 50
}), true);
assert.equal(shouldSuppressRepeatedMoveRuntime({
  dx: 0,
  dy: 1,
  lastDx: 1,
  lastDy: 0,
  lastQueuedAtMs: 100,
  nowMs: 120,
  minIntervalMs: 50
}), false);
assert.equal(shouldSuppressRepeatedMoveRuntime({
  dx: 1,
  dy: 0,
  lastDx: 1,
  lastDy: 0,
  lastQueuedAtMs: -1,
  nowMs: 120,
  minIntervalMs: 50
}), false);

assert.deepEqual(normalizedAvatarMoveDeltaRuntime({ dx: 1, dy: 0 }), [1, 0]);
assert.deepEqual(normalizedAvatarMoveDeltaRuntime({ dx: "0.9", dy: "-1.9" }), [0, -1]);
assert.equal(normalizedAvatarMoveDeltaRuntime({ dx: 0, dy: 0 }), null);
assert.equal(normalizedAvatarMoveDeltaRuntime({ dx: 1, dy: 1 }), null);
assert.equal(normalizedAvatarMoveDeltaRuntime({ dx: 2, dy: 0 }), null);

const queue = [
  { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
  { type: USE, tick: 3, arg0: 10, arg1: 20 },
  { type: MOVE, tick: 5, arg0: 0, arg1: 1 }
];
assert.deepEqual(filterFutureCommandsOfTypeRuntime(queue, 2, MOVE), [
  { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
  { type: USE, tick: 3, arg0: 10, arg1: 20 }
]);

assert.deepEqual(partitionCommandsForTickRuntime(queue, 3), {
  due: [{ type: USE, tick: 3, arg0: 10, arg1: 20 }],
  pending: [
    { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
    { type: MOVE, tick: 5, arg0: 0, arg1: 1 }
  ]
});

{
  const throttleState = {
    lastMoveInputDx: -1,
    lastMoveInputDy: 0,
    lastMoveQueueAtMs: 1234
  };
  resetMoveInputThrottleRuntime(throttleState);
  assert.deepEqual(throttleState, {
    lastMoveInputDx: 0,
    lastMoveInputDy: 1,
    lastMoveQueueAtMs: -1
  });
}

const upsertQueue: SimCommandRuntime[] = [
  { type: MOVE, tick: 4, arg0: 1, arg1: 0 },
  { type: USE, tick: 4, arg0: 7, arg1: 8 }
];
const upsertLog: SimCommandRuntime[] = [{ type: MOVE, tick: 4, arg0: 1, arg1: 0 }];
assert.equal(upsertMoveCommandForTickRuntime({
  queue: upsertQueue,
  commandLog: upsertLog,
  cmd: { type: MOVE, tick: 4, arg0: -1, arg1: 0 },
  targetTick: 4,
  moveType: MOVE,
  commandLogMax: 10
}), true);
assert.deepEqual(upsertQueue, [
  { type: MOVE, tick: 4, arg0: -1, arg1: 0 },
  { type: USE, tick: 4, arg0: 7, arg1: 8 }
]);
assert.deepEqual(upsertLog, [{ type: MOVE, tick: 4, arg0: -1, arg1: 0 }]);

const enqueueQueue: SimCommandRuntime[] = [];
const enqueueLog: SimCommandRuntime[] = [];
enqueueCommandRuntime({
  queue: enqueueQueue,
  commandLog: enqueueLog,
  cmd: { type: USE, tick: 6, arg0: 1 },
  commandLogMax: 5
});
assert.deepEqual(enqueueQueue, [{ type: USE, tick: 6, arg0: 1 }]);
assert.deepEqual(enqueueLog, [{ type: USE, tick: 6, arg0: 1 }]);

{
  const moveState: AvatarMoveQueueStateRuntime = {
    avatarFacingDx: 0,
    avatarFacingDy: 0,
    avatarWalkAnimUntilMs: -1,
    commandLog: [],
    lastMoveInputDx: 0,
    lastMoveInputDy: 0,
    lastMoveQueueAtMs: -1,
    queue: [],
    sim: { tick: 10 }
  };
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 1,
    dy: 0,
    nowMs: 1000,
    minIntervalMs: 50,
    walkAnimWindowMs: 280,
    commandLogMax: 10
  }), true);
  assert.equal(moveState.avatarFacingDx, 1);
  assert.equal(moveState.avatarWalkAnimUntilMs, 1280);
  assert.deepEqual(moveState.queue, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 1, arg1: 0 }]);
  assert.deepEqual(moveState.commandLog, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 1, arg1: 0 }]);

  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 1,
    dy: 0,
    nowMs: 1010,
    minIntervalMs: 50,
    walkAnimWindowMs: 280,
    commandLogMax: 10
  }), false);
  assert.equal(moveState.queue.length, 1);
  assert.equal(moveState.avatarWalkAnimUntilMs, 1280);

  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 0,
    dy: 1,
    nowMs: 1070,
    minIntervalMs: 50,
    walkAnimWindowMs: 280,
    commandLogMax: 10
  }), true);
  assert.deepEqual(moveState.queue, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 0, arg1: 1 }]);
  assert.deepEqual(moveState.commandLog, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 0, arg1: 1 }]);
  assert.equal(moveState.avatarWalkAnimUntilMs, 1350);

  moveState.sim.tick = 11;
  moveState.queue.push({ tick: 10, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: -1, arg1: 0 });
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: -1,
    dy: 0,
    nowMs: 1200,
    minIntervalMs: 50,
    walkAnimWindowMs: 280,
    commandLogMax: 10
  }), true);
  assert.deepEqual(moveState.queue, [{ tick: 12, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: -1, arg1: 0 }]);
  assert.deepEqual(moveState.commandLog, [
    { tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 0, arg1: 1 },
    { tick: 12, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: -1, arg1: 0 }
  ]);
}

{
  const moveState: AvatarMoveQueueStateRuntime = {
    avatarFacingDx: 0,
    avatarFacingDy: 1,
    avatarWalkAnimUntilMs: 123,
    commandLog: [{ tick: 5, type: USE, arg0: 2, arg1: 3 }],
    lastMoveInputDx: 0,
    lastMoveInputDy: 1,
    lastMoveQueueAtMs: 500,
    queue: [{ tick: 5, type: USE, arg0: 2, arg1: 3 }],
    sim: { tick: 4 }
  };
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 0,
    dy: 0,
    nowMs: 600,
    minIntervalMs: 50,
    commandLogMax: 10
  }), false);
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 1,
    dy: 1,
    nowMs: 600,
    minIntervalMs: 50,
    commandLogMax: 10
  }), false);
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 2,
    dy: 0,
    nowMs: 600,
    minIntervalMs: 50,
    commandLogMax: 10
  }), false);
  assert.deepEqual(moveState, {
    avatarFacingDx: 0,
    avatarFacingDy: 1,
    avatarWalkAnimUntilMs: 123,
    commandLog: [{ tick: 5, type: USE, arg0: 2, arg1: 3 }],
    lastMoveInputDx: 0,
    lastMoveInputDy: 1,
    lastMoveQueueAtMs: 500,
    queue: [{ tick: 5, type: USE, arg0: 2, arg1: 3 }],
    sim: { tick: 4 }
  });
}

{
  const queue: SimCommandRuntime[] = [];
  const commandLog: SimCommandRuntime[] = [];
  queueFacingUseCommandRuntime({
    queue,
    commandLog,
    tick: 20,
    facingDx: -1,
    facingDy: 0,
    commandLogMax: 5
  });
  assert.deepEqual(queue, [{ tick: 21, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING, arg0: -1, arg1: 0 }]);
  assert.deepEqual(commandLog, queue);
}

{
  const queue: SimCommandRuntime[] = [];
  const commandLog: SimCommandRuntime[] = [];
  assert.equal(queueCellCommandRuntime({
    queue,
    commandLog,
    tick: 30,
    commandType: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL,
    wx: 123.9,
    wy: 44.2,
    commandLogMax: 5
  }), true);
  assert.deepEqual(queue, [{ tick: 31, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, arg0: 123, arg1: 44 }]);
  assert.equal(queueCellCommandRuntime({
    queue,
    commandLog,
    tick: 30,
    commandType: 0,
    wx: 1,
    wy: 2,
    commandLogMax: 5
  }), false);
  assert.equal(queue.length, 1);
}

{
  const queue: SimCommandRuntime[] = [];
  const commandLog: SimCommandRuntime[] = [];
  assert.equal(queueLegacyTargetVerbCommandRuntime({
    queue,
    commandLog,
    tick: 40,
    verb: "talk",
    wx: 7,
    wy: 8,
    commandLogMax: 5
  }), true);
  assert.deepEqual(queue, [{ tick: 41, type: LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL, arg0: 7, arg1: 8 }]);
  assert.equal(queueLegacyTargetVerbCommandRuntime({
    queue,
    commandLog,
    tick: 40,
    verb: "invalid",
    wx: 1,
    wy: 2,
    commandLogMax: 5
  }), false);
  assert.equal(queue.length, 1);
}

console.log("queue_runtime_test: ok");

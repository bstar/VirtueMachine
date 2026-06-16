import assert from "node:assert/strict";
import {
  activeTargetCursorKeyActionRuntime,
  applyTargetCursorMouseCommitRuntime,
  beginTargetCursorRuntime,
  cancelTargetCursorRuntime,
  clampTargetCursorToViewRuntime,
  commitTargetCursorRuntime,
  moveTargetCursorRuntime,
  targetCursorCancelledDiagRuntime,
  type TargetCursorStateRuntime
} from "../sim/target_cursor_runtime.ts";
import { moveDeltaFromKeyRuntime } from "../sim/queue_runtime.ts";

function makeState(): TargetCursorStateRuntime {
  return {
    targetVerb: "",
    useCursorActive: false,
    useCursorX: 0,
    useCursorY: 0
  };
}

{
  const state = makeState();
  const result = beginTargetCursorRuntime({
    state,
    world: { map_x: 100, map_y: 200 },
    verb: "talk",
    viewW: 11,
    viewH: 11
  });
  assert.deepEqual(result, {
    diagClass: "diag ok",
    diagText: "Talk: move target with arrows, confirm with Enter/U, cancel with Esc.",
    ok: true
  });
  assert.equal(state.useCursorActive, true);
  assert.equal(state.targetVerb, "talk");
  assert.equal(state.useCursorX, 100);
  assert.equal(state.useCursorY, 200);
}

{
  const state = makeState();
  const result = beginTargetCursorRuntime({
    state,
    world: { map_x: 5, map_y: 6 },
    verb: "get",
    viewW: 11,
    viewH: 11
  });
  assert.deepEqual(result, {
    diagClass: "diag ok",
    diagText: "Get: choose direction with arrow keys, cancel with Esc.",
    ok: true
  });
}

{
  const state = makeState();
  const result = beginTargetCursorRuntime({
    state,
    world: { map_x: 5, map_y: 6 },
    verb: "invalid",
    viewW: 11,
    viewH: 11
  });
  assert.deepEqual(result, { ok: false, diagText: "" });
  assert.equal(state.useCursorActive, false);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "talk",
    useCursorActive: true,
    useCursorX: 999,
    useCursorY: 999
  };
  clampTargetCursorToViewRuntime({
    state,
    world: { map_x: 100, map_y: 100 },
    viewW: 11,
    viewH: 11
  });
  assert.equal(state.useCursorX, 105);
  assert.equal(state.useCursorY, 105);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "talk",
    useCursorActive: true,
    useCursorX: 10,
    useCursorY: 10
  };
  const moved = moveTargetCursorRuntime({
    state,
    world: { map_x: 10, map_y: 10 },
    dx: 3,
    dy: 2,
    viewW: 11,
    viewH: 11
  });
  assert.deepEqual(moved, { shouldCommit: false });
  assert.equal(state.useCursorX, 13);
  assert.equal(state.useCursorY, 12);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "get",
    useCursorActive: true,
    useCursorX: 10,
    useCursorY: 10
  };
  const moved = moveTargetCursorRuntime({
    state,
    world: { map_x: 10, map_y: 10 },
    dx: -1,
    dy: 0,
    viewW: 11,
    viewH: 11
  });
  assert.deepEqual(moved, { shouldCommit: true });
  assert.equal(state.useCursorX, 9);
  assert.equal(state.useCursorY, 10);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "look",
    useCursorActive: true,
    useCursorX: 1,
    useCursorY: 2
  };
  assert.equal(cancelTargetCursorRuntime(state), true);
  assert.equal(state.useCursorActive, false);
  assert.equal(state.targetVerb, "");
  assert.equal(cancelTargetCursorRuntime(state), false);
}
assert.deepEqual(targetCursorCancelledDiagRuntime(), {
  diagClass: "diag ok",
  diagText: "Targeting cancelled."
});

{
  const state = makeState();
  assert.deepEqual(commitTargetCursorRuntime(state), { kind: "none" });
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "",
    useCursorActive: true,
    useCursorX: 12,
    useCursorY: 34
  };
  assert.deepEqual(commitTargetCursorRuntime(state), {
    kind: "interact",
    x: 12,
    y: 34
  });
  assert.equal(state.useCursorActive, false);
  assert.equal(state.targetVerb, "");
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "talk",
    useCursorActive: true,
    useCursorX: 12,
    useCursorY: 34
  };
  assert.deepEqual(commitTargetCursorRuntime(state), {
    kind: "legacy_verb",
    verb: "talk",
    x: 12,
    y: 34
  });
  assert.equal(state.useCursorActive, false);
  assert.equal(state.targetVerb, "");
}

{
  const state = makeState();
  assert.deepEqual(applyTargetCursorMouseCommitRuntime(state, { x: 3, y: 4 }, { x: 9, y: 10 }), { kind: "none" });
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "look",
    useCursorActive: true,
    useCursorX: 0,
    useCursorY: 0
  };
  assert.deepEqual(applyTargetCursorMouseCommitRuntime(state, { x: 3, y: 4 }, { x: 9, y: 10 }), {
    kind: "commit",
    x: 3,
    y: 4
  });
  assert.equal(state.useCursorX, 3);
  assert.equal(state.useCursorY, 4);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "get",
    useCursorActive: true,
    useCursorX: 0,
    useCursorY: 0
  };
  assert.deepEqual(applyTargetCursorMouseCommitRuntime(state, { x: 3, y: 4 }, { x: 9, y: 10 }), {
    kind: "commit",
    x: 9,
    y: 10
  });
  assert.equal(state.useCursorX, 9);
  assert.equal(state.useCursorY, 10);
}

{
  const state: TargetCursorStateRuntime = {
    targetVerb: "get",
    useCursorActive: true,
    useCursorX: 0,
    useCursorY: 0
  };
  assert.deepEqual(applyTargetCursorMouseCommitRuntime(state, { x: 3, y: 4 }, null), {
    kind: "commit",
    x: 3,
    y: 4
  });
  assert.equal(state.useCursorX, 3);
  assert.equal(state.useCursorY, 4);
}

assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: "ArrowUp" }, moveDeltaFromKeyRuntime), {
  kind: "move",
  dx: 0,
  dy: -1
});
assert.deepEqual(activeTargetCursorKeyActionRuntime({ code: "Numpad9" }, moveDeltaFromKeyRuntime), {
  kind: "move",
  dx: 1,
  dy: -1
});
assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: "u" }, moveDeltaFromKeyRuntime), { kind: "commit" });
assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: "Enter" }, moveDeltaFromKeyRuntime), { kind: "commit" });
assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: " " }, moveDeltaFromKeyRuntime), { kind: "commit" });
assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: "Escape" }, moveDeltaFromKeyRuntime), { kind: "cancel" });
assert.deepEqual(activeTargetCursorKeyActionRuntime({ key: "x" }, moveDeltaFromKeyRuntime), { kind: "none" });

console.log("target_cursor_runtime_test: ok");

import assert from "node:assert/strict";
import {
  applyStartupMenuIndexRuntime,
  journeyOnwardStartedDiagRuntime,
  normalizeStartupMenuIndexRuntime,
  startupAssetsReadyDiagRuntime,
  startupMenuIndexAtLogicalPosRuntime,
  startupMenuIndexAtSurfacePointRuntime,
  startupMenuItemEnabledRuntime,
  startupMenuKeyActionRuntime,
  startupMenuKeyPatchRuntime,
  startupMenuSelectionActionRuntime,
  startupMenuSelectionPresentationRuntime,
  startupSessionGuardDiagRuntime,
  startupRuntimeModeTextRuntime
} from "../ui/startup_runtime.ts";

assert.equal(normalizeStartupMenuIndexRuntime(-1, 5), 4);
assert.equal(normalizeStartupMenuIndexRuntime(5, 5), 0);
assert.equal(normalizeStartupMenuIndexRuntime(2, 5), 2);
assert.equal(normalizeStartupMenuIndexRuntime(2, 0), 0);
{
  let clearCount = 0;
  const state = {
    startupCanvasCache: {
      clear() {
        clearCount += 1;
      }
    },
    startupMenuIndex: 1
  };
  assert.deepEqual(applyStartupMenuIndexRuntime(state, 1, 5), {
    changed: false,
    nextIndex: 1,
    previousIndex: 1
  });
  assert.equal(clearCount, 0);
  assert.deepEqual(applyStartupMenuIndexRuntime(state, 5, 5), {
    changed: true,
    nextIndex: 0,
    previousIndex: 1
  });
  assert.equal(clearCount, 1);
  assert.equal(state.startupMenuIndex, 0);
  assert.deepEqual(applyStartupMenuIndexRuntime(state, -1, 5), {
    changed: true,
    nextIndex: 4,
    previousIndex: 0
  });
  assert.equal(clearCount, 2);
}

assert.deepEqual(startupMenuKeyActionRuntime("ArrowUp"), { kind: "move", delta: -1 });
assert.deepEqual(startupMenuKeyActionRuntime("ArrowDown"), { kind: "move", delta: 1 });
assert.deepEqual(startupMenuKeyActionRuntime("i"), { kind: "select_index", index: 0 });
assert.deepEqual(startupMenuKeyActionRuntime("c"), { kind: "select_index", index: 1 });
assert.deepEqual(startupMenuKeyActionRuntime("t"), { kind: "select_index", index: 2 });
assert.deepEqual(startupMenuKeyActionRuntime("a"), { kind: "select_index", index: 3 });
assert.deepEqual(startupMenuKeyActionRuntime("j"), { kind: "select_index", index: 4 });
assert.deepEqual(startupMenuKeyActionRuntime("Enter"), { kind: "select_current" });
assert.deepEqual(startupMenuKeyActionRuntime(" "), { kind: "select_current" });
assert.deepEqual(startupMenuKeyActionRuntime("x"), { kind: "none" });
assert.deepEqual(startupMenuKeyPatchRuntime({ currentIndex: 0, key: "ArrowUp", menuCount: 5 }), {
  activateSelection: false,
  handled: true,
  nextIndex: 4
});
assert.deepEqual(startupMenuKeyPatchRuntime({ currentIndex: 4, key: "ArrowDown", menuCount: 5 }), {
  activateSelection: false,
  handled: true,
  nextIndex: 0
});
assert.deepEqual(startupMenuKeyPatchRuntime({ currentIndex: 0, key: "j", menuCount: 5 }), {
  activateSelection: true,
  handled: true,
  nextIndex: 4
});
assert.deepEqual(startupMenuKeyPatchRuntime({ currentIndex: 2, key: "Enter", menuCount: 5 }), {
  activateSelection: true,
  handled: true,
  nextIndex: null
});
assert.deepEqual(startupMenuKeyPatchRuntime({ currentIndex: 2, key: "x", menuCount: 5 }), {
  activateSelection: false,
  handled: false,
  nextIndex: null
});

const hitbox = {
  x0: 10,
  x1: 100,
  rows: [[10, 20], [30, 40], [50, 60]] as Array<[number, number]>
};
assert.equal(startupMenuIndexAtLogicalPosRuntime(50, 15, hitbox), 0);
assert.equal(startupMenuIndexAtLogicalPosRuntime(50, 35, hitbox), 1);
assert.equal(startupMenuIndexAtLogicalPosRuntime(5, 15, hitbox), -1);
assert.equal(startupMenuIndexAtLogicalPosRuntime(50, 25, hitbox), -1);

assert.equal(startupMenuIndexAtSurfacePointRuntime(
  50,
  35,
  { left: 0, top: 0, width: 100, height: 100 },
  { width: 100, height: 100 },
  hitbox
), 1);
assert.equal(startupMenuIndexAtSurfacePointRuntime(
  20,
  30,
  { left: 0, top: 0, width: 0, height: 100 },
  { width: 100, height: 100 },
  hitbox
), -1);

assert.equal(startupMenuItemEnabledRuntime({ id: "journey", enabled: true }, true), true);
assert.equal(startupMenuItemEnabledRuntime({ id: "journey", enabled: true }, false), false);
assert.equal(startupMenuItemEnabledRuntime({ id: "docs", enabled: true }, false), true);
assert.equal(startupMenuItemEnabledRuntime({ id: "docs", enabled: false }, true), false);
assert.equal(startupMenuItemEnabledRuntime(null, true), false);

const menu = [
  { id: "intro", label: "Introduction", enabled: false },
  { id: "journey", label: "Journey Onward", enabled: true },
  { id: "credits", label: "Credits", enabled: true }
];
assert.deepEqual(startupMenuSelectionActionRuntime([], 0, true), { kind: "none" });
assert.deepEqual(startupMenuSelectionActionRuntime(menu, 0, true), {
  kind: "unavailable",
  message: "\"Introduction\" is not available in this build."
});
assert.deepEqual(startupMenuSelectionActionRuntime(menu, 1, false), {
  kind: "login_required",
  message: "Login required before Journey Onward."
});
assert.deepEqual(startupMenuSelectionActionRuntime(menu, 1, true), { kind: "start_session" });
assert.deepEqual(startupMenuSelectionActionRuntime(menu, 2, true), { kind: "none" });
assert.deepEqual(startupMenuSelectionPresentationRuntime({ kind: "none" }), { kind: "none" });
assert.deepEqual(startupMenuSelectionPresentationRuntime({ kind: "start_session" }), { kind: "start_session" });
assert.deepEqual(startupMenuSelectionPresentationRuntime({
  kind: "login_required",
  message: "Login required before Journey Onward."
}), {
  diagClass: "diag warn",
  diagText: "Login required before Journey Onward.",
  kind: "message",
  netStatus: "idle"
});
assert.deepEqual(startupMenuSelectionPresentationRuntime({
  kind: "unavailable",
  message: "\"Introduction\" is not available in this build."
}), {
  diagClass: "diag warn",
  diagText: "\"Introduction\" is not available in this build.",
  kind: "message"
});
assert.deepEqual(journeyOnwardStartedDiagRuntime(true), {
  diagClass: "diag ok",
  diagText: "Journey Onward: resumed at last saved position."
});
assert.deepEqual(journeyOnwardStartedDiagRuntime(false), {
  diagClass: "diag ok",
  diagText: "Journey Onward: loaded at the legacy avatar start position."
});
assert.deepEqual(startupSessionGuardDiagRuntime("login_required"), {
  diagClass: "diag warn",
  diagText: "Login required before Journey Onward.",
  netStatus: "idle"
});
assert.deepEqual(startupSessionGuardDiagRuntime("runtime_loading"), {
  diagClass: "diag warn",
  diagText: "Runtime assets are still loading."
});
assert.equal(startupRuntimeModeTextRuntime("ash", []), "ash");
assert.equal(startupRuntimeModeTextRuntime("ash", ["extra", "", "debug"]), "ash + extra,debug");
assert.equal(startupRuntimeModeTextRuntime("", []), "default");
assert.deepEqual(startupAssetsReadyDiagRuntime({
  hasMapContext: {},
  profile: "ash",
  runtimeExtensions: ["debug"]
}), {
  diagClass: "diag ok",
  diagText: "Startup menu ready (ash + debug): select Journey Onward to enter the throne room."
});
assert.deepEqual(startupAssetsReadyDiagRuntime({
  hasMapContext: null,
  profile: "ash",
  runtimeExtensions: []
}), {
  diagClass: "diag warn",
  diagText: "Assets missing (ash): startup menu running in fallback mode."
});

console.log("ui_startup_runtime_test: ok");

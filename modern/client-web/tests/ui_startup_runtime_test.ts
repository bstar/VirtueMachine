import assert from "node:assert/strict";
import {
  applyStartupMenuIndexRuntime,
  bindSkipIntroPreferenceRuntime,
  buildStartupMenuRenderPlanRuntime,
  buildStartupScreenRenderPlanRuntime,
  journeyOnwardStartedDiagRuntime,
  normalizeStartupMenuIndexRuntime,
  shouldStartSessionFromSkipIntroRuntime,
  startupAssetsReadyDiagRuntime,
  startupMenuIndexAtLogicalPosRuntime,
  startupMenuIndexAtSurfacePointRuntime,
  startupMenuItemEnabledRuntime,
  startupMenuKeyActionRuntime,
  startupMenuKeyPatchRuntime,
  startupMenuSelectionActionRuntime,
  startupMenuSelectionPresentationRuntime,
  startupCachedCanvasRuntime,
  startupSessionGuardDiagRuntime,
  startupRuntimeModeTextRuntime,
  writeSkipIntroPreferenceRuntime
} from "../ui/startup_runtime.ts";

type StartupTestListener = {
  current?: () => void;
};

assert.equal(normalizeStartupMenuIndexRuntime(-1, 5), 4);
assert.equal(normalizeStartupMenuIndexRuntime(5, 5), 0);
assert.equal(normalizeStartupMenuIndexRuntime(2, 5), 2);
assert.equal(normalizeStartupMenuIndexRuntime(2, 0), 0);
{
  const cachedCanvas = { id: "cached" };
  const cache = new Map<string, { id: string } | null>([["sprite", cachedCanvas]]);
  let createCount = 0;
  assert.equal(startupCachedCanvasRuntime({
    cache,
    cacheKey: "sprite",
    createCanvas: () => {
      createCount += 1;
      return { id: "new" };
    }
  }), cachedCanvas);
  assert.equal(createCount, 0);
}
{
  const cache = new Map<string, { id: string } | null>();
  const created = startupCachedCanvasRuntime({
    cache,
    cacheKey: "sprite",
    createCanvas: () => ({ id: "new" })
  });
  assert.deepEqual(created, { id: "new" });
  assert.deepEqual(cache.get("sprite"), { id: "new" });
}
{
  const cache = new Map<string, { id: string } | null>();
  let createCount = 0;
  assert.equal(startupCachedCanvasRuntime({
    cache,
    cacheKey: "missing",
    createCanvas: () => {
      createCount += 1;
      return null;
    }
  }), null);
  assert.equal(startupCachedCanvasRuntime({
    cache,
    cacheKey: "missing",
    createCanvas: () => {
      createCount += 1;
      return { id: "late" };
    }
  }), null);
  assert.equal(createCount, 1);
}
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

assert.deepEqual(buildStartupScreenRenderPlanRuntime({
  bootIntroActive: false,
  canvasW: 704,
  legacyPreviewEnabled: false
}), {
  legacyPreview: null,
  mainLayer: "startup_menu",
  mainScale: 2
});
assert.deepEqual(buildStartupScreenRenderPlanRuntime({
  bootIntroActive: true,
  canvasW: 960,
  legacyBackdropBaseH: 400,
  legacyBackdropBaseW: 640,
  legacyBackdropH: 400,
  legacyBackdropW: 640,
  legacyPreviewEnabled: true
}), {
  legacyPreview: {
    backdropH: 400,
    backdropW: 640,
    layer: "boot_intro",
    restoreBase: true,
    scale: 2,
    viewport: {
      destH: 160,
      destW: 160,
      destX: 0,
      destY: 0,
      sourceH: 320,
      sourceW: 320,
      sourceX: 16,
      sourceY: 16
    }
  },
  mainLayer: "boot_intro",
  mainScale: 3
});
assert.deepEqual(buildStartupScreenRenderPlanRuntime({
  bootIntroActive: false,
  canvasW: 0,
  legacyBackdropBaseH: 300,
  legacyBackdropBaseW: 640,
  legacyBackdropH: 400,
  legacyBackdropW: 640,
  legacyPreviewEnabled: true
})?.legacyPreview?.restoreBase, false);
assert.equal(buildStartupScreenRenderPlanRuntime({
  canvasW: 320,
  legacyBackdropH: 0,
  legacyBackdropW: 640,
  legacyPreviewEnabled: true
}).legacyPreview, null);

const menu = [
  { id: "intro", label: "Introduction", enabled: false },
  { id: "journey", label: "Journey Onward", enabled: true },
  { id: "credits", label: "Credits", enabled: true }
];
{
  const plan = buildStartupMenuRenderPlanRuntime({
    hasStartupArt: true,
    isAuthenticated: false,
    menu,
    scale: 2,
    selectedIndex: 1,
    slotTileId: 0x19a
  });
  assert.equal(plan.useStartupArt, true);
  assert.deepEqual(plan.clear, { fillStyle: "#000000", x: 0, y: 0, w: 640, h: 400 });
  assert.deepEqual(plan.artSprites, [
    { key: "title", x: 0x13 * 2, y: 0 },
    { key: "subtitle", x: 0x3b * 2, y: 0x2f * 2 },
    { key: "menu", x: 0x31 * 2, y: 0x53 * 2 }
  ]);
  assert.equal(plan.tiles.length, 0);
  assert.equal(plan.texts.length, 0);
}
{
  const plan = buildStartupMenuRenderPlanRuntime({
    hasStartupArt: false,
    hudTextColor: "#8b3f24",
    isAuthenticated: false,
    menu,
    scale: 2,
    selectedIndex: 1,
    slotTileId: 0x19a
  });
  assert.equal(plan.useStartupArt, false);
  assert.equal(plan.tiles.length, 60);
  assert.deepEqual(plan.tiles.slice(0, 4), [
    { tileId: 0x19a, x: 0, y: 0, scale: 2 },
    { tileId: 0x19a, x: 0, y: 368, scale: 2 },
    { tileId: 0x19a, x: 32, y: 0, scale: 2 },
    { tileId: 0x19a, x: 32, y: 368, scale: 2 }
  ]);
  assert.deepEqual(plan.rects[1], {
    fillStyle: "#5f2e1d",
    x: 124,
    y: 188,
    w: 392,
    h: 32
  });
  assert.deepEqual(plan.strokes[1], {
    fillStyle: "",
    strokeStyle: "#d7b981",
    x: 124.5,
    y: 188.5,
    w: 391,
    h: 31
  });
  assert.deepEqual(plan.texts.slice(0, 5), [
    { text: "ULTIMA VI", x: 224, y: 60, scale: 2, color: "#8b3f24" },
    { text: "THE FALSE PROPHET", x: 188, y: 88, scale: 2, color: "#8b3f24" },
    { text: "Introduction", x: 172, y: 156, scale: 2, color: "#76644a" },
    { text: ">>", x: 136, y: 196, scale: 2, color: "#f2dfb6" },
    { text: "Journey Onward", x: 172, y: 196, scale: 2, color: "#76644a" }
  ]);
  assert.deepEqual(plan.texts.at(-1), {
    text: "Use ARROWS + ENTER",
    x: 196,
    y: 324,
    scale: 2,
    color: "#8e7a55"
  });
}
{
  const plan = buildStartupMenuRenderPlanRuntime({
    hasStartupArt: false,
    isAuthenticated: true,
    menu,
    scale: 1,
    selectedIndex: 1,
    slotTileId: 0x19a
  });
  assert.equal(plan.texts.find((text) => text.text === "Journey Onward")?.color, "#f2dfb6");
}
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
{
  const checkbox = { checked: false };
  const storage = {
    data: {} as Record<string, string>,
    setItem(key: string, value: string) {
      this.data[key] = value;
    }
  };
  assert.deepEqual(writeSkipIntroPreferenceRuntime({
    checkbox,
    enabled: true,
    key: "skip",
    storage
  }), {
    enabled: true,
    stored: true,
    value: "on"
  });
  assert.equal(checkbox.checked, true);
  assert.equal(storage.data.skip, "on");
}
{
  const checkbox = { checked: true };
  assert.deepEqual(writeSkipIntroPreferenceRuntime({
    checkbox,
    enabled: false,
    key: "skip",
    storage: {
      setItem() {
        throw new Error("blocked");
      }
    }
  }), {
    enabled: false,
    stored: false,
    value: "off"
  });
  assert.equal(checkbox.checked, false);
}
assert.equal(shouldStartSessionFromSkipIntroRuntime({
  isAuthenticated: true,
  runtimeReady: true,
  sessionStarted: false,
  skipIntroEnabled: true
}), true);
assert.equal(shouldStartSessionFromSkipIntroRuntime({
  isAuthenticated: false,
  runtimeReady: true,
  sessionStarted: false,
  skipIntroEnabled: true
}), false);
assert.equal(shouldStartSessionFromSkipIntroRuntime({
  isAuthenticated: true,
  runtimeReady: false,
  sessionStarted: false,
  skipIntroEnabled: true
}), false);
assert.equal(shouldStartSessionFromSkipIntroRuntime({
  isAuthenticated: true,
  runtimeReady: true,
  sessionStarted: true,
  skipIntroEnabled: true
}), false);
assert.equal(shouldStartSessionFromSkipIntroRuntime({
  isAuthenticated: true,
  runtimeReady: true,
  sessionStarted: false,
  skipIntroEnabled: false
}), false);
{
  const calls: boolean[] = [];
  const listener: StartupTestListener = {};
  let maybeStartCount = 0;
  const checkbox = {
    checked: false,
    addEventListener(type: "change", fn: () => void) {
      assert.equal(type, "change");
      listener.current = fn;
    }
  };
  assert.deepEqual(bindSkipIntroPreferenceRuntime({
    checkbox,
    key: "skip",
    onMaybeStart: () => {
      maybeStartCount += 1;
    },
    setEnabled: (enabled) => {
      calls.push(enabled);
      checkbox.checked = enabled;
    }
  }), {
    bound: true,
    initialEnabled: true
  });
  assert.deepEqual(calls, [true]);
  checkbox.checked = false;
  assert(listener.current, "skip-intro preference listener should be bound");
  listener.current();
  assert.deepEqual(calls, [true, false]);
  assert.equal(maybeStartCount, 0);
  checkbox.checked = true;
  listener.current();
  assert.deepEqual(calls, [true, false, true]);
  assert.equal(maybeStartCount, 1);
}

console.log("ui_startup_runtime_test: ok");

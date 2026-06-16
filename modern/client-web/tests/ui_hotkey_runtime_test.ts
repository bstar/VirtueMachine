import assert from "node:assert/strict";
import {
  debugHotkeyActionRuntime,
  helpPanelToggleDiagRuntime,
  legacyHudHitDiagRuntime,
  legacyHudLayerDiagRuntime,
  legacyHudHitTextRuntime,
  legacyHudLayerTextRuntime,
  netLoginHotkeyFailedDiagRuntime,
  netLoginHotkeyOkDiagRuntime,
  runDebugHotkeyActionRuntime,
  toggleHelpPanelRuntime,
  versionStringHotkeyDiagRuntime,
  worldSnapshotLoadFailedHotkeyDiagRuntime,
  worldSnapshotLoadedHotkeyDiagRuntime,
  worldSnapshotSaveFailedHotkeyDiagRuntime,
  worldSnapshotSavedHotkeyDiagRuntime
} from "../ui/hotkey_runtime.ts";

assert.equal(debugHotkeyActionRuntime({ ctrlKey: true, key: "s" }), "save_snapshot");
assert.equal(debugHotkeyActionRuntime({ ctrlKey: true, key: "r" }), "load_snapshot");
assert.equal(debugHotkeyActionRuntime({ ctrlKey: true, key: "z" }), "toggle_sound");
assert.equal(debugHotkeyActionRuntime({ ctrlKey: true, key: "h" }), "toggle_help");
assert.equal(debugHotkeyActionRuntime({ ctrlKey: true, key: "v" }), "version_string");
assert.equal(debugHotkeyActionRuntime({ key: "j" }), "none");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "i" }), "login_logout");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "y" }), "save_snapshot");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "u" }), "load_snapshot");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "j" }), "capture_probe");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "k" }), "toggle_legacy_hud");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "l" }), "cycle_probe_mode");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "n" }), "critical_maintenance");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "p" }), "capture_viewport");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, altKey: true, key: "p" }), "capture_worldhud");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "o" }), "toggle_overlay");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "f" }), "toggle_animation");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "b" }), "toggle_palette_fx");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "m" }), "toggle_movement");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "g" }), "jump_preset");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "r" }), "reset_run");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, key: "v" }), "verify_replay");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, code: "Comma" }), "cursor_prev");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, code: "Period" }), "cursor_next");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, code: "BracketLeft" }), "legacy_scale_prev");
assert.equal(debugHotkeyActionRuntime({ shiftKey: true, code: "BracketRight" }), "legacy_scale_next");

{
  const calls: string[] = [];
  assert.equal(runDebugHotkeyActionRuntime("none", { save_snapshot: () => calls.push("save") }), false);
  assert.deepEqual(calls, []);
  assert.equal(runDebugHotkeyActionRuntime("load_snapshot", { save_snapshot: () => calls.push("save") }), false);
  assert.deepEqual(calls, []);
  assert.equal(runDebugHotkeyActionRuntime("save_snapshot", { save_snapshot: () => calls.push("save") }), true);
  assert.deepEqual(calls, ["save"]);
}

assert.equal(legacyHudLayerTextRuntime(true), "Legacy HUD layer hidden (deviation mode).");
assert.equal(legacyHudLayerTextRuntime(false), "Legacy HUD layer visible.");
assert.deepEqual(legacyHudLayerDiagRuntime(true), {
  diagClass: "diag ok",
  diagText: "Legacy HUD layer hidden (deviation mode)."
});
assert.deepEqual(legacyHudLayerDiagRuntime(false), {
  diagClass: "diag ok",
  diagText: "Legacy HUD layer visible."
});
assert.equal(
  legacyHudHitTextRuntime({ kind: "inventory", index: 2 }),
  "Legacy HUD: inventory cell 2 (C_155D_1267)."
);
assert.equal(legacyHudHitTextRuntime({ kind: "portrait" }), "Legacy HUD: portrait cell (C_155D_1267).");
assert.equal(
  legacyHudHitTextRuntime({ kind: "equip", slot: 3 }),
  "Legacy HUD: equipment slot 3 (C_155D_130E)."
);
assert.deepEqual(legacyHudHitDiagRuntime({ kind: "inventory", index: 2 }), {
  diagClass: "diag ok",
  diagText: "Legacy HUD: inventory cell 2 (C_155D_1267)."
});
assert.deepEqual(helpPanelToggleDiagRuntime(true), {
  diagClass: "diag ok",
  diagText: "Help hidden."
});
assert.deepEqual(helpPanelToggleDiagRuntime(false), {
  diagClass: "diag ok",
  diagText: "Help visible."
});
assert.equal(toggleHelpPanelRuntime(null), null);
{
  const classes = new Set<string>(["hidden"]);
  const panel = {
    classList: {
      contains: (token: string) => classes.has(token),
      toggle: (token: string) => {
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      }
    }
  };
  assert.deepEqual(toggleHelpPanelRuntime(panel), {
    diagClass: "diag ok",
    diagText: "Help visible."
  });
  assert.equal(classes.has("hidden"), false);
  assert.deepEqual(toggleHelpPanelRuntime(panel), {
    diagClass: "diag ok",
    diagText: "Help hidden."
  });
  assert.equal(classes.has("hidden"), true);
}
assert.deepEqual(versionStringHotkeyDiagRuntime(), {
  diagClass: "diag ok",
  diagText: "VirtueMachine: legacy Ctrl+V key mapped (version string TBD)."
});
assert.deepEqual(netLoginHotkeyOkDiagRuntime("rhy", "Avatar"), {
  diagClass: "diag ok",
  diagText: "Net login ok: rhy/Avatar"
});
assert.deepEqual(netLoginHotkeyFailedDiagRuntime("bad password"), {
  diagClass: "diag warn",
  diagText: "Net login failed: bad password",
  statusLevel: "error",
  statusText: "Login failed: bad password"
});
assert.deepEqual(worldSnapshotSavedHotkeyDiagRuntime(123), {
  diagClass: "diag ok",
  diagText: "World snapshot saved at tick 123."
});
assert.deepEqual(worldSnapshotSaveFailedHotkeyDiagRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "World save failed: offline",
  statusLevel: "error",
  statusText: "Save failed: offline"
});
assert.deepEqual(worldSnapshotLoadedHotkeyDiagRuntime(456), {
  diagClass: "diag ok",
  diagText: "World snapshot loaded at tick 456."
});
assert.deepEqual(worldSnapshotLoadFailedHotkeyDiagRuntime("missing"), {
  diagClass: "diag warn",
  diagText: "World load failed: missing",
  statusLevel: "error",
  statusText: "Load failed: missing"
});

console.log("ui_hotkey_runtime_test: ok");

import assert from "node:assert/strict";
import {
  applyNetPanelInitialStateRuntime,
  bindNetPanelModalButtonsRuntime,
  loadNetPanelPrefs,
  netPanelInitialStateFromPrefsRuntime,
  persistNetLoginSettings,
  saveNetPanelPref
} from "../net/panel_runtime.ts";

const stored = new Map<string, string>();
globalThis.localStorage = {
  getItem(key: string) {
    return stored.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    stored.set(key, String(value));
  },
  removeItem(key: string) {
    stored.delete(key);
  },
  clear() {
    stored.clear();
  },
  key(index: number) {
    return Array.from(stored.keys())[index] ?? null;
  },
  get length() {
    return stored.size;
  }
};

const keys = {
  apiBase: "api",
  username: "username",
  password: "password",
  email: "email",
  passwordVisible: "passwordVisible",
  characterName: "character",
  maintenance: "maintenance",
  autoLogin: "autoLogin"
};

const defaults = {
  apiBase: "http://127.0.0.1:8081",
  username: "avatar",
  password: "quest123",
  email: "",
  passwordVisible: "off" as const,
  characterName: "Avatar",
  maintenance: "off" as const,
  autoLogin: "off" as const
};

stored.clear();
assert.deepEqual(loadNetPanelPrefs(keys, defaults), defaults);

stored.clear();
stored.set("api", "http://server");
stored.set("username", "rhy");
stored.set("email", "rhy@example.test");
stored.set("passwordVisible", "on");
stored.set("character", "Rhyguy");
stored.set("maintenance", "on");
stored.set("autoLogin", "on");
assert.deepEqual(loadNetPanelPrefs(keys, defaults), {
  apiBase: "http://server",
  username: "rhy",
  password: "quest123",
  email: "rhy@example.test",
  passwordVisible: "on",
  characterName: "Rhyguy",
  maintenance: "on",
  autoLogin: "on"
});

assert.deepEqual(netPanelInitialStateFromPrefsRuntime({
  ...defaults,
  apiBase: "http://server",
  username: "rhy",
  email: "rhy@example.test",
  characterName: "Rhyguy",
  maintenance: "on"
}), {
  apiBase: "http://server",
  username: "rhy",
  email: "rhy@example.test",
  characterName: "Rhyguy",
  maintenanceAuto: true
});

assert.deepEqual(netPanelInitialStateFromPrefsRuntime({
  ...defaults,
  characterName: "",
  maintenance: "off"
}), {
  apiBase: "http://127.0.0.1:8081",
  username: "avatar",
  email: "",
  characterName: "Avatar",
  maintenanceAuto: false
});

{
  const stateNet = {
    apiBase: "",
    username: "",
    email: "",
    characterName: "",
    maintenanceAuto: false
  };
  const maintenanceToggle = { value: "" };
  assert.deepEqual(applyNetPanelInitialStateRuntime({
    prefs: {
      ...defaults,
      apiBase: "http://server",
      username: "rhy",
      email: "rhy@example.test",
      characterName: "Rhyguy",
      maintenance: "on"
    },
    stateNet,
    maintenanceToggle
  }), {
    apiBase: "http://server",
    username: "rhy",
    email: "rhy@example.test",
    characterName: "Rhyguy",
    maintenanceAuto: true
  });
  assert.deepEqual(stateNet, {
    apiBase: "http://server",
    username: "rhy",
    email: "rhy@example.test",
    characterName: "Rhyguy",
    maintenanceAuto: true
  });
  assert.equal(maintenanceToggle.value, "on");
}

{
  const listeners: Record<string, () => void> = {};
  const button = (name: string) => ({
    addEventListener(type: "click", listener: () => void) {
      listeners[`${name}:${type}`] = listener;
    }
  });
  const events: string[] = [];
  assert.deepEqual(bindNetPanelModalButtonsRuntime({
    openButton: button("open"),
    closeButton: button("close"),
    backdrop: button("backdrop"),
    onBeforeOpen: () => events.push("refresh"),
    setOpen: (open) => events.push(open ? "open" : "close")
  }), {
    boundBackdrop: true,
    boundClose: true,
    boundOpen: true
  });
  listeners["open:click"]?.();
  listeners["close:click"]?.();
  listeners["backdrop:click"]?.();
  assert.deepEqual(events, ["refresh", "open", "close", "close"]);
}

stored.clear();
saveNetPanelPref("api", "http://saved");
persistNetLoginSettings(keys, {
  apiBase: "http://persisted",
  username: "avatar",
  characterName: "Avatar",
  email: "avatar@example.test"
});
assert.equal(stored.get("api"), "http://persisted");
assert.equal(stored.get("username"), "avatar");
assert.equal(stored.get("character"), "Avatar");
assert.equal(stored.get("email"), "avatar@example.test");

console.log("net_panel_runtime_test: ok");

import assert from "node:assert/strict";
import {
  applyNetPanelPrefsToControlsRuntime,
  applySelectedAccountProfileRuntime,
  bindAccountProfileSelectionRuntime,
  bindNetPanelPrefPersistenceRuntime
} from "../net/panel_bindings_runtime.ts";
import { profileKey, type NetProfile } from "../net/profile_runtime.ts";

type Listener = () => void;
type FakeControl = {
  checked: boolean;
  listeners: Record<string, Listener[]>;
  textContent: string;
  title: string;
  type: string;
  value: string;
  addEventListener: (event: string, listener: Listener) => void;
  dispatch: (event: string) => void;
};

function fakeControl(init: Partial<FakeControl> = {}): FakeControl {
  const control: FakeControl = {
    checked: false,
    listeners: {},
    textContent: "",
    title: "",
    type: "text",
    value: "",
    addEventListener(event, listener) {
      (control.listeners[event] ??= []).push(listener);
    },
    dispatch(event) {
      for (const listener of control.listeners[event] || []) {
        listener();
      }
    },
    ...init
  };
  return control;
}

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

const profiles: NetProfile[] = [
  { apiBase: "http://one", username: "avatar", password: "", characterName: "Avatar", email: "" },
  { apiBase: "http://two", username: "dupre", password: "", characterName: "Dupre", email: "" }
];

const selected: {
  current?: NetProfile;
} = {};
const accountSelect = {
  value: profileKey(profiles[1])
} as HTMLSelectElement;

applySelectedAccountProfileRuntime({
  accountSelect,
  loadProfiles: () => profiles,
  profileKey,
  applyProfile: (profile) => { selected.current = profile; }
});

assert.equal(selected.current?.username, "dupre");

{
  const apiBaseInput = fakeControl();
  const usernameInput = fakeControl();
  const passwordInput = fakeControl();
  const passwordToggleButton = fakeControl();
  const emailInput = fakeControl();
  const characterNameInput = fakeControl();
  const autoLoginCheckbox = fakeControl();
  applyNetPanelPrefsToControlsRuntime({
    apiBase: "http://server",
    username: "iolo",
    password: "secret",
    email: "iolo@example.test",
    passwordVisible: "on",
    characterName: "Iolo",
    autoLogin: "on"
  }, {
    apiBaseInput: apiBaseInput as unknown as HTMLInputElement,
    usernameInput: usernameInput as unknown as HTMLInputElement,
    passwordInput: passwordInput as unknown as HTMLInputElement,
    passwordToggleButton: passwordToggleButton as unknown as HTMLButtonElement,
    emailInput: emailInput as unknown as HTMLInputElement,
    characterNameInput: characterNameInput as unknown as HTMLInputElement,
    autoLoginCheckbox: autoLoginCheckbox as unknown as HTMLInputElement
  });
  assert.equal(apiBaseInput.value, "http://server");
  assert.equal(usernameInput.value, "iolo");
  assert.equal(passwordInput.value, "secret");
  assert.equal(passwordInput.type, "text");
  assert.equal(passwordToggleButton.textContent, "Hide");
  assert.equal(emailInput.value, "iolo@example.test");
  assert.equal(characterNameInput.value, "Iolo");
  assert.equal(autoLoginCheckbox.checked, true);
}

{
  stored.clear();
  const passwordInput = fakeControl({ type: "password" });
  const passwordToggleButton = fakeControl();
  const autoLoginCheckbox = fakeControl({ checked: false });
  const maintenanceToggle = fakeControl({ value: "off" });
  const statuses: string[] = [];
  const maintenanceStates: boolean[] = [];
  bindNetPanelPrefPersistenceRuntime({
    controls: {
      passwordInput: passwordInput as unknown as HTMLInputElement,
      passwordToggleButton: passwordToggleButton as unknown as HTMLButtonElement,
      autoLoginCheckbox: autoLoginCheckbox as unknown as HTMLInputElement,
      maintenanceToggle: maintenanceToggle as unknown as HTMLSelectElement
    },
    keys: {
      apiBase: "api",
      username: "user",
      password: "pass",
      email: "email",
      passwordVisible: "passwordVisible",
      characterName: "character",
      autoLogin: "autoLogin",
      maintenance: "maintenance"
    },
    isAuthenticated: () => false,
    setStatus: (level, text) => {
      statuses.push(`${level}:${text}`);
    },
    setMaintenanceAuto: (enabled) => {
      maintenanceStates.push(enabled);
    }
  });
  passwordToggleButton.dispatch("click");
  assert.equal(passwordInput.type, "text");
  assert.equal(passwordToggleButton.textContent, "Hide");
  assert.equal(stored.get("passwordVisible"), "on");

  autoLoginCheckbox.checked = true;
  autoLoginCheckbox.dispatch("change");
  assert.equal(stored.get("autoLogin"), "on");
  assert.deepEqual(statuses, ["idle:Auto-login enabled. It will run on next refresh."]);

  maintenanceToggle.value = "on";
  maintenanceToggle.dispatch("change");
  assert.equal(stored.get("maintenance"), "on");
  assert.deepEqual(maintenanceStates, [true]);
}

{
  let applied = "";
  const accountSelectControl = fakeControl({ value: profileKey(profiles[0]) });
  bindAccountProfileSelectionRuntime({
    accountSelect: accountSelectControl as unknown as HTMLSelectElement,
    loadProfiles: () => profiles,
    profileKey,
    applyProfile: (profile) => {
      applied = profile.username;
    }
  });
  accountSelectControl.dispatch("change");
  assert.equal(applied, "avatar");
}

console.log("net_panel_bindings_runtime_test: ok");

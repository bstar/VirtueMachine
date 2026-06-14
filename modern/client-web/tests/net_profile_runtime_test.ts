import assert from "node:assert/strict";
import {
  applyNetProfileToControlsRuntime,
  countSavedProfilesRuntime,
  loadNetProfilesFromStorage,
  populateNetAccountSelectRuntime,
  profileKey,
  saveNetProfilesToStorage,
  sanitizeProfile,
  upsertNetProfileFromControlsRuntime,
  upsertProfileList
} from "../net/profile_runtime.ts";

type FakeOption = {
  selected: boolean;
  textContent: string;
  value: string;
};

type FakeSelect = {
  children: FakeOption[];
  innerHTML: string;
  value: string;
  appendChild: (child: FakeOption) => void;
};

function fakeSelect(): FakeSelect {
  return {
    children: [],
    innerHTML: "",
    value: "",
    appendChild(child) {
      this.children.push(child);
    }
  };
}

function fakeInput(value = ""): HTMLInputElement {
  return { value } as HTMLInputElement;
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

globalThis.document = {
  createElement(tagName: string) {
    assert.equal(tagName, "option");
    return {
      selected: false,
      textContent: "",
      value: ""
    };
  }
} as Document;

assert.equal(profileKey({ apiBase: "HTTP://NET ", username: " Avatar " }), "http://net|avatar");
assert.deepEqual(sanitizeProfile({
  apiBase: " http://net ",
  username: " Avatar ",
  password: "quest",
  characterName: "",
  email: "USER@EXAMPLE.COM"
}), {
  apiBase: "http://net",
  username: "avatar",
  password: "quest",
  characterName: "Avatar",
  email: "user@example.com"
});
assert.equal(sanitizeProfile({ username: "avatar" }), null);

const profiles = upsertProfileList([
  { apiBase: "http://old", username: "old", password: "", characterName: "Avatar", email: "" },
  { apiBase: "http://net", username: "avatar", password: "old", characterName: "Avatar", email: "" }
], {
  apiBase: "http://net",
  username: "avatar",
  password: "new",
  characterName: "Avatar",
  email: "avatar@example.com"
}, 2);
assert.deepEqual(profiles.map((p) => `${p.username}:${p.password}`), ["avatar:new", "old:"]);

{
  stored.clear();
  saveNetProfilesToStorage("profiles", [
    { apiBase: "http://net", username: "avatar", password: "quest", characterName: "Avatar", email: "avatar@example.test" },
    { apiBase: "", username: "invalid", password: "", characterName: "", email: "" }
  ]);
  assert.equal(countSavedProfilesRuntime("profiles"), 1);
  assert.deepEqual(loadNetProfilesFromStorage("profiles").map((p) => p.username), ["avatar"]);
}

{
  stored.clear();
  const avatar = { apiBase: "http://net", username: "avatar", password: "quest", characterName: "Avatar", email: "" };
  const dupre = { apiBase: "http://net", username: "dupre", password: "quest", characterName: "Dupre", email: "" };
  saveNetProfilesToStorage("profiles", [avatar, dupre]);
  localStorage.setItem("selected", profileKey(dupre));
  const select = fakeSelect();
  const loaded = populateNetAccountSelectRuntime({
    accountSelect: select as unknown as HTMLSelectElement,
    storageKey: "profiles",
    selectedKeyStorageKey: "selected"
  });
  assert.deepEqual(loaded.map((p) => p.username), ["avatar", "dupre"]);
  assert.equal(select.children.length, 3);
  assert.equal(select.children[0].textContent, "Select saved account...");
  assert.equal(select.children[2].value, profileKey(dupre));
  assert.equal(select.children[2].selected, true);
}

{
  stored.clear();
  const apiBaseInput = fakeInput();
  const usernameInput = fakeInput();
  const passwordInput = fakeInput();
  const characterNameInput = fakeInput();
  const emailInput = fakeInput();
  assert.equal(applyNetProfileToControlsRuntime({
    profile: { apiBase: "http://net", username: "Avatar", password: "quest", characterName: "Avatar", email: "A@EXAMPLE.TEST" },
    controls: { apiBaseInput, usernameInput, passwordInput, characterNameInput, emailInput },
    selectedKeyStorageKey: "selected"
  }), true);
  assert.equal(apiBaseInput.value, "http://net");
  assert.equal(usernameInput.value, "avatar");
  assert.equal(emailInput.value, "a@example.test");
  assert.equal(localStorage.getItem("selected"), "http://net|avatar");
}

{
  stored.clear();
  const select = fakeSelect();
  const apiBaseInput = fakeInput("http://net");
  const usernameInput = fakeInput("Avatar");
  const passwordInput = fakeInput("quest");
  const characterNameInput = fakeInput("Avatar");
  const emailInput = fakeInput("avatar@example.test");
  upsertNetProfileFromControlsRuntime({
    controls: { apiBaseInput, usernameInput, passwordInput, characterNameInput, emailInput },
    storageKey: "profiles",
    selectedKeyStorageKey: "selected",
    accountSelect: select as unknown as HTMLSelectElement,
    maxEntries: 12
  });
  assert.equal(countSavedProfilesRuntime("profiles"), 1);
  assert.equal(localStorage.getItem("selected"), "http://net|avatar");
  assert.equal(select.value, "http://net|avatar");
}

console.log("net_profile_runtime_test: ok");

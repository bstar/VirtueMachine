import assert from "node:assert/strict";
import { applySelectedAccountProfileRuntime } from "../net/panel_bindings_runtime.ts";
import { profileKey, type NetProfile } from "../net/profile_runtime.ts";

const profiles: NetProfile[] = [
  { apiBase: "http://one", username: "avatar", password: "", characterName: "Avatar", email: "" },
  { apiBase: "http://two", username: "dupre", password: "", characterName: "Dupre", email: "" }
];

let selected: NetProfile | null = null;
const accountSelect = {
  value: profileKey(profiles[1])
} as HTMLSelectElement;

applySelectedAccountProfileRuntime({
  accountSelect,
  loadProfiles: () => profiles,
  profileKey,
  applyProfile: (profile) => { selected = profile; }
});

assert.equal(selected?.username, "dupre");

console.log("net_panel_bindings_runtime_test: ok");

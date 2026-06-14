import assert from "node:assert/strict";
import {
  profileKey,
  sanitizeProfile,
  upsertProfileList
} from "../net/profile_runtime.ts";

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

console.log("net_profile_runtime_test: ok");

import assert from "node:assert/strict";
import {
  ensureUserSchemaRuntime,
  findUserByUsernameRuntime,
  findUserForBearerTokenRuntime,
  issueEmailVerificationCodeRuntime,
  issueTokenRuntime,
  isValidEmailRuntime,
  listUserCharactersRuntime,
  newUserIdRuntime,
  normalizeEmailRuntime,
  normalizeServerCharactersRuntime,
  normalizeServerTokensRuntime,
  normalizeServerUsersRuntime,
  normalizeUsernameRuntime,
  parseAuthHeaderRuntime,
  type ServerCharacterRuntime,
  type ServerTokenRuntime,
  type ServerUserRuntime,
  sixDigitEmailVerificationCodeRuntime
} from "../server_account_runtime.ts";

assert.equal(sixDigitEmailVerificationCodeRuntime(0), "100000");
assert.equal(sixDigitEmailVerificationCodeRuntime(0.5), "550000");
assert.equal(sixDigitEmailVerificationCodeRuntime(1), "999999");
assert.equal(sixDigitEmailVerificationCodeRuntime(Number.NaN), "100000");

assert.equal(normalizeUsernameRuntime(" Avatar "), "avatar");
assert.equal(normalizeEmailRuntime(" Avatar@Example.COM "), "avatar@example.com");
assert.equal(isValidEmailRuntime("avatar@example.com"), true);
assert.equal(isValidEmailRuntime("avatar.example.com"), false);

assert.deepEqual(normalizeServerUsersRuntime([
  {
    user_id: " u1 ",
    username: " Avatar ",
    password_plaintext: "quest",
    email: " Avatar@Example.COM ",
    email_verified: true,
    email_verification: {
      code: "123456",
      issued_at: "issued",
      expires_at_ms: 42
    },
    created_at: "created"
  },
  { user_id: "u1", username: "duplicate" },
  { user_id: "", username: "missing" },
  "bad"
]), [{
  user_id: "u1",
  username: "avatar",
  password_plaintext: "quest",
  email: "avatar@example.com",
  email_verified: true,
  email_verification: {
    code: "123456",
    issued_at: "issued",
    expires_at_ms: 42
  },
  created_at: "created"
}]);

assert.deepEqual(normalizeServerTokensRuntime([
  { token: " tok ", user_id: " u1 ", issued_at: "issued", expires_at_ms: 200 },
  { token: "tok", user_id: "u2", expires_at_ms: 300 },
  { token: "", user_id: "u1", expires_at_ms: 200 },
  { token: "bad", user_id: "u1", expires_at_ms: -1 }
]), [{
  token: "tok",
  user_id: "u1",
  issued_at: "issued",
  expires_at_ms: 200
}]);

assert.deepEqual(normalizeServerCharactersRuntime([
  {
    character_id: " c1 ",
    user_id: " u1 ",
    name: " Avatar ",
    created_at: "created",
    updated_at: "updated",
    snapshot_meta: { saved_tick: 9 },
    snapshot_base64: "abc"
  },
  { character_id: "c1", user_id: "u2", name: "duplicate" },
  { character_id: "c2", user_id: "", name: "missing-user" }
]), [{
  character_id: "c1",
  user_id: "u1",
  name: "Avatar",
  created_at: "created",
  updated_at: "updated",
  snapshot_meta: { saved_tick: 9 },
  snapshot_base64: "abc"
}]);

const legacyUser: ServerUserRuntime = { username: "Avatar" };
ensureUserSchemaRuntime(legacyUser);
assert.deepEqual(legacyUser, {
  username: "Avatar",
  email: "",
  email_verified: false,
  email_verification: null
});
legacyUser.email_verification = {
  code: "111111",
  issued_at: "issued",
  expires_at_ms: 1
};
ensureUserSchemaRuntime(legacyUser);
assert.equal(legacyUser.email_verification?.code, "111111");

const users: ServerUserRuntime[] = [
  { user_id: "u1", username: "Avatar" },
  { user_id: "u2", username: "Dupre" }
];
assert.equal(findUserByUsernameRuntime(users, " avatar ")?.user_id, "u1");
assert.equal(findUserByUsernameRuntime(users, "missing"), null);

assert.equal(parseAuthHeaderRuntime("Bearer abc123"), "abc123");
assert.equal(parseAuthHeaderRuntime("Basic abc123"), null);

const tokens: ServerTokenRuntime[] = [
  { token: "expired", user_id: "u1", expires_at_ms: 99 },
  { token: "valid", user_id: "u1", expires_at_ms: 101 },
  { token: "orphan", user_id: "missing", expires_at_ms: 101 }
];
assert.deepEqual(findUserForBearerTokenRuntime({ nowMs: 100, token: "", tokens, users }), {
  code: "missing",
  user: null
});
assert.deepEqual(findUserForBearerTokenRuntime({ nowMs: 100, token: "expired", tokens, users }), {
  code: "invalid",
  user: null
});
assert.deepEqual(findUserForBearerTokenRuntime({ nowMs: 100, token: "orphan", tokens, users }), {
  code: "user_not_found",
  user: null
});
assert.equal(findUserForBearerTokenRuntime({ nowMs: 100, token: "valid", tokens, users }).user?.user_id, "u1");

let userIdAttempt = 0;
assert.equal(newUserIdRuntime([...users, { user_id: "usr_dup", username: "Dup" }], () => {
  userIdAttempt += 1;
  return userIdAttempt === 1 ? "dup" : "abcdef";
}), "usr_abcdef");

const issuedTokens: ServerTokenRuntime[] = [];
assert.equal(issueTokenRuntime(issuedTokens, {
  nowIso: "2026-06-14T00:00:00.000Z",
  nowMs: 1000,
  randomHex: (bytes) => `hex${bytes}`,
  ttlMs: 5000,
  userId: "u1"
}), "hex24");
assert.deepEqual(issuedTokens, [{
  token: "hex24",
  user_id: "u1",
  issued_at: "2026-06-14T00:00:00.000Z",
  expires_at_ms: 6000
}]);

const user = {};
assert.equal(issueEmailVerificationCodeRuntime(user, {
  code: "123456",
  issuedAt: "2026-06-14T00:00:00.000Z",
  expiresAtMs: 123
}), "123456");
assert.deepEqual(user, {
  email_verification: {
    code: "123456",
    issued_at: "2026-06-14T00:00:00.000Z",
    expires_at_ms: 123
  }
});

const characterRows: Array<ServerCharacterRuntime & { hidden?: boolean }> = [
  {
    character_id: "c1",
    user_id: "u1",
    name: "Avatar",
    created_at: "created",
    updated_at: "updated",
    snapshot_meta: { tick: 1 },
    hidden: true
  },
  {
    character_id: "c2",
    user_id: "u2",
    name: "Dupre"
  }
];
assert.deepEqual(listUserCharactersRuntime(characterRows, "u1"), [{
  character_id: "c1",
  user_id: "u1",
  name: "Avatar",
  created_at: "created",
  updated_at: "updated",
  snapshot_meta: { tick: 1 }
}]);

console.log("server_account_runtime_test: ok");

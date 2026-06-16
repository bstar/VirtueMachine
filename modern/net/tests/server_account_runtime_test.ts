import assert from "node:assert/strict";
import {
  changeAccountPasswordRuntime,
  characterCreatedPayloadRuntime,
  characterSnapshotPayloadRuntime,
  ensureUserSchemaRuntime,
  findUserByUsernameRuntime,
  findUserForBearerTokenRuntime,
  issueEmailVerificationCodeRuntime,
  issueTokenRuntime,
  isValidEmailRuntime,
  listUserCharactersRuntime,
  loginAccountRuntime,
  newUserIdRuntime,
  normalizeEmailRuntime,
  normalizeServerCharactersRuntime,
  normalizeServerTokensRuntime,
  normalizeServerUsersRuntime,
  normalizeUsernameRuntime,
  parseAuthHeaderRuntime,
  passwordRecoveryAccountRuntime,
  publicUserPayloadRuntime,
  secureSixDigitEmailVerificationCodeRuntime,
  setAccountEmailRuntime,
  validateCharacterNameRuntime,
  type ServerCharacterRuntime,
  type ServerTokenRuntime,
  type ServerUserRuntime,
  verifyAccountEmailRuntime,
  sixDigitEmailVerificationCodeRuntime
} from "../server_account_runtime.ts";

assert.equal(sixDigitEmailVerificationCodeRuntime(0), "100000");
assert.equal(sixDigitEmailVerificationCodeRuntime(0.5), "550000");
assert.equal(sixDigitEmailVerificationCodeRuntime(1), "999999");
assert.equal(sixDigitEmailVerificationCodeRuntime(Number.NaN), "100000");
assert.equal(secureSixDigitEmailVerificationCodeRuntime((max) => {
  assert.equal(max, 900000);
  return 0;
}), "100000");
assert.equal(secureSixDigitEmailVerificationCodeRuntime(() => 899999), "999999");
assert.equal(secureSixDigitEmailVerificationCodeRuntime(() => Number.NaN), "100000");
assert.equal(secureSixDigitEmailVerificationCodeRuntime(() => 999999), "999999");

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
  {
    user_id: "u2",
    username: "BadVerification",
    email_verification: ["bad"]
  },
  { user_id: "u1", username: "duplicate" },
  { user_id: "", username: "missing" },
  ["bad-array-row"],
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
}, {
  user_id: "u2",
  username: "badverification",
  password_plaintext: "",
  email: "",
  email_verified: false,
  email_verification: null
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
  {
    character_id: "c2",
    user_id: "u1",
    name: "ArrayMeta",
    snapshot_meta: ["bad"]
  },
  { character_id: "c1", user_id: "u2", name: "duplicate" },
  { character_id: "c3", user_id: "", name: "missing-user" },
  ["bad-array-row"]
]), [{
  character_id: "c1",
  user_id: "u1",
  name: "Avatar",
  created_at: "created",
  updated_at: "updated",
  snapshot_meta: { saved_tick: 9 },
  snapshot_base64: "abc"
}, {
  character_id: "c2",
  user_id: "u1",
  name: "ArrayMeta",
  created_at: "",
  updated_at: "",
  snapshot_meta: null,
  snapshot_base64: null
}]);

const legacyUser: ServerUserRuntime = { username: "Avatar" };
ensureUserSchemaRuntime(legacyUser);
assert.deepEqual(legacyUser, {
  username: "Avatar",
  email: "",
  email_verified: false,
  email_verification: null
});
const pendingVerificationUser: ServerUserRuntime = {
  ...legacyUser,
  email_verification: {
    code: "111111",
    issued_at: "issued",
    expires_at_ms: 1
  }
};
ensureUserSchemaRuntime(pendingVerificationUser);
assert.equal(pendingVerificationUser.email_verification?.code, "111111");

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
assert.deepEqual(publicUserPayloadRuntime({
  user_id: "u1",
  username: "avatar",
  email: "avatar@example.com",
  email_verified: true,
  password_plaintext: "secret"
}), {
  user_id: "u1",
  username: "avatar"
});
assert.deepEqual(publicUserPayloadRuntime({
  user_id: "u1",
  username: "avatar",
  email: "avatar@example.com",
  email_verified: true,
  password_plaintext: "secret"
}, {
  includeEmail: true,
  includeEmailVerified: true
}), {
  user_id: "u1",
  username: "avatar",
  email: "avatar@example.com",
  email_verified: true
});
assert.deepEqual(publicUserPayloadRuntime({
  user_id: "u1",
  username: "avatar",
  email_verified: false
}, {
  includeEmail: true,
  includeEmailVerified: true
}), {
  user_id: "u1",
  username: "avatar",
  email: "",
  email_verified: false
});

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

{
  const loginUsers: ServerUserRuntime[] = [];
  const loginTokens: ServerTokenRuntime[] = [];
  assert.deepEqual(loginAccountRuntime({
    body: { username: "a", password: "pw" },
    nowIso: "now",
    nowMs: 100,
    randomHex: () => "unused",
    tokens: loginTokens,
    users: loginUsers
  }), {
    ok: false,
    http: 400,
    code: "bad_username",
    message: "username is required"
  });
  assert.deepEqual(loginAccountRuntime({
    body: { username: "Avatar" },
    nowIso: "now",
    nowMs: 100,
    randomHex: () => "unused",
    tokens: loginTokens,
    users: loginUsers
  }), {
    ok: false,
    http: 400,
    code: "bad_password",
    message: "password is required"
  });

  const created = loginAccountRuntime({
    body: { username: " Avatar ", password: "quest" },
    nowIso: "created",
    nowMs: 100,
    randomHex: (bytes) => bytes === 8 ? "userhex" : "tokenhex",
    tokens: loginTokens,
    users: loginUsers
  });
  assert.equal(created.ok, true);
  assert.equal(created.ok && created.token, "tokenhex");
  assert.deepEqual(loginUsers, [{
    user_id: "usr_userhex",
    username: "avatar",
    password_plaintext: "quest",
    email: "",
    email_verified: false,
    email_verification: null,
    created_at: "created"
  }]);
  assert.equal(loginTokens.length, 1);
  assert.equal(loginTokens[0].user_id, "usr_userhex");

  assert.deepEqual(loginAccountRuntime({
    body: { username: "avatar", password: "wrong" },
    nowIso: "later",
    nowMs: 200,
    randomHex: () => "ignored",
    tokens: loginTokens,
    users: loginUsers
  }), {
    ok: false,
    http: 401,
    code: "auth_invalid",
    message: "invalid username/password"
  });

  const legacyUsers: ServerUserRuntime[] = [{ user_id: "u2", username: "legacy" }];
  const legacyTokens: ServerTokenRuntime[] = [];
  const initialized = loginAccountRuntime({
    body: { username: "legacy", password: "newpw" },
    nowIso: "later",
    nowMs: 200,
    randomHex: () => "legacytoken",
    tokens: legacyTokens,
    users: legacyUsers
  });
  assert.equal(initialized.ok, true);
  assert.equal(legacyUsers[0].password_plaintext, "newpw");
  assert.equal(initialized.ok && initialized.token, "legacytoken");
}

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

{
  const account: ServerUserRuntime = {
    user_id: "u1",
    username: "avatar",
    email: "avatar@example.com",
    email_verified: true,
    email_verification: {
      code: "123456",
      issued_at: "issued",
      expires_at_ms: 200
    },
    password_plaintext: "old"
  };
  assert.deepEqual(setAccountEmailRuntime(account, " avatar@example.com "), { ok: true });
  assert.equal(account.email_verified, true);
  assert.equal(account.email_verification?.code, "123456");
  assert.deepEqual(setAccountEmailRuntime(account, "bad-email"), {
    ok: false,
    http: 400,
    code: "bad_email",
    message: "valid email is required"
  });
  assert.deepEqual(setAccountEmailRuntime(account, "new@example.com"), { ok: true });
  assert.equal(account.email, "new@example.com");
  assert.equal(account.email_verified, false);
  assert.equal(account.email_verification, null);

  assert.deepEqual(verifyAccountEmailRuntime(account, { code: "", nowMs: 100 }), {
    ok: false,
    http: 400,
    code: "bad_code",
    message: "verification code is required"
  });
  assert.deepEqual(verifyAccountEmailRuntime(account, { code: "123456", nowMs: 100 }), {
    ok: false,
    http: 409,
    code: "no_pending_verification",
    message: "no pending email verification"
  });
  account.email_verification = {
    code: "123456",
    issued_at: "issued",
    expires_at_ms: 99
  };
  assert.deepEqual(verifyAccountEmailRuntime(account, { code: "123456", nowMs: 100 }), {
    ok: false,
    http: 410,
    code: "verification_expired",
    message: "verification code expired"
  });
  assert.equal(account.email_verification, null);
  account.email_verification = {
    code: "123456",
    issued_at: "issued",
    expires_at_ms: 200
  };
  assert.deepEqual(verifyAccountEmailRuntime(account, { code: "000000", nowMs: 100 }), {
    ok: false,
    http: 401,
    code: "verification_invalid",
    message: "invalid verification code"
  });
  assert.deepEqual(verifyAccountEmailRuntime(account, { code: "123456", nowMs: 100 }), { ok: true });
  assert.equal(account.email_verified, true);
  assert.equal(account.email_verification, null);

  assert.deepEqual(changeAccountPasswordRuntime(account, { oldPassword: "", newPassword: "new" }), {
    ok: false,
    http: 400,
    code: "bad_old_password",
    message: "old_password is required"
  });
  assert.deepEqual(changeAccountPasswordRuntime(account, { oldPassword: "old", newPassword: "" }), {
    ok: false,
    http: 400,
    code: "bad_new_password",
    message: "new_password is required"
  });
  assert.deepEqual(changeAccountPasswordRuntime(account, { oldPassword: "bad", newPassword: "new" }), {
    ok: false,
    http: 401,
    code: "auth_invalid",
    message: "invalid old password"
  });
  assert.deepEqual(changeAccountPasswordRuntime(account, { oldPassword: "old", newPassword: "old" }), {
    ok: false,
    http: 409,
    code: "password_unchanged",
    message: "new password must differ from old password"
  });
  assert.deepEqual(changeAccountPasswordRuntime(account, { oldPassword: "old", newPassword: "new" }), { ok: true });
  assert.equal(account.password_plaintext, "new");
}

{
  const recoveryUsers: ServerUserRuntime[] = [{
    user_id: "u1",
    username: "avatar",
    email: "avatar@example.com",
    email_verified: true,
    password_plaintext: "quest"
  }, {
    user_id: "u2",
    username: "dup",
    email: "dup@example.com",
    email_verified: false,
    password_plaintext: "quest"
  }];
  assert.deepEqual(passwordRecoveryAccountRuntime({
    username: "a",
    email: "avatar@example.com",
    users: recoveryUsers
  }), {
    ok: false,
    http: 400,
    code: "bad_username",
    message: "username is required"
  });
  assert.deepEqual(passwordRecoveryAccountRuntime({
    username: "avatar",
    email: "bad-email",
    users: recoveryUsers
  }), {
    ok: false,
    http: 400,
    code: "bad_email",
    message: "email is required"
  });
  assert.deepEqual(passwordRecoveryAccountRuntime({
    username: "missing",
    email: "avatar@example.com",
    users: recoveryUsers
  }), {
    ok: false,
    http: 404,
    code: "user_not_found",
    message: "user not found"
  });
  assert.deepEqual(passwordRecoveryAccountRuntime({
    username: "dup",
    email: "dup@example.com",
    users: recoveryUsers
  }), {
    ok: false,
    http: 403,
    code: "email_unverified",
    message: "email must be verified before password recovery"
  });
  assert.deepEqual(passwordRecoveryAccountRuntime({
    username: "avatar",
    email: "wrong@example.com",
    users: recoveryUsers
  }), {
    ok: false,
    http: 401,
    code: "email_mismatch",
    message: "email does not match account"
  });
  const recovery = passwordRecoveryAccountRuntime({
    username: " Avatar ",
    email: " Avatar@Example.com ",
    users: recoveryUsers
  });
  assert.equal(recovery.ok, true);
  assert.equal(recovery.ok && recovery.email, "avatar@example.com");
  assert.equal(recovery.ok && recovery.user.user_id, "u1");
}

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
assert.deepEqual(validateCharacterNameRuntime({ name: " Avatar " }), {
  ok: true,
  name: "Avatar"
});
assert.deepEqual(validateCharacterNameRuntime({ name: "A" }), {
  ok: false,
  http: 400,
  code: "bad_character_name",
  message: "name is required"
});
assert.deepEqual(validateCharacterNameRuntime(null), {
  ok: false,
  http: 400,
  code: "bad_character_name",
  message: "name is required"
});
assert.deepEqual(characterCreatedPayloadRuntime(characterRows[0]), {
  character_id: "c1",
  name: "Avatar",
  user_id: "u1",
  snapshot_meta: { tick: 1 }
});
assert.deepEqual(characterSnapshotPayloadRuntime(characterRows[0], "encoded"), {
  character_id: "c1",
  snapshot_meta: { tick: 1 },
  snapshot_base64: "encoded"
});
assert.deepEqual(characterSnapshotPayloadRuntime(characterRows[0]), {
  character_id: "c1",
  snapshot_meta: { tick: 1 }
});

console.log("server_account_runtime_test: ok");

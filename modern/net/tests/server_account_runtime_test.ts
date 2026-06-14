import assert from "node:assert/strict";
import {
  issueEmailVerificationCodeRuntime,
  listUserCharactersRuntime,
  type ServerCharacterRuntime,
  sixDigitEmailVerificationCodeRuntime
} from "../server_account_runtime.ts";

assert.equal(sixDigitEmailVerificationCodeRuntime(0), "100000");
assert.equal(sixDigitEmailVerificationCodeRuntime(0.5), "550000");
assert.equal(sixDigitEmailVerificationCodeRuntime(1), "999999");
assert.equal(sixDigitEmailVerificationCodeRuntime(Number.NaN), "100000");

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

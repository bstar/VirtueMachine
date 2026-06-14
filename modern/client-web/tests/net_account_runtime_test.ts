import assert from "node:assert/strict";
import {
  netAccountEmailRuntime,
  netAccountEmailVerifiedRuntime,
  netAccountUsernameRuntime,
  performNetChangePassword,
  performNetRecoverPassword,
  performNetSetEmail,
  performNetVerifyEmail
} from "../net/account_runtime.ts";
import {
  applyNetLoginState,
  clearNetSessionState,
  type NetSessionState
} from "../net/session_runtime.ts";

function statusRecorder(): string[] {
  return [];
}

assert.equal(netAccountEmailRuntime({ user: { email: "avatar@example.com" } }, "fallback"), "avatar@example.com");
assert.equal(netAccountEmailRuntime({}, "fallback@example.com"), "fallback@example.com");
assert.equal(netAccountEmailVerifiedRuntime({ user: { email_verified: true } }), true);
assert.equal(netAccountEmailVerifiedRuntime({}), false);
assert.equal(netAccountUsernameRuntime({ user: { username: "avatar" } }, "fallback"), "avatar");
assert.equal(netAccountUsernameRuntime({}, "fallback"), "fallback");

{
  const netState: NetSessionState = {
    backgroundFailCount: 4,
    characterId: "char-1",
    firstBackgroundFailAtMs: 123,
    lastClockPollTick: 8,
    lastPresenceHeartbeatTick: 9,
    lastPresencePollTick: 10,
    remotePlayers: [{ session_id: "remote" }],
    resumeFromSnapshot: true,
    token: "old"
  };
  applyNetLoginState(netState, {
    token: "token",
    user: {
      email: "avatar@example.com",
      email_verified: true,
      user_id: "u1",
      username: "avatar"
    }
  }, "fallback");
  assert.equal(netState.token, "token");
  assert.equal(netState.userId, "u1");
  assert.equal(netState.username, "avatar");
  assert.equal(netState.email, "avatar@example.com");
  assert.equal(netState.emailVerified, true);
  assert.deepEqual(netState.remotePlayers, []);
  assert.equal(netState.lastPresenceHeartbeatTick, -1);
  assert.equal(netState.lastPresencePollTick, -1);
  assert.equal(netState.lastClockPollTick, -1);
  assert.equal(netState.resumeFromSnapshot, false);
  assert.equal(netState.backgroundFailCount, 0);
  assert.equal(netState.firstBackgroundFailAtMs, 0);
  clearNetSessionState(netState);
  assert.equal(netState.token, "");
  assert.equal(netState.userId, "");
  assert.equal(netState.characterId, "");

  applyNetLoginState(netState, { token: "fallback-token" }, "fallback-user");
  assert.equal(netState.token, "fallback-token");
  assert.equal(netState.username, "fallback-user");
  assert.equal(netState.email, "");
  assert.equal(netState.emailVerified, false);
}

{
  const statuses = statusRecorder();
  const applied: string[] = [];
  const out = await performNetSetEmail(" USER@EXAMPLE.COM ", {
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async (route, init, auth) => {
      assert.equal(route, "/api/auth/set-email");
      assert.equal(auth, true);
      assert.deepEqual(JSON.parse(String(init?.body || "{}")), { email: "user@example.com" });
      return { user: { email_verified: false } };
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    applyEmail: (email, verified) => applied.push(`${email}:${verified}`),
    persistEmail: (email) => applied.push(`persist:${email}`),
    onProfileUpdated: () => applied.push("profile")
  });
  assert.equal(netAccountEmailRuntime(out, "user@example.com"), "user@example.com");
  assert.deepEqual(applied, ["user@example.com:false", "persist:user@example.com", "profile"]);
  assert.deepEqual(statuses, ["sync:Saving recovery email...", "online:Email set (verification required)"]);
}

{
  const statuses = statusRecorder();
  const out = await performNetVerifyEmail(" 123456 ", {
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async (route, init, auth) => {
      assert.equal(route, "/api/auth/verify-email");
      assert.equal(auth, true);
      assert.deepEqual(JSON.parse(String(init?.body || "{}")), { code: "123456" });
      return { user: { email_verified: true } };
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    applyEmail: () => {},
    currentEmail: () => "current@example.com",
    onVerified: (email) => statuses.push(`verified:${email}`)
  });
  assert.equal(netAccountEmailVerifiedRuntime(out), true);
  assert.deepEqual(statuses, [
    "sync:Verifying recovery email...",
    "verified:current@example.com",
    "online:Recovery email verified"
  ]);
}

{
  const statuses = statusRecorder();
  const out = await performNetRecoverPassword("http://net", " Avatar ", "USER@EXAMPLE.COM", {
    request: async (route, _init, auth) => {
      assert.equal(route, "/api/auth/recover-password?username=avatar&email=user%40example.com");
      assert.equal(auth, false);
      return { user: { username: "avatar" } };
    },
    setApiBase: (base) => assert.equal(base, "http://net"),
    setStatus: (level, text) => statuses.push(`${level}:${text}`)
  });
  assert.equal(out.user?.username, "avatar");
  assert.deepEqual(statuses, [
    "connecting:Sending password recovery email...",
    "online:Recovery email sent for avatar"
  ]);
}

{
  const statuses = statusRecorder();
  let changed = "";
  const out = await performNetChangePassword("old", "new", {
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async (route, init, auth) => {
      assert.equal(route, "/api/auth/change-password");
      assert.equal(auth, true);
      assert.deepEqual(JSON.parse(String(init?.body || "{}")), { old_password: "old", new_password: "new" });
      return { ok: true };
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    persistPassword: (password) => { changed += ` persist:${password}`; },
    onPasswordChanged: (password) => { changed += ` changed:${password}`; },
    onProfileUpdated: () => { changed += " profile"; }
  });
  assert.equal(out.ok, true);
  assert.equal(changed, " changed:new persist:new profile");
  assert.deepEqual(statuses, ["sync:Updating account password...", "online:Password updated"]);
}

console.log("net_account_runtime_test: ok");

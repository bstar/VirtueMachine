import assert from "node:assert/strict";
import {
  performNetChangePassword,
  performNetRecoverPassword,
  performNetSetEmail,
  performNetVerifyEmail
} from "../net/account_runtime.ts";

function statusRecorder(): string[] {
  return [];
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
      return { user: { email: "user@example.com", email_verified: false } };
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    applyEmail: (email, verified) => applied.push(`${email}:${verified}`),
    persistEmail: (email) => applied.push(`persist:${email}`),
    onProfileUpdated: () => applied.push("profile")
  });
  assert.equal(out.user?.email, "user@example.com");
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
      return { user: { email: "user@example.com", email_verified: true } };
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    applyEmail: () => {},
    currentEmail: () => "",
    onVerified: () => {}
  });
  assert.equal(out.user?.email_verified, true);
  assert.deepEqual(statuses, ["sync:Verifying recovery email...", "online:Recovery email verified"]);
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

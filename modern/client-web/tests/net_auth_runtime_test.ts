import assert from "node:assert/strict";
import {
  bindNetLoginButtonRuntime,
  netAutoLoginFailureRuntime,
  netAutoLoginSuccessDiagRuntime,
  netLoginEmailRuntime,
  netLoginEmailVerifiedRuntime,
  netLoginPanelFailureRuntime,
  netLoginPanelSuccessDiagRuntime,
  netLoginSnapshotBase64Runtime,
  netLoginTokenRuntime,
  netLoginUserIdRuntime,
  netLoginUsernameRuntime,
  performNetLoginFlow
} from "../net/auth_runtime.ts";
import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";

type NetAuthTestListener = {
  current?: () => void;
};

assert.equal(netLoginTokenRuntime({ token: "token" }), "token");
assert.equal(netLoginUserIdRuntime({ user: { user_id: "u1" } }), "u1");
assert.equal(netLoginUsernameRuntime({ user: { username: "avatar" } }, "fallback"), "avatar");
assert.equal(netLoginUsernameRuntime({}, "fallback"), "fallback");
assert.equal(netLoginEmailRuntime({ user: { email: "avatar@example.com" } }), "avatar@example.com");
assert.equal(netLoginEmailVerifiedRuntime({ user: { email_verified: true } }), true);
assert.equal(netLoginEmailVerifiedRuntime({}), false);
assert.equal(netLoginSnapshotBase64Runtime({ snapshot_base64: " encoded " }), "encoded");
assert.equal(netLoginSnapshotBase64Runtime(null), "");
assert.deepEqual(netLoginPanelSuccessDiagRuntime("avatar", "Avatar"), {
  diagClass: "diag ok",
  diagText: "Net login ok: avatar/Avatar"
});
assert.deepEqual(netLoginPanelFailureRuntime("bad password"), {
  diagClass: "diag warn",
  diagText: "Net login failed: bad password",
  statusLevel: "error",
  statusText: "Login failed: bad password"
});
assert.deepEqual(netAutoLoginSuccessDiagRuntime("avatar", "Avatar"), {
  diagClass: "diag ok",
  diagText: "Auto-login ok: avatar/Avatar"
});
assert.deepEqual(netAutoLoginFailureRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "Auto-login failed: offline",
  statusLevel: "error",
  statusText: "Auto-login failed: offline"
});
{
  const listener: NetAuthTestListener = {};
  const statuses: string[] = [];
  const diags: string[] = [];
  const modalStates: boolean[] = [];
  let loginCount = 0;
  assert.equal(bindNetLoginButtonRuntime({
    button: {
      addEventListener(type: "click", fn: () => void) {
        assert.equal(type, "click");
        listener.current = fn;
      }
    },
    characterName: () => "Avatar",
    errorMessage: String,
    isAuthenticated: () => false,
    login: async () => {
      loginCount += 1;
    },
    logout: () => {
      throw new Error("unexpected");
    },
    setAccountModalOpen: (open) => modalStates.push(open),
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    username: () => "avatar",
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "login listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loginCount, 1);
  assert.deepEqual(modalStates, [false]);
  assert.deepEqual(statuses, []);
  assert.deepEqual(diags, ["diag ok:Net login ok: avatar/Avatar"]);
}
{
  const listener: NetAuthTestListener = {};
  const statuses: string[] = [];
  const diags: string[] = [];
  assert.equal(bindNetLoginButtonRuntime({
    button: {
      addEventListener(_type: "click", fn: () => void) {
        listener.current = fn;
      }
    },
    characterName: () => "Avatar",
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    isAuthenticated: () => false,
    login: async () => {
      throw new Error("bad password");
    },
    logout: () => {
      throw new Error("unexpected");
    },
    setAccountModalOpen: () => {
      throw new Error("unexpected");
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    username: () => "avatar",
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "failing login listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(statuses, ["error:Login failed: bad password"]);
  assert.deepEqual(diags, ["diag warn:Net login failed: bad password"]);
}
{
  const listener: NetAuthTestListener = {};
  let logoutCount = 0;
  assert.equal(bindNetLoginButtonRuntime({
    button: {
      addEventListener(_type: "click", fn: () => void) {
        listener.current = fn;
      }
    },
    characterName: () => "Avatar",
    errorMessage: String,
    isAuthenticated: () => true,
    login: async () => {
      throw new Error("unexpected");
    },
    logout: () => {
      logoutCount += 1;
    },
    setAccountModalOpen: () => {
      throw new Error("unexpected");
    },
    setStatus: () => {},
    username: () => "avatar",
    setDiag: () => {}
  }), true);
  assert(listener.current, "logout listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(logoutCount, 1);
  assert.equal(bindNetLoginButtonRuntime({
    button: null,
    characterName: () => "Avatar",
    errorMessage: String,
    isAuthenticated: () => true,
    login: async () => {},
    logout: () => {},
    setAccountModalOpen: () => {},
    setStatus: () => {},
    username: () => "avatar",
    setDiag: () => {}
  }), false);
}

const loadedSnapshot = {
  tick: 1,
  rngState: 0,
  worldFlags: 0,
  commandsApplied: 0,
  doorOpenStates: {},
  removedObjectKeys: {},
  removedObjectAtTick: {},
  removedObjectCount: 0,
  inventory: {},
  spawnedWorldObjects: [],
  spawnedWorldSeq: 0,
  partyMembers: [1, 12],
  avatarPose: "stand",
  avatarPoseSetTick: -1,
  avatarPoseAnchor: null,
  world: {
    is_on_quest: 0,
    next_sleep: 0,
    time_m: 0,
    time_h: 0,
    date_d: 1,
    date_m: 1,
    date_y: 1,
    wind_dir: 0,
    active: 1,
    map_x: 0,
    map_y: 0,
    map_z: 0,
    in_combat: 0,
    sound_enabled: 1
  }
} satisfies SimSnapshotRuntime;

const statuses: string[] = [];
let appliedLogin = "";
let appliedSnapshot = false;
let resumed = false;
let persisted = "";

await performNetLoginFlow({
  apiBaseInput: "http://net",
  usernameInput: " Avatar ",
  passwordInput: "quest"
}, {
  setStatus: (kind, text) => statuses.push(`${kind}:${text}`),
  setBackgroundSyncPaused: () => {},
  setApiBase: (apiBase) => assert.equal(apiBase, "http://net"),
  request: async (route, init, auth) => {
    if (route === "/api/auth/login") {
      assert.equal(auth, false);
      assert.deepEqual(JSON.parse(String(init?.body || "{}")), { username: "avatar", password: "quest" });
      return { token: "token", user: { username: "avatar" } };
    }
    assert.equal(route, "/snapshot");
    assert.equal(auth, true);
    return { snapshot_base64: "encoded" };
  },
  applyLogin: (_login, username) => { appliedLogin = username; },
  ensureCharacter: async () => {},
  snapshotRoute: () => "/snapshot",
  decodeSnapshot: (value) => value === "encoded" ? loadedSnapshot : null,
  applyLoadedSim: () => { appliedSnapshot = true; },
  pollWorldClock: async () => {},
  pollPresence: async () => {},
  setResumeFromSnapshot: (value) => { resumed = value; },
  resetBackgroundFailures: () => {},
  updateSessionStat: () => {},
  getUsername: () => "avatar",
  getCharacterName: () => "Avatar",
  getEmail: () => "avatar@example.com",
  syncEmailInput: () => {},
  persistLoginSettings: (args) => { persisted = `${args.apiBase}|${args.username}|${args.characterName}|${args.email}`; },
  onProfileUpdated: () => {}
});

assert.equal(appliedLogin, "avatar");
assert.equal(appliedSnapshot, true);
assert.equal(resumed, true);
assert.equal(persisted, "http://net|avatar|Avatar|avatar@example.com");
assert.deepEqual(statuses, ["connecting:Authenticating...", "online:avatar/Avatar (resumed)"]);

console.log("net_auth_runtime_test: ok");

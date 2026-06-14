import assert from "node:assert/strict";
import {
  backgroundFailureMessageRuntime,
  handleBackgroundFailure,
  resetBackgroundFailureState
} from "../net/failure_runtime.ts";
import {
  applyNetStatusRuntime,
  deriveNetAuthButtonModel,
  deriveNetIndicatorState,
  deriveNetQuickStatusText,
  deriveNetSessionText,
  deriveTopNetStatusText,
  pulseNetIndicatorRuntime,
  renderNetStatusViewRuntime
} from "../net/status_runtime.ts";

assert.equal(backgroundFailureMessageRuntime(null), "");
assert.equal(backgroundFailureMessageRuntime(new Error("offline")), "offline");
assert.equal(backgroundFailureMessageRuntime({ message: "timeout" }), "timeout");
assert.equal(backgroundFailureMessageRuntime("lost"), "lost");

assert.equal(deriveNetIndicatorState("idle", false), "offline");
assert.equal(deriveNetIndicatorState("connecting", false), "connecting");
assert.equal(deriveNetIndicatorState("sync", true), "sync");
assert.equal(deriveNetIndicatorState("idle", true), "online");
assert.equal(deriveNetQuickStatusText(true), "Account: Signed in");
assert.equal(deriveNetQuickStatusText(false), "Account: Signed out");
assert.equal(deriveNetSessionText({ token: "", userId: "u", username: "avatar", characterName: "Avatar" }), "offline");
assert.equal(deriveNetSessionText({ token: "t", userId: "u", username: "avatar", characterName: "" }), "avatar/(no-char)");
assert.deepEqual(deriveNetAuthButtonModel(true), {
  text: "Logout (Shift+I)",
  addClass: "control-btn--logout",
  removeClasses: ["control-btn--login", "control-btn--logout"]
});
assert.equal(deriveTopNetStatusText("online", "ready"), "online - ready");

function fakeElement(): HTMLElement {
  return {
    dataset: {},
    textContent: "",
    classList: {
      add() {},
      remove() {}
    }
  } as unknown as HTMLElement;
}

function fakeButton(): HTMLButtonElement {
  const classes = new Set<string>();
  return {
    dataset: {},
    textContent: "",
    classList: {
      add(name: string) {
        classes.add(name);
      },
      remove(...names: string[]) {
        for (const name of names) {
          classes.delete(name);
        }
      },
      contains(name: string) {
        return classes.has(name);
      }
    }
  } as unknown as HTMLButtonElement;
}

{
  const stateNet = {
    backgroundFailCount: 0,
    backgroundSyncPaused: true,
    firstBackgroundFailAtMs: 99
  };
  resetBackgroundFailureState(stateNet);
  assert.deepEqual(stateNet, {
    backgroundFailCount: 0,
    backgroundSyncPaused: false,
    firstBackgroundFailAtMs: 0
  });
  const statuses: string[] = [];
  handleBackgroundFailure(stateNet, {
    context: "Presence",
    err: { message: "timeout" },
    maxFailures: 2,
    nowMs: 100,
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    windowMs: 1000
  });
  assert.equal(stateNet.backgroundFailCount, 1);
  assert.equal(stateNet.backgroundSyncPaused, false);
  assert.deepEqual(statuses, ["error:Presence failed: timeout"]);
  handleBackgroundFailure(stateNet, {
    context: "Presence",
    err: "offline",
    maxFailures: 2,
    nowMs: 200,
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    windowMs: 1000
  });
  assert.equal(stateNet.backgroundSyncPaused, true);
  assert.equal(statuses[1], "offline:Server unreachable. Auto-sync paused; use Net Login to retry.");
}

{
  const statNetSession = fakeElement();
  const topNetStatus = fakeElement();
  const topNetIndicator = fakeElement();
  const netQuickStatus = fakeElement();
  const netLoginButton = fakeButton();
  const stateNet = {
    token: "token",
    userId: "u1",
    username: "rhy",
    characterName: "Avatar",
    statusLevel: "online",
    statusText: "Ready"
  };
  renderNetStatusViewRuntime({
    stateNet,
    isAuthenticated: true,
    elements: {
      statNetSession,
      topNetStatus,
      topNetIndicator,
      netQuickStatus,
      netLoginButton
    }
  });
  assert.equal(statNetSession.textContent, "rhy/Avatar");
  assert.equal(topNetStatus.textContent, "online - Ready");
  assert.equal(topNetIndicator.dataset.state, "online");
  assert.equal(netQuickStatus.textContent, "Account: Signed in");
  assert.equal(netLoginButton.textContent, "Logout (Shift+I)");
  assert.equal(netLoginButton.classList.contains("control-btn--logout"), true);
}

{
  const statNetSession = fakeElement();
  const topNetStatus = fakeElement();
  const topNetIndicator = fakeElement();
  const netQuickStatus = fakeElement();
  const netLoginButton = fakeButton();
  const stateNet = {
    token: "",
    userId: "",
    username: "rhy",
    characterName: "Avatar",
    statusLevel: "online",
    statusText: "Ready"
  };
  applyNetStatusRuntime({
    stateNet,
    level: "error",
    text: "Login failed",
    isAuthenticated: false,
    elements: {
      statNetSession,
      topNetStatus,
      topNetIndicator,
      netQuickStatus,
      netLoginButton
    }
  });
  assert.equal(stateNet.statusLevel, "error");
  assert.equal(stateNet.statusText, "Login failed");
  assert.equal(statNetSession.textContent, "offline");
  assert.equal(topNetStatus.textContent, "error - Login failed");
  assert.equal(topNetIndicator.dataset.state, "error");
  assert.equal(netQuickStatus.textContent, "Account: Signed out");
  assert.equal(netLoginButton.textContent, "Net Login (Shift+I)");
  assert.equal(netLoginButton.classList.contains("control-btn--login"), true);
}

{
  const classes = new Set<string>();
  const indicator = {
    classList: {
      add(name: string) {
        classes.add(name);
      },
      remove(name: string) {
        classes.delete(name);
      }
    }
  } as HTMLElement;
  const cleared: Array<number | ReturnType<typeof setTimeout>> = [];
  let callback: (() => void) | null = null;
  let storedTimer: number | ReturnType<typeof setTimeout> | null = 7;
  pulseNetIndicatorRuntime({
    indicator,
    currentTimer: storedTimer,
    timeoutMs: 25,
    clearTimeoutFn: (timer) => {
      cleared.push(timer);
    },
    setTimeoutFn: (fn, timeoutMs) => {
      assert.equal(timeoutMs, 25);
      callback = fn;
      return 42;
    },
    setTimer: (timer) => {
      storedTimer = timer;
    }
  });
  assert.deepEqual(cleared, [7]);
  assert.equal(classes.has("is-active"), true);
  assert.equal(storedTimer, 42);
  assert.ok(callback);
  callback?.();
  assert.equal(classes.has("is-active"), false);
  assert.equal(storedTimer, null);
}

console.log("net_status_runtime_test: ok");

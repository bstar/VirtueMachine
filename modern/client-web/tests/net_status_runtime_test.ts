import assert from "node:assert/strict";
import {
  backgroundFailureMessageRuntime,
  handleBackgroundFailure,
  resetBackgroundFailureState
} from "../net/failure_runtime.ts";
import {
  applyNetStatusPresentationRuntime,
  applyNetStatusRuntime,
  brokenServerGameplayBlockDiagRuntime,
  clearTransientReconnectMessageOnCommandRuntime,
  currentInGameServerStatusOverlayRuntime,
  deriveCriticalRecoveryStatTextRuntime,
  deriveIntroPhaseUiModelRuntime,
  deriveNetAuthButtonModel,
  deriveNetIndicatorState,
  deriveNetOnlineStatusTextRuntime,
  deriveNetQuickStatusText,
  deriveNetSessionText,
  deriveTopNetStatusText,
  markServerReconnectedStateRuntime,
  netLogoutDiagRuntime,
  netStatusAutoLoginRuntime,
  netStatusChooseAccountRuntime,
  netStatusNotLoggedInRuntime,
  netStatusSessionExpiredRuntime,
  performReconnectProbeRuntime,
  pulseNetIndicatorRuntime,
  renderCriticalRecoveryStatRuntime,
  renderIntroPhaseUiRuntime,
  renderNetSessionUiRuntime,
  renderNetStatusViewRuntime,
  shouldProbeReconnectRuntime,
  shouldShowInGameServerBrokenRuntime
} from "../net/status_runtime.ts";

type NetStatusTestCallback = {
  current?: () => void;
};

assert.equal(backgroundFailureMessageRuntime(null), "");
assert.equal(backgroundFailureMessageRuntime(new Error("offline")), "offline");
assert.equal(backgroundFailureMessageRuntime({ message: "timeout" }), "timeout");
assert.equal(backgroundFailureMessageRuntime("lost"), "lost");

assert.equal(deriveNetIndicatorState("idle", false), "offline");
assert.equal(deriveNetIndicatorState("connecting", false), "connecting");
assert.equal(deriveNetIndicatorState("sync", true), "sync");
assert.equal(deriveNetIndicatorState("idle", true), "online");
assert.equal(shouldShowInGameServerBrokenRuntime({ isAuthenticated: false, statusLevel: "offline" }), false);
assert.equal(shouldShowInGameServerBrokenRuntime({ isAuthenticated: true, statusLevel: "offline" }), true);
assert.equal(shouldShowInGameServerBrokenRuntime({ isAuthenticated: true, statusLevel: "error" }), true);
assert.equal(shouldShowInGameServerBrokenRuntime({ isAuthenticated: true, statusLevel: "sync" }), false);
assert.equal(shouldShowInGameServerBrokenRuntime({ isAuthenticated: true, statusLevel: "online" }), false);
assert.equal(deriveNetOnlineStatusTextRuntime({ username: "avatar", characterName: "Avatar" }), "avatar/Avatar");
assert.equal(deriveNetOnlineStatusTextRuntime({ username: "", characterName: "Avatar" }), "account/Avatar");
assert.equal(deriveNetOnlineStatusTextRuntime({ username: "avatar", characterName: "" }), "avatar/(no-char)");
assert.equal(deriveNetOnlineStatusTextRuntime({ username: " ", characterName: " " }), "Connected.");
assert.deepEqual(currentInGameServerStatusOverlayRuntime({
  isServerConnectionBroken: true,
  nowMs: 100,
  reconnectedMessageUntilMs: 200
}), { color: "#b00000", text: "SERVER LOST" });
assert.deepEqual(currentInGameServerStatusOverlayRuntime({
  isServerConnectionBroken: false,
  nowMs: 100,
  reconnectedMessageUntilMs: 200
}), { color: "#138000", text: "RECONNECTED" });
assert.equal(currentInGameServerStatusOverlayRuntime({
  isServerConnectionBroken: false,
  nowMs: 201,
  reconnectedMessageUntilMs: 200
}), null);
assert.equal(shouldProbeReconnectRuntime({
  isAuthenticated: true,
  isServerConnectionBroken: true,
  sessionStarted: true,
  reconnectProbeInFlight: false,
  nowMs: 1500,
  reconnectProbeLastMs: 1000,
  reconnectProbeIntervalMs: 500
}), true);
assert.equal(shouldProbeReconnectRuntime({
  isAuthenticated: true,
  isServerConnectionBroken: true,
  sessionStarted: true,
  reconnectProbeInFlight: false,
  nowMs: 1499,
  reconnectProbeLastMs: 1000,
  reconnectProbeIntervalMs: 500
}), false);
assert.equal(shouldProbeReconnectRuntime({
  isAuthenticated: true,
  isServerConnectionBroken: true,
  sessionStarted: true,
  reconnectProbeInFlight: true,
  nowMs: 2000,
  reconnectProbeLastMs: 1000,
  reconnectProbeIntervalMs: 500
}), false);
assert.equal(shouldProbeReconnectRuntime({
  isAuthenticated: false,
  isServerConnectionBroken: true,
  sessionStarted: true,
  reconnectProbeInFlight: false,
  nowMs: 2000,
  reconnectProbeLastMs: 1000,
  reconnectProbeIntervalMs: 500
}), false);
assert.equal(shouldProbeReconnectRuntime({
  isAuthenticated: true,
  isServerConnectionBroken: true,
  sessionStarted: true,
  reconnectProbeInFlight: false,
  nowMs: "bad",
  reconnectProbeLastMs: 1000,
  reconnectProbeIntervalMs: 500
}), false);
assert.equal(currentInGameServerStatusOverlayRuntime({
  isServerConnectionBroken: false,
  nowMs: "bad",
  reconnectedMessageUntilMs: 200
}), null);
{
  const reconnectState = {
    reconnectedMessageClearOnCommand: false,
    reconnectedMessageUntilMs: 0
  };
  assert.equal(markServerReconnectedStateRuntime({
    durationMs: 3200,
    nowMs: 100,
    state: reconnectState
  }), reconnectState);
  assert.deepEqual(reconnectState, {
    reconnectedMessageClearOnCommand: true,
    reconnectedMessageUntilMs: 3300
  });
  assert.equal(clearTransientReconnectMessageOnCommandRuntime(reconnectState), true);
  assert.deepEqual(reconnectState, {
    reconnectedMessageClearOnCommand: false,
    reconnectedMessageUntilMs: 0
  });
  assert.equal(clearTransientReconnectMessageOnCommandRuntime(reconnectState), false);
}
assert.equal(brokenServerGameplayBlockDiagRuntime({
  isServerConnectionBroken: false,
  sessionStarted: true
}), null);
assert.equal(brokenServerGameplayBlockDiagRuntime({
  isServerConnectionBroken: true,
  sessionStarted: false
}), null);
assert.deepEqual(brokenServerGameplayBlockDiagRuntime({
  isServerConnectionBroken: true,
  sessionStarted: true
}), {
  diagClass: "diag warn",
  diagText: "Server connection lost. Waiting to reconnect before accepting commands."
});
{
  const calls: string[] = [];
  const state = {
    net: {
      backgroundSyncPaused: true,
      lastClockPollTick: 44,
      lastPresencePollTick: 55
    },
    reconnectProbeInFlight: false
  };
  assert.deepEqual(await performReconnectProbeRuntime({
    isAuthenticated: () => true,
    isServerConnectionBroken: () => true,
    markServerReconnected: () => calls.push("mark"),
    pollPresence: async () => { calls.push("presence"); },
    pollWorldClock: async () => { calls.push("clock"); },
    requestHealth: async () => { calls.push("health"); },
    state
  }), {
    attempted: true,
    reconnected: true
  });
  assert.deepEqual(calls, ["health", "clock", "presence", "mark"]);
  assert.deepEqual(state, {
    net: {
      backgroundSyncPaused: false,
      lastClockPollTick: -1,
      lastPresencePollTick: -1
    },
    reconnectProbeInFlight: false
  });
}
{
  const state = {
    net: {
      backgroundSyncPaused: true,
      lastClockPollTick: 44,
      lastPresencePollTick: 55
    },
    reconnectProbeInFlight: true
  };
  assert.deepEqual(await performReconnectProbeRuntime({
    isAuthenticated: () => true,
    isServerConnectionBroken: () => true,
    markServerReconnected: () => { throw new Error("should not mark"); },
    pollPresence: async () => { throw new Error("should not poll"); },
    pollWorldClock: async () => { throw new Error("should not poll"); },
    requestHealth: async () => { throw new Error("should not request"); },
    state
  }), {
    attempted: false,
    reconnected: false
  });
  assert.equal(state.reconnectProbeInFlight, true);
}
{
  const calls: string[] = [];
  const state = {
    net: {
      backgroundSyncPaused: true,
      lastClockPollTick: 44,
      lastPresencePollTick: 55
    },
    reconnectProbeInFlight: false
  };
  assert.deepEqual(await performReconnectProbeRuntime({
    isAuthenticated: () => true,
    isServerConnectionBroken: () => true,
    markServerReconnected: () => calls.push("mark"),
    pollPresence: async () => { calls.push("presence"); },
    pollWorldClock: async () => { calls.push("clock"); },
    requestHealth: async () => {
      calls.push("health");
      throw new Error("offline");
    },
    state
  }), {
    attempted: true,
    reconnected: false
  });
  assert.deepEqual(calls, ["health"]);
  assert.deepEqual(state, {
    net: {
      backgroundSyncPaused: true,
      lastClockPollTick: 44,
      lastPresencePollTick: 55
    },
    reconnectProbeInFlight: false
  });
}
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
assert.deepEqual(netStatusNotLoggedInRuntime(), {
  level: "idle",
  text: "Not logged in."
});
assert.deepEqual(netStatusSessionExpiredRuntime(), {
  level: "idle",
  text: "Session expired. Please log in."
});
assert.deepEqual(netStatusChooseAccountRuntime(), {
  level: "idle",
  text: "Choose an account in Account Setup, then login."
});
assert.deepEqual(netStatusAutoLoginRuntime(), {
  level: "connecting",
  text: "Auto-login..."
});
assert.deepEqual(deriveIntroPhaseUiModelRuntime("PRE_INTRO"), {
  normalized: "pre_intro",
  selectValue: "pre_intro",
  statText: "pre_intro"
});
assert.deepEqual(deriveIntroPhaseUiModelRuntime("bad"), {
  normalized: "post_intro",
  selectValue: "post_intro",
  statText: "post_intro"
});
assert.deepEqual(netLogoutDiagRuntime({
  errorMessage: String
}), {
  diagClass: "diag ok",
  diagText: "Logged out. Position saved and presence cleared."
});
assert.deepEqual(netLogoutDiagRuntime({
  saveErr: new Error("disk full"),
  errorMessage: (err) => err instanceof Error ? err.message : String(err)
}), {
  diagClass: "diag warn",
  diagText: "Logged out with warnings (position save failed: disk full)."
});
assert.deepEqual(netLogoutDiagRuntime({
  leaveErr: "presence timeout",
  errorMessage: String
}), {
  diagClass: "diag warn",
  diagText: "Logged out with warnings (presence cleanup failed: presence timeout)."
});
assert.deepEqual(netLogoutDiagRuntime({
  saveErr: "snapshot timeout",
  leaveErr: "presence timeout",
  errorMessage: String
}), {
  diagClass: "diag warn",
  diagText: "Logged out with warnings (position save failed: snapshot timeout; presence cleanup failed: presence timeout)."
});
assert.equal(deriveCriticalRecoveryStatTextRuntime({
  recoveryEventCount: 0,
  lastMaintenanceTick: -1
}), "0");
assert.equal(deriveCriticalRecoveryStatTextRuntime({
  recoveryEventCount: 4,
  lastMaintenanceTick: 123
}), "4 @123");
assert.equal(deriveCriticalRecoveryStatTextRuntime({
  recoveryEventCount: "bad",
  lastMaintenanceTick: "bad"
}), "0");

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
  const statIntroPhase = fakeElement();
  const netIntroPhaseSelect = { value: "" } as HTMLSelectElement;
  assert.deepEqual(renderIntroPhaseUiRuntime("PRE_INTRO", {
    statIntroPhase,
    netIntroPhaseSelect
  }), {
    normalized: "pre_intro",
    selectValue: "pre_intro",
    statText: "pre_intro"
  });
  assert.equal(statIntroPhase.textContent, "pre_intro");
  assert.equal(netIntroPhaseSelect.value, "pre_intro");
  assert.deepEqual(renderIntroPhaseUiRuntime("bad", {}), {
    normalized: "post_intro",
    selectValue: "post_intro",
    statText: "post_intro"
  });
}

{
  const statCriticalRecoveries = fakeElement();
  assert.equal(renderCriticalRecoveryStatRuntime(statCriticalRecoveries, {
    recoveryEventCount: 9,
    lastMaintenanceTick: 456
  }), "9 @456");
  assert.equal(statCriticalRecoveries.textContent, "9 @456");
  assert.equal(renderCriticalRecoveryStatRuntime(null, {
    recoveryEventCount: 2,
    lastMaintenanceTick: -1
  }), "2");
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
  const statNetSession = fakeElement();
  const topNetStatus = fakeElement();
  const topNetIndicator = fakeElement();
  const netQuickStatus = fakeElement();
  const netLoginButton = fakeButton();
  const statIntroPhase = fakeElement();
  const netIntroPhaseSelect = { value: "" } as HTMLSelectElement;
  const stateNet = {
    token: "token",
    userId: "u1",
    username: "rhy",
    characterName: "Avatar",
    statusLevel: "sync",
    statusText: "Polling",
    introPhase: "PRE_INTRO"
  };
  assert.deepEqual(renderNetSessionUiRuntime({
    stateNet,
    isAuthenticated: true,
    elements: {
      statNetSession,
      topNetStatus,
      topNetIndicator,
      netQuickStatus,
      netLoginButton,
      statIntroPhase,
      netIntroPhaseSelect
    }
  }), {
    normalized: "pre_intro",
    selectValue: "pre_intro",
    statText: "pre_intro"
  });
  assert.equal(stateNet.introPhase, "pre_intro");
  assert.equal(statNetSession.textContent, "rhy/Avatar");
  assert.equal(topNetStatus.textContent, "sync - Polling");
  assert.equal(topNetIndicator.dataset.state, "sync");
  assert.equal(statIntroPhase.textContent, "pre_intro");
  assert.equal(netIntroPhaseSelect.value, "pre_intro");

  applyNetStatusPresentationRuntime({
    stateNet,
    presentation: { level: "offline", text: "Paused" },
    isAuthenticated: false,
    elements: {
      statNetSession,
      topNetStatus,
      topNetIndicator,
      netQuickStatus,
      netLoginButton
    }
  });
  assert.equal(stateNet.statusLevel, "offline");
  assert.equal(stateNet.statusText, "Paused");
  assert.equal(topNetStatus.textContent, "offline - Paused");
  assert.equal(topNetIndicator.dataset.state, "offline");
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
  const callback: NetStatusTestCallback = {};
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
      callback.current = fn;
      return 42;
    },
    setTimer: (timer) => {
      storedTimer = timer;
    }
  });
  assert.deepEqual(cleared, [7]);
  assert.equal(classes.has("is-active"), true);
  assert.equal(storedTimer, 42);
  assert.ok(callback.current);
  callback.current();
  assert.equal(classes.has("is-active"), false);
  assert.equal(storedTimer, null);
}

console.log("net_status_runtime_test: ok");

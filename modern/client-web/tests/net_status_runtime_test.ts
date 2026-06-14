import assert from "node:assert/strict";
import {
  deriveNetAuthButtonModel,
  deriveNetIndicatorState,
  deriveNetQuickStatusText,
  deriveNetSessionText,
  deriveTopNetStatusText,
  pulseNetIndicatorRuntime
} from "../net/status_runtime.ts";

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

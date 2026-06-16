import assert from "node:assert/strict";
import {
  bindNetPanelActionButtonRuntime,
  netPanelActionDiagRuntime,
  runNetPanelActionRuntime
} from "../net/panel_actions_runtime.ts";

assert.deepEqual(netPanelActionDiagRuntime("ok", "Saved."), {
  diagClass: "diag ok",
  diagText: "Saved."
});
assert.deepEqual(netPanelActionDiagRuntime("warn", "Failed."), {
  diagClass: "diag warn",
  diagText: "Failed."
});

{
  const statuses: string[] = [];
  const diagnostics: string[] = [];
  await runNetPanelActionRuntime({
    run: async () => ({ user: { username: "avatar" } }),
    setStatus: (level, text) => {
      statuses.push(`${level}:${text}`);
    },
    setDiag: (kind, text) => {
      diagnostics.push(`${kind}:${text}`);
    },
    okText: (out) => `Recovery email sent for ${out.user.username}.`,
    errorStatusPrefix: "Recovery failed",
    errorDiagPrefix: "Password recovery failed"
  });
  assert.deepEqual(statuses, []);
  assert.deepEqual(diagnostics, ["ok:Recovery email sent for avatar."]);
}

{
  const statuses: string[] = [];
  const diagnostics: string[] = [];
  await runNetPanelActionRuntime({
    run: async () => {
      throw new Error("invalid code");
    },
    setStatus: (level, text) => {
      statuses.push(`${level}:${text}`);
    },
    setDiag: (kind, text) => {
      diagnostics.push(`${kind}:${text}`);
    },
    okText: "Recovery email verified.",
    errorStatusPrefix: "Verify email failed",
    errorDiagPrefix: "Verify email failed"
  });
  assert.deepEqual(statuses, ["error:Verify email failed: invalid code"]);
  assert.deepEqual(diagnostics, ["warn:Verify email failed: invalid code"]);
}

{
  let listener: (() => void) | null = null;
  const statuses: string[] = [];
  const diagnostics: string[] = [];
  const bound = bindNetPanelActionButtonRuntime({
    button: {
      addEventListener(type: "click", fn: () => void) {
        assert.equal(type, "click");
        listener = fn;
      }
    },
    run: async () => ({ ok: true }),
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (kind, text) => diagnostics.push(`${kind}:${text}`),
    okText: "Saved.",
    errorStatusPrefix: "Save failed",
    errorDiagPrefix: "Save failed"
  });
  assert.equal(bound, true);
  listener?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(statuses, []);
  assert.deepEqual(diagnostics, ["ok:Saved."]);
}

assert.equal(bindNetPanelActionButtonRuntime({
  button: null,
  run: async () => ({}),
  setStatus: () => {},
  setDiag: () => {},
  okText: "ok",
  errorStatusPrefix: "failed",
  errorDiagPrefix: "failed"
}), false);

console.log("net_panel_actions_runtime_test: ok");

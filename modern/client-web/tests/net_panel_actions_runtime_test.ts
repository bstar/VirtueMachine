import assert from "node:assert/strict";
import { runNetPanelActionRuntime } from "../net/panel_actions_runtime.ts";

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

console.log("net_panel_actions_runtime_test: ok");

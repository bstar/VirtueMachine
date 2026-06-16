import assert from "node:assert/strict";
import {
  applyDebugPanelTabRuntime,
  bindDebugPanelButtonsRuntime,
  buildDebugChatLedgerModelRuntime,
  clearDebugChatLedgerRuntime,
  debugChatLedgerClearDiagRuntime,
  debugChatLedgerCopyDiagRuntime,
  debugPanelTabModelRuntime,
  normalizeDebugPanelTabRuntime,
  renderDebugChatLedgerCountRuntime,
  renderDebugChatLedgerModelRuntime,
  renderDebugChatLedgerRuntime
} from "../ui/debug_panel_runtime.ts";

function fakeElement(): HTMLElement & {
  attrs: Record<string, string>;
  classes: Set<string>;
} {
  const el = {
    attrs: {} as Record<string, string>,
    classes: new Set<string>(),
    classList: {
      toggle(name: string, force?: boolean) {
        if (force) {
          el.classes.add(name);
        } else {
          el.classes.delete(name);
        }
      }
    },
    scrollHeight: 123,
    scrollTop: 0,
    textContent: "",
    setAttribute(name: string, value: string) {
      el.attrs[name] = value;
    }
  };
  return el as unknown as HTMLElement & { attrs: Record<string, string>; classes: Set<string> };
}

assert.equal(normalizeDebugPanelTabRuntime("chat"), "chat");
assert.equal(normalizeDebugPanelTabRuntime("runtime"), "runtime");
assert.equal(normalizeDebugPanelTabRuntime("other"), "runtime");
assert.equal(normalizeDebugPanelTabRuntime(null), "runtime");

assert.deepEqual(debugPanelTabModelRuntime("runtime"), {
  tab: "runtime",
  runtimePanelHidden: false,
  chatPanelHidden: true,
  runtimeTabActive: true,
  chatTabActive: false,
  runtimeAriaSelected: "true",
  chatAriaSelected: "false",
  refreshChatLedger: false
});

assert.deepEqual(debugPanelTabModelRuntime("chat"), {
  tab: "chat",
  runtimePanelHidden: true,
  chatPanelHidden: false,
  runtimeTabActive: false,
  chatTabActive: true,
  runtimeAriaSelected: "false",
  chatAriaSelected: "true",
  refreshChatLedger: true
});

{
  const runtimePanel = fakeElement();
  const chatPanel = fakeElement();
  const runtimeTab = fakeElement();
  const chatTab = fakeElement();
  applyDebugPanelTabRuntime(debugPanelTabModelRuntime("chat"), {
    chatPanel,
    chatTab,
    runtimePanel,
    runtimeTab
  });
  assert.equal(runtimePanel.classes.has("hidden"), true);
  assert.equal(chatPanel.classes.has("hidden"), false);
  assert.equal(runtimeTab.classes.has("is-active"), false);
  assert.equal(chatTab.classes.has("is-active"), true);
  assert.equal(runtimeTab.attrs["aria-selected"], "false");
  assert.equal(chatTab.attrs["aria-selected"], "true");
}

{
  const count = fakeElement();
  const ledgerBody = fakeElement();
  renderDebugChatLedgerRuntime({
    countText: "2 entries",
    ledgerText: "Avatar:\n>Look",
    elements: { count, ledgerBody }
  });
  assert.equal(count.textContent, "2 entries");
  assert.equal(ledgerBody.textContent, "Avatar:\n>Look");
  assert.equal(ledgerBody.scrollTop, 123);
}

renderDebugChatLedgerRuntime({
  countText: "0 entries",
  ledgerText: "",
  elements: {}
});
assert.deepEqual(buildDebugChatLedgerModelRuntime({
  ledger: [{ text: "Avatar" }, { text: ">Look" }],
  countFormatter: (count) => `${count} entries`,
  buildLedgerText: (entries) => entries.map((entry) => String(entry.text || "")).join("\n")
}), {
  count: 2,
  countText: "2 entries",
  ledgerText: "Avatar\n>Look"
});
assert.deepEqual(buildDebugChatLedgerModelRuntime({
  ledger: null,
  countFormatter: (count) => `${count} entries`,
  buildLedgerText: (entries) => entries.map((entry) => String(entry.text || "")).join("\n")
}), {
  count: 0,
  countText: "0 entries",
  ledgerText: ""
});
{
  const count = fakeElement();
  const ledgerBody = fakeElement();
  const model = renderDebugChatLedgerModelRuntime({
    ledger: [{ text: "one" }],
    countFormatter: (entryCount) => `${entryCount} entry`,
    buildLedgerText: (entries) => entries.map((entry) => String(entry.text || "")).join("\n"),
    elements: { count, ledgerBody }
  });
  assert.deepEqual(model, {
    count: 1,
    countText: "1 entry",
    ledgerText: "one"
  });
  assert.equal(count.textContent, "1 entry");
  assert.equal(ledgerBody.textContent, "one");
  assert.equal(ledgerBody.scrollTop, 123);
}
{
  const count = fakeElement();
  assert.equal(renderDebugChatLedgerCountRuntime({
    ledger: [{ text: "one" }, { text: "two" }],
    countFormatter: (entryCount) => `${entryCount} entries`,
    countTarget: count
  }), 2);
  assert.equal(count.textContent, "2 entries");
  assert.equal(renderDebugChatLedgerCountRuntime({
    ledger: null,
    countFormatter: (entryCount) => `${entryCount} entries`,
    countTarget: count
  }), 0);
  assert.equal(count.textContent, "0 entries");
  assert.equal(renderDebugChatLedgerCountRuntime({
    ledger: ["one"],
    countFormatter: (entryCount) => `${entryCount} entries`
  }), 1);
}
assert.deepEqual(debugChatLedgerCopyDiagRuntime(true), {
  diagClass: "diag ok",
  diagText: "Copied chat ledger to clipboard."
});
assert.deepEqual(debugChatLedgerCopyDiagRuntime(false), {
  diagClass: "diag warn",
  diagText: "Failed to copy chat ledger to clipboard."
});
assert.deepEqual(debugChatLedgerClearDiagRuntime(), {
  diagClass: "diag ok",
  diagText: "Cleared chat ledger history."
});
{
  const ledger = ["a", "b"];
  assert.equal(clearDebugChatLedgerRuntime(ledger), 2);
  assert.deepEqual(ledger, []);
  assert.equal(clearDebugChatLedgerRuntime(null), 0);
}

{
  const listeners: Record<string, () => void> = {};
  const button = (name: string) => ({
    addEventListener(type: "click", listener: () => void) {
      listeners[`${name}:${type}`] = listener;
    }
  });
  const calls: string[] = [];
  assert.deepEqual(bindDebugPanelButtonsRuntime({
    runtimeTab: button("runtime"),
    chatTab: button("chat"),
    copyChatButton: button("copy"),
    clearChatButton: button("clear"),
    onSelectTab: (tab) => calls.push(`tab:${tab}`),
    onCopyChat: async () => {
      calls.push("copy");
    },
    onClearChat: () => calls.push("clear")
  }), {
    boundChatTab: true,
    boundClearChat: true,
    boundCopyChat: true,
    boundRuntimeTab: true
  });
  listeners["runtime:click"]?.();
  listeners["chat:click"]?.();
  listeners["copy:click"]?.();
  listeners["clear:click"]?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["tab:runtime", "tab:chat", "copy", "clear"]);
}

assert.deepEqual(bindDebugPanelButtonsRuntime({
  onSelectTab: () => {},
  onCopyChat: () => {},
  onClearChat: () => {}
}), {
  boundChatTab: false,
  boundClearChat: false,
  boundCopyChat: false,
  boundRuntimeTab: false
});

console.log("ui_debug_panel_runtime_test: ok");

export type DebugPanelTabRuntime = "runtime" | "chat";

export type DebugPanelTabModelRuntime = {
  chatAriaSelected: "true" | "false";
  chatPanelHidden: boolean;
  chatTabActive: boolean;
  refreshChatLedger: boolean;
  runtimeAriaSelected: "true" | "false";
  runtimePanelHidden: boolean;
  runtimeTabActive: boolean;
  tab: DebugPanelTabRuntime;
};

export function normalizeDebugPanelTabRuntime(tab: unknown): DebugPanelTabRuntime {
  return tab === "chat" ? "chat" : "runtime";
}

export function debugPanelTabModelRuntime(tab: unknown): DebugPanelTabModelRuntime {
  const next = normalizeDebugPanelTabRuntime(tab);
  const runtimeActive = next === "runtime";
  return {
    tab: next,
    runtimePanelHidden: !runtimeActive,
    chatPanelHidden: runtimeActive,
    runtimeTabActive: runtimeActive,
    chatTabActive: !runtimeActive,
    runtimeAriaSelected: runtimeActive ? "true" : "false",
    chatAriaSelected: runtimeActive ? "false" : "true",
    refreshChatLedger: !runtimeActive
  };
}

export type DebugPanelTabElementsRuntime = {
  chatPanel?: HTMLElement | null;
  chatTab?: HTMLElement | null;
  runtimePanel?: HTMLElement | null;
  runtimeTab?: HTMLElement | null;
};

export type DebugChatLedgerElementsRuntime = {
  count?: HTMLElement | null;
  ledgerBody?: HTMLElement | null;
};

export type DebugChatLedgerEntryRuntime = {
  text?: unknown;
};

export type DebugChatLedgerModelRuntime = {
  count: number;
  countText: string;
  ledgerText: string;
};

export type DebugChatLedgerDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export type DebugPanelButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export function applyDebugPanelTabRuntime(
  model: DebugPanelTabModelRuntime,
  elements: DebugPanelTabElementsRuntime
): void {
  if (elements.runtimePanel) {
    elements.runtimePanel.classList.toggle("hidden", model.runtimePanelHidden);
  }
  if (elements.chatPanel) {
    elements.chatPanel.classList.toggle("hidden", model.chatPanelHidden);
  }
  if (elements.runtimeTab) {
    elements.runtimeTab.classList.toggle("is-active", model.runtimeTabActive);
    elements.runtimeTab.setAttribute("aria-selected", model.runtimeAriaSelected);
  }
  if (elements.chatTab) {
    elements.chatTab.classList.toggle("is-active", model.chatTabActive);
    elements.chatTab.setAttribute("aria-selected", model.chatAriaSelected);
  }
}

export function renderDebugChatLedgerRuntime(args: {
  countText: string;
  elements: DebugChatLedgerElementsRuntime;
  ledgerText: string;
}): void {
  if (args.elements.count) {
    args.elements.count.textContent = args.countText;
  }
  if (args.elements.ledgerBody) {
    args.elements.ledgerBody.textContent = args.ledgerText;
    args.elements.ledgerBody.scrollTop = args.elements.ledgerBody.scrollHeight;
  }
}

export function buildDebugChatLedgerModelRuntime(args: {
  buildLedgerText: (entries: readonly DebugChatLedgerEntryRuntime[]) => string;
  countFormatter: (count: number) => string;
  ledger: unknown;
}): DebugChatLedgerModelRuntime {
  const entries = Array.isArray(args.ledger)
    ? args.ledger as DebugChatLedgerEntryRuntime[]
    : [];
  const count = entries.length >>> 0;
  return {
    count,
    countText: args.countFormatter(count),
    ledgerText: args.buildLedgerText(entries)
  };
}

export function renderDebugChatLedgerModelRuntime(args: {
  buildLedgerText: (entries: readonly DebugChatLedgerEntryRuntime[]) => string;
  countFormatter: (count: number) => string;
  elements: DebugChatLedgerElementsRuntime;
  ledger: unknown;
}): DebugChatLedgerModelRuntime {
  const model = buildDebugChatLedgerModelRuntime(args);
  renderDebugChatLedgerRuntime({
    countText: model.countText,
    ledgerText: model.ledgerText,
    elements: args.elements
  });
  return model;
}

export function renderDebugChatLedgerCountRuntime(args: {
  countFormatter: (count: number) => string;
  countTarget?: HTMLElement | null;
  ledger: unknown;
}): number {
  const count = Array.isArray(args.ledger) ? args.ledger.length >>> 0 : 0;
  if (args.countTarget) {
    args.countTarget.textContent = args.countFormatter(count);
  }
  return count;
}

export function debugChatLedgerCopyDiagRuntime(ok: unknown): DebugChatLedgerDiagRuntime {
  return ok
    ? {
      diagClass: "diag ok",
      diagText: "Copied chat ledger to clipboard."
    }
    : {
      diagClass: "diag warn",
      diagText: "Failed to copy chat ledger to clipboard."
    };
}

export function debugChatLedgerClearDiagRuntime(): DebugChatLedgerDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: "Cleared chat ledger history."
  };
}

export function clearDebugChatLedgerRuntime(ledger: unknown): number {
  if (!Array.isArray(ledger)) {
    return 0;
  }
  const removed = ledger.length;
  ledger.length = 0;
  return removed;
}

export function bindDebugPanelButtonsRuntime(args: {
  chatTab?: DebugPanelButtonRuntime | null;
  clearChatButton?: DebugPanelButtonRuntime | null;
  copyChatButton?: DebugPanelButtonRuntime | null;
  onClearChat: () => void;
  onCopyChat: () => void | Promise<void>;
  onSelectTab: (tab: DebugPanelTabRuntime) => void;
  runtimeTab?: DebugPanelButtonRuntime | null;
}): {
  boundChatTab: boolean;
  boundClearChat: boolean;
  boundCopyChat: boolean;
  boundRuntimeTab: boolean;
} {
  if (args.runtimeTab) {
    args.runtimeTab.addEventListener("click", () => args.onSelectTab("runtime"));
  }
  if (args.chatTab) {
    args.chatTab.addEventListener("click", () => args.onSelectTab("chat"));
  }
  if (args.copyChatButton) {
    args.copyChatButton.addEventListener("click", () => {
      void args.onCopyChat();
    });
  }
  if (args.clearChatButton) {
    args.clearChatButton.addEventListener("click", args.onClearChat);
  }
  return {
    boundChatTab: !!args.chatTab,
    boundClearChat: !!args.clearChatButton,
    boundCopyChat: !!args.copyChatButton,
    boundRuntimeTab: !!args.runtimeTab
  };
}

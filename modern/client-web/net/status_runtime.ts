export function deriveNetIndicatorState(
  level: string,
  isAuthenticated: boolean
): "offline" | "error" | "sync" | "connecting" | "online" {
  const lvl = String(level || "idle");
  if (isAuthenticated) {
    if (lvl === "error") return "error";
    if (lvl === "sync") return "sync";
    if (lvl === "connecting") return "connecting";
    if (lvl === "offline") return "offline";
    return "online";
  }
  if (lvl === "connecting") return "connecting";
  if (lvl === "error") return "error";
  return "offline";
}

export function deriveNetQuickStatusText(isAuthenticated: boolean): string {
  return isAuthenticated ? "Account: Signed in" : "Account: Signed out";
}

export function deriveNetSessionText(args: {
  token: string;
  userId: string;
  username: string;
  characterName: string;
}): string {
  if (!String(args.token || "") || !String(args.userId || "")) {
    return "offline";
  }
  const name = String(args.characterName || "").trim() || "(no-char)";
  return `${String(args.username || "")}/${name}`;
}

export function deriveNetAuthButtonModel(isAuthenticated: boolean): {
  text: string;
  addClass: "control-btn--login" | "control-btn--logout";
  removeClasses: ["control-btn--login", "control-btn--logout"];
} {
  return {
    text: isAuthenticated ? "Logout (Shift+I)" : "Net Login (Shift+I)",
    addClass: isAuthenticated ? "control-btn--logout" : "control-btn--login",
    removeClasses: ["control-btn--login", "control-btn--logout"]
  };
}

export function deriveTopNetStatusText(level: string, text: string): string {
  return `${String(level || "idle")} - ${String(text || "")}`;
}

export function renderNetSessionStatRuntime(
  statNetSession: HTMLElement | null | undefined,
  args: {
    token: string;
    userId: string;
    username: string;
    characterName: string;
  }
): void {
  if (!statNetSession) {
    return;
  }
  statNetSession.textContent = deriveNetSessionText(args);
}

export function renderNetAuthButtonRuntime(
  netLoginButton: HTMLButtonElement | null | undefined,
  isAuthenticated: boolean
): void {
  if (!netLoginButton) {
    return;
  }
  const model = deriveNetAuthButtonModel(isAuthenticated);
  netLoginButton.textContent = model.text;
  netLoginButton.classList.remove(...model.removeClasses);
  netLoginButton.classList.add(model.addClass);
}

export type NetStatusStateRuntime = {
  token?: string;
  userId?: string;
  username?: string;
  characterName?: string;
  statusLevel: string;
  statusText: string;
};

export type NetStatusElementsRuntime = {
  statNetSession?: HTMLElement | null;
  topNetStatus?: HTMLElement | null;
  topNetIndicator?: HTMLElement | null;
  netQuickStatus?: HTMLElement | null;
  netLoginButton?: HTMLButtonElement | null;
};

export function renderNetStatusViewRuntime(args: {
  stateNet: NetStatusStateRuntime;
  isAuthenticated: boolean;
  elements: NetStatusElementsRuntime;
}): void {
  const stateNet = args.stateNet;
  const elements = args.elements;
  renderNetSessionStatRuntime(elements.statNetSession, {
    token: String(stateNet.token || ""),
    userId: String(stateNet.userId || ""),
    username: String(stateNet.username || ""),
    characterName: String(stateNet.characterName || "")
  });
  if (elements.topNetStatus) {
    elements.topNetStatus.textContent = deriveTopNetStatusText(stateNet.statusLevel, stateNet.statusText);
  }
  if (elements.topNetIndicator) {
    elements.topNetIndicator.dataset.state = deriveNetIndicatorState(stateNet.statusLevel, args.isAuthenticated);
  }
  if (elements.netQuickStatus) {
    elements.netQuickStatus.textContent = deriveNetQuickStatusText(args.isAuthenticated);
  }
  renderNetAuthButtonRuntime(elements.netLoginButton, args.isAuthenticated);
}

export function applyNetStatusRuntime(args: {
  stateNet: NetStatusStateRuntime;
  level: string;
  text: string;
  isAuthenticated: boolean;
  elements: NetStatusElementsRuntime;
}): void {
  const lvl = String(args.level || "idle");
  const msg = String(args.text || "");
  args.stateNet.statusLevel = lvl;
  args.stateNet.statusText = msg;
  renderNetStatusViewRuntime({
    stateNet: args.stateNet,
    isAuthenticated: args.isAuthenticated,
    elements: args.elements
  });
}

export function pulseNetIndicatorRuntime(args: {
  indicator?: HTMLElement | null;
  currentTimer: ReturnType<typeof setTimeout> | number | null;
  timeoutMs: number;
  setTimer: (nextTimer: ReturnType<typeof setTimeout> | number | null) => void;
  clearTimeoutFn?: (timer: ReturnType<typeof setTimeout> | number) => void;
  setTimeoutFn?: (fn: () => void, timeoutMs: number) => ReturnType<typeof setTimeout> | number;
}): void {
  if (!args.indicator) {
    return;
  }
  args.indicator.classList.add("is-active");
  if (args.currentTimer) {
    const clearTimeoutFn = args.clearTimeoutFn ?? ((timer) => window.clearTimeout(timer));
    clearTimeoutFn(args.currentTimer);
  }
  const setTimeoutFn = args.setTimeoutFn ?? ((fn, timeoutMs) => window.setTimeout(fn, timeoutMs));
  const nextTimer = setTimeoutFn(() => {
    args.indicator?.classList.remove("is-active");
    args.setTimer(null);
  }, args.timeoutMs);
  args.setTimer(nextTimer);
}

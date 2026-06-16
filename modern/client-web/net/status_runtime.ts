import { normalizeIntroPhaseRuntime } from "./world_runtime.ts";

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

export function deriveNetOnlineStatusTextRuntime(args: {
  characterName?: unknown;
  username?: unknown;
}): string {
  const username = String(args.username || "").trim();
  const characterName = String(args.characterName || "").trim();
  return username || characterName
    ? `${username || "account"}/${characterName || "(no-char)"}`
    : "Connected.";
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

export function shouldShowInGameServerBrokenRuntime(args: {
  isAuthenticated: boolean;
  statusLevel: unknown;
}): boolean {
  if (!args.isAuthenticated) {
    return false;
  }
  const level = String(args.statusLevel || "").trim().toLowerCase();
  return level === "offline" || level === "error";
}

export type InGameServerStatusOverlayRuntime = {
  color: "#138000" | "#b00000";
  text: "RECONNECTED" | "SERVER LOST";
};

export function currentInGameServerStatusOverlayRuntime(args: {
  isServerConnectionBroken: boolean;
  nowMs: unknown;
  reconnectedMessageUntilMs: unknown;
}): InGameServerStatusOverlayRuntime | null {
  if (args.isServerConnectionBroken) {
    return { color: "#b00000", text: "SERVER LOST" };
  }
  const nowMs = Number(args.nowMs);
  const reconnectedMessageUntilMs = Number(args.reconnectedMessageUntilMs);
  if (Number.isFinite(nowMs) && Number.isFinite(reconnectedMessageUntilMs) && reconnectedMessageUntilMs > nowMs) {
    return { color: "#138000", text: "RECONNECTED" };
  }
  return null;
}

export function shouldProbeReconnectRuntime(args: {
  isAuthenticated: boolean;
  isServerConnectionBroken: boolean;
  sessionStarted: boolean;
  reconnectProbeInFlight: boolean;
  nowMs: unknown;
  reconnectProbeLastMs: unknown;
  reconnectProbeIntervalMs: unknown;
}): boolean {
  if (!args.isAuthenticated || !args.isServerConnectionBroken || !args.sessionStarted || args.reconnectProbeInFlight) {
    return false;
  }
  const nowMs = Number(args.nowMs);
  const lastMs = Number(args.reconnectProbeLastMs);
  const intervalMs = Number(args.reconnectProbeIntervalMs);
  if (!Number.isFinite(nowMs) || !Number.isFinite(lastMs) || !Number.isFinite(intervalMs)) {
    return false;
  }
  return nowMs - lastMs >= Math.max(0, intervalMs);
}

export type ReconnectMessageStateRuntime = {
  reconnectedMessageClearOnCommand: boolean;
  reconnectedMessageUntilMs: number;
};

export function markServerReconnectedStateRuntime<T extends ReconnectMessageStateRuntime>(args: {
  durationMs: unknown;
  nowMs: unknown;
  state: T;
}): T {
  const nowMs = Number(args.nowMs);
  const durationMs = Number(args.durationMs);
  args.state.reconnectedMessageUntilMs =
    (Number.isFinite(nowMs) ? nowMs : 0) + Math.max(0, Number.isFinite(durationMs) ? durationMs : 0);
  args.state.reconnectedMessageClearOnCommand = true;
  return args.state;
}

export function clearTransientReconnectMessageOnCommandRuntime<T extends ReconnectMessageStateRuntime>(state: T): boolean {
  if (!state.reconnectedMessageClearOnCommand) {
    return false;
  }
  state.reconnectedMessageClearOnCommand = false;
  state.reconnectedMessageUntilMs = 0;
  return true;
}

export type BrokenServerGameplayBlockDiagRuntime = {
  diagClass: "diag warn";
  diagText: "Server connection lost. Waiting to reconnect before accepting commands.";
};

export function brokenServerGameplayBlockDiagRuntime(args: {
  isServerConnectionBroken: boolean;
  sessionStarted: boolean;
}): BrokenServerGameplayBlockDiagRuntime | null {
  if (!args.sessionStarted || !args.isServerConnectionBroken) {
    return null;
  }
  return {
    diagClass: "diag warn",
    diagText: "Server connection lost. Waiting to reconnect before accepting commands."
  };
}

export type ReconnectProbeStateRuntime = {
  net: {
    backgroundSyncPaused: boolean;
    lastClockPollTick: number;
    lastPresencePollTick: number;
  };
  reconnectProbeInFlight: boolean;
};

export async function performReconnectProbeRuntime<TState extends ReconnectProbeStateRuntime>(args: {
  isAuthenticated: () => boolean;
  isServerConnectionBroken: () => boolean;
  markServerReconnected: () => void;
  pollPresence: () => Promise<unknown>;
  pollWorldClock: () => Promise<unknown>;
  requestHealth: () => Promise<unknown>;
  state: TState;
}): Promise<{
  attempted: boolean;
  reconnected: boolean;
}> {
  if (args.state.reconnectProbeInFlight || !args.isAuthenticated() || !args.isServerConnectionBroken()) {
    return {
      attempted: false,
      reconnected: false
    };
  }
  args.state.reconnectProbeInFlight = true;
  try {
    await args.requestHealth();
    args.state.net.backgroundSyncPaused = false;
    args.state.net.lastClockPollTick = -1;
    args.state.net.lastPresencePollTick = -1;
    await args.pollWorldClock();
    await args.pollPresence();
    args.markServerReconnected();
    return {
      attempted: true,
      reconnected: true
    };
  } catch (_err) {
    return {
      attempted: true,
      reconnected: false
    };
  } finally {
    args.state.reconnectProbeInFlight = false;
  }
}

export type NetStatusPresentationRuntime = {
  level: "idle" | "error" | "offline" | "online" | "sync" | "connecting";
  text: string;
};

export function netStatusNotLoggedInRuntime(): NetStatusPresentationRuntime {
  return {
    level: "idle",
    text: "Not logged in."
  };
}

export function netStatusSessionExpiredRuntime(): NetStatusPresentationRuntime {
  return {
    level: "idle",
    text: "Session expired. Please log in."
  };
}

export function netStatusChooseAccountRuntime(): NetStatusPresentationRuntime {
  return {
    level: "idle",
    text: "Choose an account in Account Setup, then login."
  };
}

export function netStatusAutoLoginRuntime(): NetStatusPresentationRuntime {
  return {
    level: "connecting",
    text: "Auto-login..."
  };
}

export function deriveIntroPhaseUiModelRuntime(phase: unknown): {
  normalized: "pre_intro" | "post_intro";
  selectValue: "pre_intro" | "post_intro";
  statText: "pre_intro" | "post_intro";
} {
  const normalized = normalizeIntroPhaseRuntime(phase);
  return {
    normalized,
    selectValue: normalized,
    statText: normalized
  };
}

export type IntroPhaseElementsRuntime = {
  netIntroPhaseSelect?: HTMLSelectElement | null;
  statIntroPhase?: HTMLElement | null;
};

export function renderIntroPhaseUiRuntime(
  phase: unknown,
  elements: IntroPhaseElementsRuntime
): ReturnType<typeof deriveIntroPhaseUiModelRuntime> {
  const model = deriveIntroPhaseUiModelRuntime(phase);
  if (elements.statIntroPhase) {
    elements.statIntroPhase.textContent = model.statText;
  }
  if (elements.netIntroPhaseSelect) {
    elements.netIntroPhaseSelect.value = model.selectValue;
  }
  return model;
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

export type NetSessionUiElementsRuntime = NetStatusElementsRuntime & IntroPhaseElementsRuntime;

export function deriveCriticalRecoveryStatTextRuntime(args: {
  lastMaintenanceTick?: unknown;
  recoveryEventCount?: unknown;
}): string {
  const count = Number(args.recoveryEventCount) >>> 0;
  const tick = Number(args.lastMaintenanceTick);
  const suffix = Number.isFinite(tick) && tick >= 0 ? ` @${tick | 0}` : "";
  return `${count}${suffix}`;
}

export type NetLogoutDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export function netLogoutDiagRuntime(args: {
  saveErr?: unknown;
  leaveErr?: unknown;
  errorMessage: (err: unknown) => string;
}): NetLogoutDiagRuntime {
  const parts: string[] = [];
  if (args.saveErr) {
    parts.push(`position save failed: ${args.errorMessage(args.saveErr)}`);
  }
  if (args.leaveErr) {
    parts.push(`presence cleanup failed: ${args.errorMessage(args.leaveErr)}`);
  }
  if (parts.length > 0) {
    return {
      diagClass: "diag warn",
      diagText: `Logged out with warnings (${parts.join("; ")}).`
    };
  }
  return {
    diagClass: "diag ok",
    diagText: "Logged out. Position saved and presence cleared."
  };
}

export function renderCriticalRecoveryStatRuntime(
  statCriticalRecoveries: HTMLElement | null | undefined,
  args: {
    lastMaintenanceTick?: unknown;
    recoveryEventCount?: unknown;
  }
): string {
  const text = deriveCriticalRecoveryStatTextRuntime(args);
  if (statCriticalRecoveries) {
    statCriticalRecoveries.textContent = text;
  }
  return text;
}

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

export function applyNetStatusPresentationRuntime(args: {
  stateNet: NetStatusStateRuntime;
  presentation: { level: string; text: string };
  isAuthenticated: boolean;
  elements: NetStatusElementsRuntime;
}): void {
  applyNetStatusRuntime({
    stateNet: args.stateNet,
    level: args.presentation.level,
    text: args.presentation.text,
    isAuthenticated: args.isAuthenticated,
    elements: args.elements
  });
}

export function renderNetSessionUiRuntime(args: {
  stateNet: NetStatusStateRuntime & { introPhase?: unknown };
  isAuthenticated: boolean;
  elements: NetSessionUiElementsRuntime;
}): ReturnType<typeof deriveIntroPhaseUiModelRuntime> {
  renderNetStatusViewRuntime({
    stateNet: args.stateNet,
    isAuthenticated: args.isAuthenticated,
    elements: args.elements
  });
  const intro = renderIntroPhaseUiRuntime(args.stateNet.introPhase, args.elements);
  args.stateNet.introPhase = intro.normalized;
  return intro;
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

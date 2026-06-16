export function normalizeStartupMenuIndexRuntime(nextIndex: number, count: number): number {
  const c = count | 0;
  if (c <= 0) {
    return 0;
  }
  let idx = nextIndex | 0;
  if (idx < 0) {
    idx = c - 1;
  } else if (idx >= c) {
    idx = 0;
  }
  return idx;
}

export type StartupMenuIndexStateRuntime = {
  startupCanvasCache?: { clear(): void } | null;
  startupMenuIndex: number;
};

export function applyStartupMenuIndexRuntime(
  state: StartupMenuIndexStateRuntime,
  nextIndex: unknown,
  menuCount: unknown
): {
  changed: boolean;
  nextIndex: number;
  previousIndex: number;
} {
  const previousIndex = Number(state.startupMenuIndex) | 0;
  const normalized = normalizeStartupMenuIndexRuntime(Number(nextIndex) | 0, Number(menuCount) | 0);
  const changed = previousIndex !== normalized;
  if (changed) {
    state.startupCanvasCache?.clear();
  }
  state.startupMenuIndex = normalized;
  return {
    changed,
    nextIndex: normalized,
    previousIndex
  };
}

export type StartupMenuKeyActionRuntime =
  | { kind: "none" }
  | { kind: "move"; delta: -1 | 1 }
  | { kind: "select_current" }
  | { kind: "select_index"; index: number };

export type StartupMenuKeyPatchRuntime = {
  activateSelection: boolean;
  handled: boolean;
  nextIndex: number | null;
};

export function startupMenuKeyActionRuntime(key: unknown): StartupMenuKeyActionRuntime {
  const k = String(key || "").toLowerCase();
  if (k === "arrowup") {
    return { kind: "move", delta: -1 };
  }
  if (k === "arrowdown") {
    return { kind: "move", delta: 1 };
  }
  if (k === "i") return { kind: "select_index", index: 0 };
  if (k === "c") return { kind: "select_index", index: 1 };
  if (k === "t") return { kind: "select_index", index: 2 };
  if (k === "a") return { kind: "select_index", index: 3 };
  if (k === "j") return { kind: "select_index", index: 4 };
  if (k === "enter" || k === " ") {
    return { kind: "select_current" };
  }
  return { kind: "none" };
}

export function startupMenuKeyPatchRuntime(args: {
  currentIndex: unknown;
  key: unknown;
  menuCount: unknown;
}): StartupMenuKeyPatchRuntime {
  const action = startupMenuKeyActionRuntime(args.key);
  if (action.kind === "move") {
    return {
      activateSelection: false,
      handled: true,
      nextIndex: normalizeStartupMenuIndexRuntime((Number(args.currentIndex) | 0) + action.delta, Number(args.menuCount) | 0)
    };
  }
  if (action.kind === "select_index") {
    return {
      activateSelection: true,
      handled: true,
      nextIndex: normalizeStartupMenuIndexRuntime(action.index, Number(args.menuCount) | 0)
    };
  }
  if (action.kind === "select_current") {
    return {
      activateSelection: true,
      handled: true,
      nextIndex: null
    };
  }
  return {
    activateSelection: false,
    handled: false,
    nextIndex: null
  };
}

export function startupMenuIndexAtLogicalPosRuntime(
  lx: number,
  ly: number,
  hitbox: {
    x0: number;
    x1: number;
    rows: Array<[number, number]>;
  }
): number {
  if (lx < hitbox.x0 || lx > hitbox.x1) {
    return -1;
  }
  for (let i = 0; i < hitbox.rows.length; i += 1) {
    const row = hitbox.rows[i];
    if (ly > row[0] && ly < row[1]) {
      return i;
    }
  }
  return -1;
}

export function startupMenuIndexAtSurfacePointRuntime(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
  surfaceSize: { width: number; height: number },
  hitbox: {
    x0: number;
    x1: number;
    rows: Array<[number, number]>;
  }
): number {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return -1;
  }
  if (surfaceSize.width <= 0 || surfaceSize.height <= 0) {
    return -1;
  }
  const px = ((clientX - bounds.left) * surfaceSize.width) / bounds.width;
  const py = ((clientY - bounds.top) * surfaceSize.height) / bounds.height;
  const menuScale = Math.max(1, Math.floor(surfaceSize.width / 320));
  const lx = Math.floor(px / menuScale);
  const ly = Math.floor(py / menuScale);
  return startupMenuIndexAtLogicalPosRuntime(lx, ly, hitbox);
}

export function startupMenuItemEnabledRuntime(
  item: { id?: string; enabled?: boolean } | null | undefined,
  isAuthenticated: boolean
): boolean {
  if (!item) {
    return false;
  }
  if (!item.enabled) {
    return false;
  }
  if (item.id === "journey") {
    return !!isAuthenticated;
  }
  return true;
}

export type StartupMenuSelectionActionRuntime =
  | { kind: "none" }
  | { kind: "start_session" }
  | { kind: "login_required"; message: string }
  | { kind: "unavailable"; message: string };

export type StartupMenuSelectionPresentationRuntime =
  | { kind: "none" }
  | { kind: "start_session" }
  | {
    diagClass: "diag warn";
    diagText: string;
    kind: "message";
    netStatus?: "idle";
  };

export function startupMenuSelectionActionRuntime(
  menu: readonly ({ id?: string; label?: string; enabled?: boolean } | null | undefined)[],
  index: number,
  isAuthenticated: boolean
): StartupMenuSelectionActionRuntime {
  if (!menu.length) {
    return { kind: "none" };
  }
  const selected = menu[index | 0] || menu[0];
  if (!startupMenuItemEnabledRuntime(selected, isAuthenticated)) {
    if (selected && selected.id === "journey" && !isAuthenticated) {
      return { kind: "login_required", message: "Login required before Journey Onward." };
    }
    const label = selected ? String(selected.label || "This option") : "This option";
    return { kind: "unavailable", message: `"${label}" is not available in this build.` };
  }
  if (selected?.id === "journey") {
    return { kind: "start_session" };
  }
  return { kind: "none" };
}

export function startupMenuSelectionPresentationRuntime(
  action: StartupMenuSelectionActionRuntime
): StartupMenuSelectionPresentationRuntime {
  if (action.kind === "login_required") {
    return {
      diagClass: "diag warn",
      diagText: action.message,
      kind: "message",
      netStatus: "idle"
    };
  }
  if (action.kind === "unavailable") {
    return {
      diagClass: "diag warn",
      diagText: action.message,
      kind: "message"
    };
  }
  return { kind: action.kind };
}

export function journeyOnwardStartedDiagRuntime(resumed: unknown): {
  diagClass: "diag ok";
  diagText: string;
} {
  return {
    diagClass: "diag ok",
    diagText: resumed
      ? "Journey Onward: resumed at last saved position."
      : "Journey Onward: loaded at the legacy avatar start position."
  };
}

export type StartupSessionGuardDiagRuntime = {
  diagClass: "diag warn";
  diagText: string;
  netStatus?: "idle";
};

export function startupSessionGuardDiagRuntime(reason: "login_required" | "runtime_loading"): StartupSessionGuardDiagRuntime {
  if (reason === "login_required") {
    return {
      diagClass: "diag warn",
      diagText: "Login required before Journey Onward.",
      netStatus: "idle"
    };
  }
  return {
    diagClass: "diag warn",
    diagText: "Runtime assets are still loading."
  };
}

export function startupRuntimeModeTextRuntime(profile: unknown, extensions: readonly unknown[] | null | undefined): string {
  const base = String(profile || "").trim() || "default";
  const ext = Array.isArray(extensions)
    ? extensions.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  return ext.length ? `${base} + ${ext.join(",")}` : base;
}

export function startupAssetsReadyDiagRuntime(args: {
  hasMapContext: unknown;
  profile: unknown;
  runtimeExtensions?: readonly unknown[] | null;
}): {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
} {
  const runtimeModeText = startupRuntimeModeTextRuntime(args.profile, args.runtimeExtensions || []);
  if (args.hasMapContext) {
    return {
      diagClass: "diag ok",
      diagText: `Startup menu ready (${runtimeModeText}): select Journey Onward to enter the throne room.`
    };
  }
  return {
    diagClass: "diag warn",
    diagText: `Assets missing (${runtimeModeText}): startup menu running in fallback mode.`
  };
}

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

export type StartupPreferenceStorageRuntime = {
  setItem(key: string, value: string): void;
};

export type StartupSkipIntroCheckboxRuntime = {
  checked: boolean;
  addEventListener?(type: "change", listener: () => void): void;
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

export type StartupMenuRenderPlanRectRuntime = {
  fillStyle: string;
  h: number;
  w: number;
  x: number;
  y: number;
};

export type StartupMenuRenderPlanStrokeRuntime = StartupMenuRenderPlanRectRuntime & {
  strokeStyle: string;
};

export type StartupMenuRenderPlanTextRuntime = {
  color: string;
  scale: number;
  text: string;
  x: number;
  y: number;
};

export type StartupMenuRenderPlanTileRuntime = {
  scale: number;
  tileId: number;
  x: number;
  y: number;
};

export type StartupMenuRenderPlanArtSpriteRuntime = {
  key: "title" | "subtitle" | "menu";
  x: number;
  y: number;
};

export type StartupMenuRenderPlanRuntime = {
  artSprites: StartupMenuRenderPlanArtSpriteRuntime[];
  clear: StartupMenuRenderPlanRectRuntime;
  rects: StartupMenuRenderPlanRectRuntime[];
  strokes: StartupMenuRenderPlanStrokeRuntime[];
  texts: StartupMenuRenderPlanTextRuntime[];
  tiles: StartupMenuRenderPlanTileRuntime[];
  useStartupArt: boolean;
};

export function buildStartupMenuRenderPlanRuntime(args: {
  hasStartupArt?: unknown;
  hudTextColor?: unknown;
  isAuthenticated: boolean;
  menu: readonly ({ id?: string; label?: string; enabled?: boolean } | null | undefined)[];
  scale?: unknown;
  selectedIndex?: unknown;
  slotTileId: unknown;
}): StartupMenuRenderPlanRuntime {
  const scale = Math.max(1, Number(args.scale) | 0);
  const x = (v: number): number => v * scale;
  const y = (v: number): number => v * scale;
  const useStartupArt = !!args.hasStartupArt;
  const plan: StartupMenuRenderPlanRuntime = {
    artSprites: [],
    clear: { fillStyle: "#000000", x: 0, y: 0, w: x(320), h: y(200) },
    rects: [],
    strokes: [],
    texts: [],
    tiles: [],
    useStartupArt
  };
  if (useStartupArt) {
    plan.artSprites.push(
      { key: "title", x: x(0x13), y: y(0x00) },
      { key: "subtitle", x: x(0x3b), y: y(0x2f) },
      { key: "menu", x: x(0x31), y: y(0x53) }
    );
    return plan;
  }

  const slotTileId = Number(args.slotTileId) | 0;
  for (let i = 0; i < 20; i += 1) {
    plan.tiles.push(
      { tileId: slotTileId, x: x(i * 16), y: 0, scale },
      { tileId: slotTileId, x: x(i * 16), y: y(184), scale }
    );
  }
  for (let i = 1; i < 11; i += 1) {
    plan.tiles.push(
      { tileId: slotTileId, x: 0, y: y(i * 16), scale },
      { tileId: slotTileId, x: x(304), y: y(i * 16), scale }
    );
  }

  const textScale = Math.max(1, scale);
  const hudTextColor = String(args.hudTextColor || "#8b3f24");
  plan.texts.push(
    { text: "ULTIMA VI", x: x(112), y: y(30), scale: textScale, color: hudTextColor },
    { text: "THE FALSE PROPHET", x: x(94), y: y(44), scale: textScale, color: hudTextColor }
  );

  const selectedIndex = Number(args.selectedIndex) | 0;
  for (let i = 0; i < args.menu.length; i += 1) {
    const item = args.menu[i];
    const enabled = startupMenuItemEnabledRuntime(item, args.isAuthenticated);
    const rowY = 74 + (i * 20);
    const selected = i === selectedIndex;
    plan.rects.push({
      fillStyle: selected ? "#5f2e1d" : "#1f1a14",
      x: x(62),
      y: y(rowY),
      w: x(196),
      h: y(16)
    });
    plan.strokes.push({
      fillStyle: "",
      strokeStyle: selected ? "#d7b981" : "#6a5131",
      x: x(62) + 0.5,
      y: y(rowY) + 0.5,
      w: x(196) - 1,
      h: y(16) - 1
    });
    if (selected) {
      plan.texts.push({
        text: ">>",
        x: x(68),
        y: y(rowY + 4),
        scale: textScale,
        color: "#f2dfb6"
      });
    }
    plan.texts.push({
      text: String(item?.label || ""),
      x: x(86),
      y: y(rowY + 4),
      scale: textScale,
      color: enabled ? (selected ? "#f2dfb6" : "#d8be8a") : "#76644a"
    });
  }
  plan.texts.push({
    text: "Use ARROWS + ENTER",
    x: x(98),
    y: y(162),
    scale: textScale,
    color: "#8e7a55"
  });
  return plan;
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

export function writeSkipIntroPreferenceRuntime(args: {
  checkbox?: { checked: boolean } | null;
  enabled: unknown;
  key: string;
  storage?: StartupPreferenceStorageRuntime | null;
}): {
  enabled: boolean;
  stored: boolean;
  value: "on" | "off";
} {
  const enabled = !!args.enabled;
  const value = enabled ? "on" : "off";
  if (args.checkbox) {
    args.checkbox.checked = enabled;
  }
  let stored = false;
  if (args.storage) {
    try {
      args.storage.setItem(args.key, value);
      stored = true;
    } catch (_err) {
      stored = false;
    }
  }
  return { enabled, stored, value };
}

export function shouldStartSessionFromSkipIntroRuntime(args: {
  isAuthenticated: unknown;
  runtimeReady: unknown;
  sessionStarted: unknown;
  skipIntroEnabled: unknown;
}): boolean {
  return !!args.skipIntroEnabled
    && !args.sessionStarted
    && !!args.runtimeReady
    && !!args.isAuthenticated;
}

export function bindSkipIntroPreferenceRuntime(args: {
  checkbox: StartupSkipIntroCheckboxRuntime;
  key: string;
  onMaybeStart: () => void;
  setEnabled?: ((enabled: boolean) => void) | null;
  storage?: StartupPreferenceStorageRuntime | null;
}): {
  bound: boolean;
  initialEnabled: boolean;
} {
  const apply = args.setEnabled || ((enabled: boolean) => {
    writeSkipIntroPreferenceRuntime({
      checkbox: args.checkbox,
      enabled,
      key: args.key,
      storage: args.storage
    });
  });
  args.checkbox.checked = true;
  apply(true);
  if (args.checkbox.addEventListener) {
    args.checkbox.addEventListener("change", () => {
      apply(args.checkbox.checked);
      if (args.checkbox.checked) {
        args.onMaybeStart();
      }
    });
  }
  return {
    bound: !!args.checkbox.addEventListener,
    initialEnabled: true
  };
}

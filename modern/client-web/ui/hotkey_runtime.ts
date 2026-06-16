export type DebugHotkeyActionRuntime =
  | "none"
  | "save_snapshot"
  | "load_snapshot"
  | "toggle_sound"
  | "toggle_help"
  | "version_string"
  | "login_logout"
  | "capture_probe"
  | "toggle_legacy_hud"
  | "cycle_probe_mode"
  | "critical_maintenance"
  | "capture_viewport"
  | "capture_worldhud"
  | "toggle_overlay"
  | "toggle_animation"
  | "toggle_palette_fx"
  | "toggle_movement"
  | "jump_preset"
  | "reset_run"
  | "verify_replay"
  | "cursor_prev"
  | "cursor_next"
  | "legacy_scale_prev"
  | "legacy_scale_next";

export type HotkeyEventRuntime = {
  altKey?: boolean;
  code?: unknown;
  ctrlKey?: boolean;
  key?: unknown;
  shiftKey?: boolean;
};

export type LegacyHudHitRuntime =
  | { kind: "inventory"; index: number }
  | { kind: "portrait" }
  | { kind: "equip"; slot: number };

export type HotkeyDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export type HotkeyFailurePresentationRuntime = HotkeyDiagRuntime & {
  diagClass: "diag warn";
  statusLevel: "error";
  statusText: string;
};

export type HelpPanelToggleTargetRuntime = {
  classList: {
    contains(token: string): boolean;
    toggle(token: string): boolean;
  };
};

export type DebugHotkeyHandlersRuntime = Partial<Record<Exclude<DebugHotkeyActionRuntime, "none">, () => void>>;

export function debugHotkeyActionRuntime(ev: HotkeyEventRuntime): DebugHotkeyActionRuntime {
  const k = String(ev.key || "").toLowerCase();
  const code = String(ev.code || "");
  if (ev.ctrlKey && k === "s") return "save_snapshot";
  if (ev.ctrlKey && k === "r") return "load_snapshot";
  if (ev.ctrlKey && k === "z") return "toggle_sound";
  if (ev.ctrlKey && k === "h") return "toggle_help";
  if (ev.ctrlKey && k === "v") return "version_string";
  if (!ev.shiftKey) return "none";
  if (k === "i") return "login_logout";
  if (k === "y") return "save_snapshot";
  if (k === "u") return "load_snapshot";
  if (k === "j") return "capture_probe";
  if (k === "k") return "toggle_legacy_hud";
  if (k === "l") return "cycle_probe_mode";
  if (k === "n") return "critical_maintenance";
  if (k === "p") return ev.altKey ? "capture_worldhud" : "capture_viewport";
  if (k === "o") return "toggle_overlay";
  if (k === "f") return "toggle_animation";
  if (k === "b") return "toggle_palette_fx";
  if (k === "m") return "toggle_movement";
  if (k === "g") return "jump_preset";
  if (k === "r") return "reset_run";
  if (k === "v") return "verify_replay";
  if (code === "Comma") return "cursor_prev";
  if (code === "Period") return "cursor_next";
  if (code === "BracketLeft") return "legacy_scale_prev";
  if (code === "BracketRight") return "legacy_scale_next";
  return "none";
}

export function runDebugHotkeyActionRuntime(action: DebugHotkeyActionRuntime, handlers: DebugHotkeyHandlersRuntime): boolean {
  if (action === "none") {
    return false;
  }
  const handler = handlers[action];
  if (!handler) {
    return false;
  }
  handler();
  return true;
}

export function legacyHudLayerTextRuntime(hidden: unknown): string {
  return hidden
    ? "Legacy HUD layer hidden (deviation mode)."
    : "Legacy HUD layer visible.";
}

export function legacyHudLayerDiagRuntime(hidden: unknown): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: legacyHudLayerTextRuntime(hidden)
  };
}

export function legacyHudHitTextRuntime(hit: LegacyHudHitRuntime): string {
  if (hit.kind === "inventory") {
    return `Legacy HUD: inventory cell ${Number(hit.index) | 0} (C_155D_1267).`;
  }
  if (hit.kind === "portrait") {
    return "Legacy HUD: portrait cell (C_155D_1267).";
  }
  return `Legacy HUD: equipment slot ${Number(hit.slot) | 0} (C_155D_130E).`;
}

export function legacyHudHitDiagRuntime(hit: LegacyHudHitRuntime): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: legacyHudHitTextRuntime(hit)
  };
}

export function helpPanelToggleDiagRuntime(hidden: unknown): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: hidden ? "Help hidden." : "Help visible."
  };
}

export function toggleHelpPanelRuntime(panel: HelpPanelToggleTargetRuntime | null | undefined): HotkeyDiagRuntime | null {
  if (!panel) {
    return null;
  }
  panel.classList.toggle("hidden");
  return helpPanelToggleDiagRuntime(panel.classList.contains("hidden"));
}

export function versionStringHotkeyDiagRuntime(): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: "VirtueMachine: legacy Ctrl+V key mapped (version string TBD)."
  };
}

export function netLoginHotkeyOkDiagRuntime(username: unknown, characterName: unknown): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Net login ok: ${String(username || "")}/${String(characterName || "")}`
  };
}

export function netLoginHotkeyFailedDiagRuntime(reason: unknown): HotkeyFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Net login failed: ${text}`,
    statusLevel: "error",
    statusText: `Login failed: ${text}`
  };
}

export function worldSnapshotSavedHotkeyDiagRuntime(tick: unknown): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `World snapshot saved at tick ${Number(tick) >>> 0}.`
  };
}

export function worldSnapshotSaveFailedHotkeyDiagRuntime(reason: unknown): HotkeyFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `World save failed: ${text}`,
    statusLevel: "error",
    statusText: `Save failed: ${text}`
  };
}

export function worldSnapshotLoadedHotkeyDiagRuntime(tick: unknown): HotkeyDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `World snapshot loaded at tick ${Number(tick) >>> 0}.`
  };
}

export function worldSnapshotLoadFailedHotkeyDiagRuntime(reason: unknown): HotkeyFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `World load failed: ${text}`,
    statusLevel: "error",
    statusText: `Load failed: ${text}`
  };
}

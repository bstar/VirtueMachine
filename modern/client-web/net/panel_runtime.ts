export type NetPanelDefaults = {
  apiBase: string;
  username: string;
  password: string;
  email: string;
  passwordVisible: "on" | "off";
  characterName: string;
  maintenance: "on" | "off";
  autoLogin: "on" | "off";
};

export type NetPanelStorageKeys = {
  apiBase: string;
  username: string;
  password: string;
  email: string;
  passwordVisible: string;
  characterName: string;
  maintenance: string;
  autoLogin: string;
};

export function loadNetPanelPrefs(
  keys: NetPanelStorageKeys,
  defaults: NetPanelDefaults
): NetPanelDefaults {
  const out: NetPanelDefaults = { ...defaults };
  try {
    out.apiBase = localStorage.getItem(keys.apiBase) || out.apiBase;
    out.username = localStorage.getItem(keys.username) || out.username;
    out.password = localStorage.getItem(keys.password) || out.password;
    out.email = localStorage.getItem(keys.email) || out.email;
    out.passwordVisible = (localStorage.getItem(keys.passwordVisible) || out.passwordVisible) as "on" | "off";
    out.characterName = localStorage.getItem(keys.characterName) || out.characterName;
    out.maintenance = (localStorage.getItem(keys.maintenance) || out.maintenance) as "on" | "off";
    out.autoLogin = (localStorage.getItem(keys.autoLogin) || out.autoLogin) as "on" | "off";
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  return out;
}

export function saveNetPanelPref(storageKey: string, value: string): void {
  try {
    localStorage.setItem(storageKey, String(value || ""));
  } catch (_err) {
    // ignore storage failures
  }
}

export type NetPanelInitialStateRuntime = {
  apiBase: string;
  username: string;
  email: string;
  characterName: string;
  maintenanceAuto: boolean;
};

export type NetPanelStateTargetRuntime = {
  apiBase: string;
  username: string;
  email: string;
  characterName: string;
  maintenanceAuto: boolean;
};

export function netPanelInitialStateFromPrefsRuntime(prefs: NetPanelDefaults): NetPanelInitialStateRuntime {
  return {
    apiBase: String(prefs.apiBase || ""),
    username: String(prefs.username || ""),
    email: String(prefs.email || ""),
    characterName: String(prefs.characterName || "Avatar") || "Avatar",
    maintenanceAuto: prefs.maintenance === "on"
  };
}

export function applyNetPanelInitialStateRuntime(args: {
  maintenanceToggle?: { value: string } | null;
  prefs: NetPanelDefaults;
  stateNet: NetPanelStateTargetRuntime;
}): NetPanelInitialStateRuntime {
  const initial = netPanelInitialStateFromPrefsRuntime(args.prefs);
  args.stateNet.apiBase = initial.apiBase;
  args.stateNet.username = initial.username;
  args.stateNet.email = initial.email;
  args.stateNet.characterName = initial.characterName;
  args.stateNet.maintenanceAuto = initial.maintenanceAuto;
  if (args.maintenanceToggle) {
    args.maintenanceToggle.value = initial.maintenanceAuto ? "on" : "off";
  }
  return initial;
}

export function persistNetLoginSettings(
  keys: {
    apiBase: string;
    username: string;
    characterName: string;
    email: string;
  },
  values: {
    apiBase: string;
    username: string;
    characterName: string;
    email: string;
  }
): void {
  saveNetPanelPref(keys.apiBase, values.apiBase);
  saveNetPanelPref(keys.username, values.username);
  saveNetPanelPref(keys.characterName, values.characterName);
  saveNetPanelPref(keys.email, values.email);
}

export function setModalOpenRuntime(
  modal: HTMLElement | null | undefined,
  open: boolean
): void {
  if (!modal) {
    return;
  }
  const visible = !!open;
  modal.classList.toggle("hidden", !visible);
  modal.setAttribute("aria-hidden", visible ? "false" : "true");
}

export type NetPanelButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export function bindNetPanelModalButtonsRuntime(args: {
  backdrop?: NetPanelButtonRuntime | null;
  closeButton?: NetPanelButtonRuntime | null;
  openButton?: NetPanelButtonRuntime | null;
  onBeforeOpen?: () => void;
  setOpen: (open: boolean) => void;
}): {
  boundBackdrop: boolean;
  boundClose: boolean;
  boundOpen: boolean;
} {
  if (args.openButton) {
    args.openButton.addEventListener("click", () => {
      args.onBeforeOpen?.();
      args.setOpen(true);
    });
  }
  if (args.closeButton) {
    args.closeButton.addEventListener("click", () => args.setOpen(false));
  }
  if (args.backdrop) {
    args.backdrop.addEventListener("click", () => args.setOpen(false));
  }
  return {
    boundBackdrop: !!args.backdrop,
    boundClose: !!args.closeButton,
    boundOpen: !!args.openButton
  };
}

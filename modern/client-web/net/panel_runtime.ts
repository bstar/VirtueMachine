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

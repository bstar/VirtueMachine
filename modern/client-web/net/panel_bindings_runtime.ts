import { saveNetPanelPref } from "./panel_runtime.ts";

export function applyNetPanelPrefsToControlsRuntime(
  prefs: {
    apiBase: string;
    username: string;
    password: string;
    email: string;
    passwordVisible: "on" | "off";
    characterName: string;
    autoLogin: "on" | "off";
  },
  controls: {
    apiBaseInput?: HTMLInputElement | null;
    usernameInput?: HTMLInputElement | null;
    passwordInput?: HTMLInputElement | null;
    passwordToggleButton?: HTMLButtonElement | null;
    emailInput?: HTMLInputElement | null;
    characterNameInput?: HTMLInputElement | null;
    autoLoginCheckbox?: HTMLInputElement | null;
  }
): void {
  if (controls.apiBaseInput) {
    controls.apiBaseInput.value = prefs.apiBase;
  }
  if (controls.usernameInput) {
    controls.usernameInput.value = prefs.username;
  }
  if (controls.passwordInput) {
    controls.passwordInput.value = prefs.password;
    controls.passwordInput.type = prefs.passwordVisible === "on" ? "text" : "password";
  }
  if (controls.passwordToggleButton) {
    const isVisible = prefs.passwordVisible === "on";
    controls.passwordToggleButton.textContent = isVisible ? "Hide" : "Show";
    controls.passwordToggleButton.title = isVisible ? "Hide password" : "Show password";
  }
  if (controls.emailInput) {
    controls.emailInput.value = prefs.email;
  }
  if (controls.characterNameInput) {
    controls.characterNameInput.value = prefs.characterName;
  }
  if (controls.autoLoginCheckbox) {
    controls.autoLoginCheckbox.checked = prefs.autoLogin === "on";
  }
}

export function bindNetPanelPrefPersistenceRuntime(args: {
  controls: {
    apiBaseInput?: HTMLInputElement | null;
    usernameInput?: HTMLInputElement | null;
    passwordInput?: HTMLInputElement | null;
    passwordToggleButton?: HTMLButtonElement | null;
    emailInput?: HTMLInputElement | null;
    characterNameInput?: HTMLInputElement | null;
    autoLoginCheckbox?: HTMLInputElement | null;
    maintenanceToggle?: HTMLSelectElement | null;
  };
  keys: {
    apiBase: string;
    username: string;
    password: string;
    email: string;
    passwordVisible: string;
    characterName: string;
    autoLogin: string;
    maintenance: string;
  };
  isAuthenticated: () => boolean;
  setStatus: (level: string, text: string) => void;
  setMaintenanceAuto: (enabled: boolean) => void;
}): void {
  const c = args.controls;
  const k = args.keys;
  if (c.apiBaseInput) {
    c.apiBaseInput.addEventListener("input", () => {
      saveNetPanelPref(k.apiBase, String(c.apiBaseInput?.value || ""));
    });
  }
  if (c.usernameInput) {
    c.usernameInput.addEventListener("input", () => {
      saveNetPanelPref(k.username, String(c.usernameInput?.value || ""));
    });
  }
  if (c.passwordInput) {
    c.passwordInput.addEventListener("input", () => {
      saveNetPanelPref(k.password, String(c.passwordInput?.value || ""));
    });
  }
  if (c.characterNameInput) {
    c.characterNameInput.addEventListener("input", () => {
      saveNetPanelPref(k.characterName, String(c.characterNameInput?.value || ""));
    });
  }
  if (c.emailInput) {
    c.emailInput.addEventListener("input", () => {
      saveNetPanelPref(k.email, String(c.emailInput?.value || ""));
    });
  }
  if (c.passwordToggleButton && c.passwordInput) {
    c.passwordToggleButton.addEventListener("click", () => {
      const show = c.passwordInput?.type === "password";
      c.passwordInput.type = show ? "text" : "password";
      c.passwordToggleButton.textContent = show ? "Hide" : "Show";
      c.passwordToggleButton.title = show ? "Hide password" : "Show password";
      saveNetPanelPref(k.passwordVisible, show ? "on" : "off");
    });
  }
  if (c.autoLoginCheckbox) {
    c.autoLoginCheckbox.addEventListener("change", () => {
      const enabled = !!c.autoLoginCheckbox?.checked;
      saveNetPanelPref(k.autoLogin, enabled ? "on" : "off");
      if (enabled && !args.isAuthenticated()) {
        args.setStatus("idle", "Auto-login enabled. It will run on next refresh.");
      }
    });
  }
  if (c.maintenanceToggle) {
    c.maintenanceToggle.addEventListener("change", () => {
      const enabled = c.maintenanceToggle?.value === "on";
      args.setMaintenanceAuto(!!enabled);
      saveNetPanelPref(k.maintenance, enabled ? "on" : "off");
    });
  }
}

export type NetProfile = {
  apiBase: string;
  username: string;
  password: string;
  characterName: string;
  email: string;
};

export function profileKey(profile: { apiBase?: string; username?: string }): string {
  const apiBase = String(profile?.apiBase || "").trim().toLowerCase();
  const username = String(profile?.username || "").trim().toLowerCase();
  return `${apiBase}|${username}`;
}

export function sanitizeProfile(profile: any): NetProfile | null {
  const apiBase = String(profile?.apiBase || "").trim();
  const username = String(profile?.username || "").trim().toLowerCase();
  if (!apiBase || !username) {
    return null;
  }
  return {
    apiBase,
    username,
    password: String(profile?.password || ""),
    characterName: String(profile?.characterName || "Avatar").trim() || "Avatar",
    email: String(profile?.email || "").trim().toLowerCase()
  };
}

export function loadNetProfilesFromStorage(storageKey: string): NetProfile[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizeProfile(entry))
      .filter((entry): entry is NetProfile => !!entry);
  } catch (_err) {
    return [];
  }
}

export function saveNetProfilesToStorage(storageKey: string, profiles: any[]): void {
  const safe = Array.isArray(profiles)
    ? profiles
      .map((entry) => sanitizeProfile(entry))
      .filter((entry): entry is NetProfile => !!entry)
    : [];
  try {
    localStorage.setItem(storageKey, JSON.stringify(safe));
  } catch (_err) {
    // ignore storage failures
  }
}

export function setSelectedProfileKeyInStorage(storageKey: string, key: string): void {
  try {
    localStorage.setItem(storageKey, String(key || ""));
  } catch (_err) {
    // ignore storage failures
  }
}

export function getSelectedProfileKeyFromStorage(storageKey: string): string {
  try {
    return String(localStorage.getItem(storageKey) || "");
  } catch (_err) {
    return "";
  }
}

export function upsertProfileList(
  profiles: NetProfile[],
  profile: NetProfile,
  maxEntries = 12
): NetProfile[] {
  const key = profileKey(profile);
  const next = (Array.isArray(profiles) ? profiles : []).filter((row) => profileKey(row) !== key);
  next.unshift(profile);
  while (next.length > maxEntries) {
    next.pop();
  }
  return next;
}

export function buildProfileSelectOptions(
  profiles: NetProfile[]
): Array<{ value: string; label: string }> {
  return (Array.isArray(profiles) ? profiles : []).map((p) => ({
    value: profileKey(p),
    label: `${p.username} @ ${p.apiBase}`
  }));
}

export type NetProfileControls = {
  apiBaseInput?: HTMLInputElement | null;
  usernameInput?: HTMLInputElement | null;
  passwordInput?: HTMLInputElement | null;
  characterNameInput?: HTMLInputElement | null;
  emailInput?: HTMLInputElement | null;
};

export function populateNetAccountSelectRuntime(args: {
  accountSelect?: HTMLSelectElement | null;
  storageKey: string;
  selectedKeyStorageKey: string;
}): NetProfile[] {
  const profiles = loadNetProfilesFromStorage(args.storageKey);
  const selected = getSelectedProfileKeyFromStorage(args.selectedKeyStorageKey);
  if (!args.accountSelect) {
    return profiles;
  }
  args.accountSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = profiles.length ? "Select saved account..." : "No saved accounts yet";
  args.accountSelect.appendChild(placeholder);
  for (const option of buildProfileSelectOptions(profiles)) {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    if (opt.value === selected) {
      opt.selected = true;
    }
    args.accountSelect.appendChild(opt);
  }
  return profiles;
}

export function applyNetProfileToControlsRuntime(args: {
  profile: any;
  controls: NetProfileControls;
  selectedKeyStorageKey: string;
}): boolean {
  const p = sanitizeProfile(args.profile);
  if (!p) {
    return false;
  }
  if (args.controls.apiBaseInput) args.controls.apiBaseInput.value = p.apiBase;
  if (args.controls.usernameInput) args.controls.usernameInput.value = p.username;
  if (args.controls.passwordInput) args.controls.passwordInput.value = p.password;
  if (args.controls.characterNameInput) args.controls.characterNameInput.value = p.characterName;
  if (args.controls.emailInput) args.controls.emailInput.value = p.email;
  setSelectedProfileKeyInStorage(args.selectedKeyStorageKey, profileKey(p));
  return true;
}

export function upsertNetProfileFromControlsRuntime(args: {
  controls: NetProfileControls;
  storageKey: string;
  selectedKeyStorageKey: string;
  accountSelect?: HTMLSelectElement | null;
  maxEntries?: number;
}): void {
  const p = sanitizeProfile({
    apiBase: args.controls.apiBaseInput?.value,
    username: args.controls.usernameInput?.value,
    password: args.controls.passwordInput?.value,
    characterName: args.controls.characterNameInput?.value,
    email: args.controls.emailInput?.value
  });
  if (!p) {
    return;
  }
  const key = profileKey(p);
  const profiles = upsertProfileList(
    loadNetProfilesFromStorage(args.storageKey),
    p,
    Number.isFinite(args.maxEntries) ? Number(args.maxEntries) : 12
  );
  saveNetProfilesToStorage(args.storageKey, profiles);
  setSelectedProfileKeyInStorage(args.selectedKeyStorageKey, key);
  populateNetAccountSelectRuntime({
    accountSelect: args.accountSelect,
    storageKey: args.storageKey,
    selectedKeyStorageKey: args.selectedKeyStorageKey
  });
  if (args.accountSelect) {
    args.accountSelect.value = key;
  }
}

export function countSavedProfilesRuntime(storageKey: string): number {
  return loadNetProfilesFromStorage(storageKey).length;
}

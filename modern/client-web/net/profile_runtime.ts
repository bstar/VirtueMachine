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

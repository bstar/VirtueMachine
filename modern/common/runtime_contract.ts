export const RUNTIME_PROFILE_CANONICAL_STRICT = "canonical_strict";
export const RUNTIME_PROFILE_CANONICAL_PLUS = "canonical_plus";
export const RUNTIME_PROFILES = Object.freeze([
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILE_CANONICAL_PLUS
] as const);

export const RUNTIME_EXTENSION_KEYS = Object.freeze([
  "quest_system",
  "party_mmo",
  "housing",
  "crafting",
  "farming"
] as const);

export type RuntimeProfile = typeof RUNTIME_PROFILES[number];
export type RuntimeExtensionKey = typeof RUNTIME_EXTENSION_KEYS[number];

export const DEFAULT_RUNTIME_EXTENSIONS: Readonly<RuntimeExtensions> = Object.freeze({
  quest_system: false,
  party_mmo: false,
  housing: false,
  crafting: false,
  farming: false
});

export type RuntimeExtensions = {
  quest_system: boolean;
  party_mmo: boolean;
  housing: boolean;
  crafting: boolean;
  farming: boolean;
};

export function createDefaultRuntimeExtensions(): RuntimeExtensions {
  return {
    quest_system: false,
    party_mmo: false,
    housing: false,
    crafting: false,
    farming: false
  };
}

export function normalizeRuntimeProfile(raw: unknown): string {
  const v = String(raw || "").trim().toLowerCase();
  if ((RUNTIME_PROFILES as readonly string[]).includes(v)) {
    return v;
  }
  return RUNTIME_PROFILE_CANONICAL_STRICT;
}

export function sanitizeRuntimeExtensions(raw: unknown): RuntimeExtensions {
  const out = createDefaultRuntimeExtensions();
  if (!raw || typeof raw !== "object") {
    return out;
  }
  const src = raw as Partial<Record<RuntimeExtensionKey, unknown>>;
  for (const key of RUNTIME_EXTENSION_KEYS) {
    out[key] = !!src[key];
  }
  return out;
}

export function parseRuntimeExtensionsHeader(raw: unknown): string[] {
  const src = String(raw || "").trim().toLowerCase();
  if (!src || src === "none" || src === "off") {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of src.split(",")) {
    const key = String(token || "").trim();
    if (!key) continue;
    if (!/^[a-z0-9_]+$/.test(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  out.sort();
  return out;
}

export function parseRuntimeExtensionListCsv(csv: unknown): RuntimeExtensions {
  const out = createDefaultRuntimeExtensions();
  const parsed = parseRuntimeExtensionsHeader(csv);
  for (const key of parsed) {
    if (isRuntimeExtensionKey(key)) {
      out[key] = true;
    }
  }
  return out;
}

export function runtimeExtensionsSummary(extensions: unknown): string[] {
  const enabled: string[] = [];
  const src = sanitizeRuntimeExtensions(extensions);
  for (const [key, on] of Object.entries(src)) {
    if (on) enabled.push(key);
  }
  enabled.sort();
  return enabled;
}

function isRuntimeExtensionKey(key: string): key is RuntimeExtensionKey {
  return (RUNTIME_EXTENSION_KEYS as readonly string[]).includes(key);
}

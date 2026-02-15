export const RUNTIME_PROFILE_CANONICAL_STRICT = "canonical_strict";
export const RUNTIME_PROFILE_CANONICAL_PLUS = "canonical_plus";
export const RUNTIME_PROFILES = Object.freeze([
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILE_CANONICAL_PLUS
]);

export const RUNTIME_EXTENSION_KEYS = Object.freeze([
  "quest_system",
  "party_mmo",
  "housing",
  "crafting",
  "farming"
]);

export const DEFAULT_RUNTIME_EXTENSIONS = Object.freeze({
  quest_system: false,
  party_mmo: false,
  housing: false,
  crafting: false,
  farming: false
});

export function createDefaultRuntimeExtensions() {
  return {
    quest_system: false,
    party_mmo: false,
    housing: false,
    crafting: false,
    farming: false
  };
}

export function normalizeRuntimeProfile(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (RUNTIME_PROFILES.includes(v)) {
    return v;
  }
  return RUNTIME_PROFILE_CANONICAL_STRICT;
}

export function sanitizeRuntimeExtensions(raw) {
  const out = createDefaultRuntimeExtensions();
  if (!raw || typeof raw !== "object") {
    return out;
  }
  const src = raw;
  for (const key of RUNTIME_EXTENSION_KEYS) {
    out[key] = !!src[key];
  }
  return out;
}

export function parseRuntimeExtensionsHeader(raw) {
  const src = String(raw || "").trim().toLowerCase();
  if (!src || src === "none" || src === "off") {
    return [];
  }
  const out = [];
  const seen = new Set();
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

export function parseRuntimeExtensionListCsv(csv) {
  const out = createDefaultRuntimeExtensions();
  const parsed = parseRuntimeExtensionsHeader(csv);
  for (const key of parsed) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = true;
    }
  }
  return out;
}

export function runtimeExtensionsSummary(extensions) {
  const enabled = [];
  const src = sanitizeRuntimeExtensions(extensions);
  for (const [key, on] of Object.entries(src)) {
    if (on) enabled.push(key);
  }
  enabled.sort();
  return enabled;
}

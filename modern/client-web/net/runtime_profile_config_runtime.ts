import {
  createDefaultRuntimeExtensions,
  normalizeRuntimeProfile,
  parseRuntimeExtensionListCsv,
  sanitizeRuntimeExtensions,
  type RuntimeExtensions
} from "../../common/runtime_contract.ts";
import type { PreferenceStorageRuntime } from "../ui/preference_runtime.ts";

export type RuntimeProfileConfigRuntime = {
  extensions: RuntimeExtensions;
  profile: string;
};

export type RuntimeProfileConfigKeysRuntime = {
  extensionsKey: string;
  profileKey: string;
};

export type RuntimeProfileConfigStateRuntime = {
  runtimeExtensions: RuntimeExtensions;
  runtimeProfile: string;
};

export type RuntimeProfileDocumentElementRuntime = {
  setAttribute(name: string, value: string): void;
};

function parseStoredExtensionsRuntime(raw: string | null): RuntimeExtensions {
  if (!raw) {
    return createDefaultRuntimeExtensions();
  }
  try {
    return sanitizeRuntimeExtensions(JSON.parse(raw));
  } catch (_err) {
    return createDefaultRuntimeExtensions();
  }
}

function readStorageRuntime(
  storage: PreferenceStorageRuntime | null | undefined,
  keys: RuntimeProfileConfigKeysRuntime
): RuntimeProfileConfigRuntime {
  if (!storage) {
    return {
      extensions: createDefaultRuntimeExtensions(),
      profile: normalizeRuntimeProfile(null)
    };
  }
  try {
    return {
      extensions: parseStoredExtensionsRuntime(storage.getItem(keys.extensionsKey)),
      profile: normalizeRuntimeProfile(storage.getItem(keys.profileKey))
    };
  } catch (_err) {
    return {
      extensions: createDefaultRuntimeExtensions(),
      profile: normalizeRuntimeProfile(null)
    };
  }
}

function applyQueryOverridesRuntime(
  base: RuntimeProfileConfigRuntime,
  locationSearch: string
): RuntimeProfileConfigRuntime {
  try {
    const qs = new URLSearchParams(String(locationSearch || ""));
    return {
      extensions: qs.has("ext") ? parseRuntimeExtensionListCsv(qs.get("ext")) : base.extensions,
      profile: qs.has("profile") ? normalizeRuntimeProfile(qs.get("profile")) : base.profile
    };
  } catch (_err) {
    return base;
  }
}

export function resolveRuntimeProfileConfigRuntime(args: {
  keys: RuntimeProfileConfigKeysRuntime;
  locationSearch?: string | null;
  storage?: PreferenceStorageRuntime | null;
}): RuntimeProfileConfigRuntime {
  return applyQueryOverridesRuntime(
    readStorageRuntime(args.storage, args.keys),
    String(args.locationSearch || "")
  );
}

export function persistRuntimeProfileConfigRuntime(
  storage: PreferenceStorageRuntime | null | undefined,
  keys: RuntimeProfileConfigKeysRuntime,
  config: RuntimeProfileConfigRuntime
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(keys.profileKey, normalizeRuntimeProfile(config.profile));
    storage.setItem(keys.extensionsKey, JSON.stringify(sanitizeRuntimeExtensions(config.extensions)));
    return true;
  } catch (_err) {
    return false;
  }
}

export function applyRuntimeProfileConfigRuntime(args: {
  config: RuntimeProfileConfigRuntime;
  documentElement?: RuntimeProfileDocumentElementRuntime | null;
  state: RuntimeProfileConfigStateRuntime;
}): RuntimeProfileConfigRuntime {
  const config = {
    extensions: sanitizeRuntimeExtensions(args.config.extensions),
    profile: normalizeRuntimeProfile(args.config.profile)
  };
  args.state.runtimeProfile = config.profile;
  args.state.runtimeExtensions = config.extensions;
  if (args.documentElement) {
    args.documentElement.setAttribute("data-runtime-profile", config.profile);
  }
  return config;
}

export function initRuntimeProfileConfigRuntime(args: {
  documentElement?: RuntimeProfileDocumentElementRuntime | null;
  keys: RuntimeProfileConfigKeysRuntime;
  locationSearch?: string | null;
  state: RuntimeProfileConfigStateRuntime;
  storage?: PreferenceStorageRuntime | null;
}): RuntimeProfileConfigRuntime {
  const resolved = resolveRuntimeProfileConfigRuntime({
    keys: args.keys,
    locationSearch: args.locationSearch,
    storage: args.storage
  });
  const applied = applyRuntimeProfileConfigRuntime({
    config: resolved,
    documentElement: args.documentElement,
    state: args.state
  });
  persistRuntimeProfileConfigRuntime(args.storage, args.keys, applied);
  return applied;
}

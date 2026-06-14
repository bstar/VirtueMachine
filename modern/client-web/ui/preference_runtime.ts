export type PreferenceStorageRuntime = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function normalizeChoicePreferenceRuntime<TChoice extends string>(
  raw: unknown,
  fallback: TChoice,
  allowed: readonly TChoice[],
  aliases: Partial<Record<string, TChoice>> = {}
): TChoice {
  const value = String(raw ?? "");
  const aliased = aliases[value];
  if (aliased && allowed.includes(aliased)) {
    return aliased;
  }
  return allowed.includes(value as TChoice) ? value as TChoice : fallback;
}

export function readStoredStringPreferenceRuntime(
  storage: PreferenceStorageRuntime | null | undefined,
  key: string,
  fallback: string
): string {
  if (!storage) {
    return fallback;
  }
  try {
    const stored = storage.getItem(key);
    return stored === null ? fallback : String(stored);
  } catch (_err) {
    return fallback;
  }
}

export function readStoredChoicePreferenceRuntime<TChoice extends string>(
  storage: PreferenceStorageRuntime | null | undefined,
  key: string,
  fallback: TChoice,
  allowed: readonly TChoice[],
  aliases: Partial<Record<string, TChoice>> = {}
): TChoice {
  return normalizeChoicePreferenceRuntime(
    readStoredStringPreferenceRuntime(storage, key, fallback),
    fallback,
    allowed,
    aliases
  );
}

export function writeStoredStringPreferenceRuntime(
  storage: PreferenceStorageRuntime | null | undefined,
  key: string,
  value: string
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function onOffPreferenceRuntime(enabled: boolean): "on" | "off" {
  return enabled ? "on" : "off";
}

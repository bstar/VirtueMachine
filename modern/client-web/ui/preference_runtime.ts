export type PreferenceStorageRuntime = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type PreferenceSelectRuntime = {
  value: string;
};

export type PreferenceChangeSelectRuntime = PreferenceSelectRuntime & {
  addEventListener(type: "change", listener: () => void): void;
};

export type PreferenceAttributeTargetRuntime = {
  setAttribute(name: string, value: string): void;
};

export type PreferenceHrefTargetRuntime = {
  href: string;
};

export type PreferenceInitializerRuntime<TResult = unknown> = () => TResult;

export function initPreferenceGroupRuntime<const TInitializers extends readonly PreferenceInitializerRuntime[]>(
  initializers: TInitializers
): { [K in keyof TInitializers]: TInitializers[K] extends PreferenceInitializerRuntime<infer TResult> ? TResult : never } {
  return initializers.map((init) => init()) as {
    [K in keyof TInitializers]: TInitializers[K] extends PreferenceInitializerRuntime<infer TResult> ? TResult : never;
  };
}

export type BooleanPreferenceControlRuntime = {
  fallback: "on" | "off";
  key: string;
  onApply: (enabled: boolean) => void;
  select?: PreferenceChangeSelectRuntime | null;
};

export type ChoicePreferenceControlRuntime<TChoice extends string = string> = {
  aliases?: Partial<Record<string, TChoice>>;
  allowed: readonly TChoice[];
  fallback: TChoice;
  key: string;
  onApply: (value: TChoice) => void;
  select?: PreferenceChangeSelectRuntime | null;
};

export function initPreferenceControlsRuntime(args: {
  booleans?: readonly BooleanPreferenceControlRuntime[];
  choices?: readonly ChoicePreferenceControlRuntime[];
  storage?: PreferenceStorageRuntime | null;
}): {
  booleans: ReturnType<typeof initBooleanTogglePreferenceRuntime>[];
  choices: ReturnType<typeof initChoicePreferenceRuntime>[];
} {
  return {
    booleans: (args.booleans || []).map((control) => initBooleanTogglePreferenceRuntime({
      ...control,
      storage: args.storage
    })),
    choices: (args.choices || []).map((control) => initChoicePreferenceRuntime({
      ...control,
      storage: args.storage
    }))
  };
}

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

export function booleanTogglePreferenceModelRuntime(enabled: unknown): {
  enabled: boolean;
  value: "on" | "off";
} {
  const next = !!enabled;
  return {
    enabled: next,
    value: onOffPreferenceRuntime(next)
  };
}

export function applyBooleanTogglePreferenceRuntime(args: {
  enabled: unknown;
  key: string;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): {
  enabled: boolean;
  stored: boolean;
  value: "on" | "off";
} {
  const model = booleanTogglePreferenceModelRuntime(args.enabled);
  if (args.select) {
    args.select.value = model.value;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

export function initBooleanTogglePreferenceRuntime(args: {
  fallback: "on" | "off";
  key: string;
  onApply: (enabled: boolean) => void;
  select?: PreferenceChangeSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): {
  bound: boolean;
  initialEnabled: boolean;
  initialValue: "on" | "off";
} {
  const initialValue = readStoredChoicePreferenceRuntime(args.storage, args.key, args.fallback, ["on", "off"]);
  const initialEnabled = initialValue === "on";
  args.onApply(initialEnabled);
  if (args.select) {
    args.select.addEventListener("change", () => {
      args.onApply(args.select?.value === "on");
    });
  }
  return {
    bound: !!args.select,
    initialEnabled,
    initialValue
  };
}

export function applyBooleanTogglePreferenceStateRuntime<
  TState extends Record<TKey, boolean>,
  TKey extends keyof TState & string
>(args: {
  enabled: unknown;
  key: string;
  select?: PreferenceSelectRuntime | null;
  state: TState;
  stateKey: TKey;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof applyBooleanTogglePreferenceRuntime> {
  const model = applyBooleanTogglePreferenceRuntime(args);
  args.state[args.stateKey] = model.enabled as TState[TKey];
  return model;
}

export function initChoicePreferenceRuntime<TChoice extends string>(args: {
  aliases?: Partial<Record<string, TChoice>>;
  allowed: readonly TChoice[];
  fallback: TChoice;
  key: string;
  onApply: (value: TChoice) => void;
  select?: PreferenceChangeSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): {
  bound: boolean;
  initialValue: TChoice;
} {
  const initialValue = readStoredChoicePreferenceRuntime(
    args.storage,
    args.key,
    args.fallback,
    args.allowed,
    args.aliases
  );
  args.onApply(initialValue);
  if (args.select) {
    args.select.addEventListener("change", () => {
      args.onApply(normalizeChoicePreferenceRuntime(
        args.select?.value,
        args.fallback,
        args.allowed,
        args.aliases
      ));
    });
  }
  return {
    bound: !!args.select,
    initialValue
  };
}

export function animationModePreferenceModelRuntime(mode: unknown, currentTick: unknown): {
  animationFrozen: boolean;
  frozenAnimationTick: number | null;
  value: "live" | "freeze";
} {
  const value = String(mode || "") === "freeze" ? "freeze" : "live";
  return {
    animationFrozen: value === "freeze",
    frozenAnimationTick: value === "freeze" ? (Number(currentTick) >>> 0) : null,
    value
  };
}

export function applyAnimationModePreferenceRuntime(args: {
  currentTick: unknown;
  key: string;
  mode: unknown;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof animationModePreferenceModelRuntime> & {
  stored: boolean;
} {
  const model = animationModePreferenceModelRuntime(args.mode, args.currentTick);
  if (args.select) {
    args.select.value = model.value;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

export type AnimationModePreferenceStateRuntime = {
  animationFrozen: boolean;
  frozenAnimationTick: number | null;
};

export function applyAnimationModePreferenceStateRuntime(args: {
  currentTick: unknown;
  key: string;
  mode: unknown;
  select?: PreferenceSelectRuntime | null;
  state: AnimationModePreferenceStateRuntime;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof applyAnimationModePreferenceRuntime> {
  const model = applyAnimationModePreferenceRuntime(args);
  args.state.animationFrozen = model.animationFrozen;
  args.state.frozenAnimationTick = model.frozenAnimationTick;
  return model;
}

export function movementModePreferenceModelRuntime(mode: unknown): {
  movementMode: "avatar" | "ghost";
  statText: "avatar" | "ghost";
  targetVerb: string | null;
  useCursorActive: boolean | null;
  value: "avatar" | "ghost";
} {
  const value = String(mode || "") === "avatar" ? "avatar" : "ghost";
  return {
    movementMode: value,
    statText: value,
    targetVerb: value === "avatar" ? null : "",
    useCursorActive: value === "avatar" ? null : false,
    value
  };
}

export function applyMovementModePreferenceRuntime(args: {
  key: string;
  mode: unknown;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof movementModePreferenceModelRuntime> & {
  stored: boolean;
} {
  const model = movementModePreferenceModelRuntime(args.mode);
  if (args.select) {
    args.select.value = model.value;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

export type MovementModePreferenceStateRuntime = {
  movementMode: string;
  targetVerb: string;
  useCursorActive: boolean;
};

export function applyMovementModePreferenceStateRuntime(args: {
  key: string;
  mode: unknown;
  select?: PreferenceSelectRuntime | null;
  statAvatarState?: { textContent: string | null } | null;
  state: MovementModePreferenceStateRuntime;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof applyMovementModePreferenceRuntime> {
  const model = applyMovementModePreferenceRuntime(args);
  args.state.movementMode = model.movementMode;
  if (model.useCursorActive !== null) {
    args.state.useCursorActive = model.useCursorActive;
  }
  if (model.targetVerb !== null) {
    args.state.targetVerb = model.targetVerb;
  }
  if (args.statAvatarState) {
    args.statAvatarState.textContent = model.statText;
  }
  return model;
}

export type PaletteFxPreferenceStateRuntime = {
  enablePaletteFx: boolean;
  paletteFrame: unknown;
  paletteFrameTick: number;
};

export function applyPaletteFxPreferenceStateRuntime(args: {
  enabled: unknown;
  key: string;
  select?: PreferenceSelectRuntime | null;
  state: PaletteFxPreferenceStateRuntime;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof applyBooleanTogglePreferenceRuntime> {
  const model = applyBooleanTogglePreferenceRuntime(args);
  args.state.enablePaletteFx = model.enabled;
  args.state.paletteFrameTick = -1;
  args.state.paletteFrame = null;
  return model;
}

export function legacyScaleModePreferenceModelRuntime<TMode extends string>(
  mode: unknown,
  allowedModes: readonly TMode[],
  fallback: TMode
): {
  legacyScaleMode: TMode;
  value: TMode;
} {
  const value = normalizeChoicePreferenceRuntime(String(mode || ""), fallback, allowedModes);
  return {
    legacyScaleMode: value,
    value
  };
}

export function nextLegacyScaleModeRuntime<TMode extends string>(
  current: unknown,
  step: unknown,
  allowedModes: readonly TMode[],
  fallback: TMode
): TMode {
  const currentMode = legacyScaleModePreferenceModelRuntime(current, allowedModes, fallback).value;
  const idx = allowedModes.indexOf(currentMode);
  const base = idx >= 0 ? idx : 0;
  const offset = Number(step) | 0;
  const nextIdx = (base + offset + allowedModes.length) % allowedModes.length;
  return allowedModes[nextIdx] || fallback;
}

export function namedPreferenceModelRuntime<TChoice extends string>(
  value: unknown,
  allowed: readonly TChoice[],
  fallback: TChoice
): {
  value: TChoice;
} {
  return {
    value: normalizeChoicePreferenceRuntime(String(value || ""), fallback, allowed)
  };
}

export function applyNamedPreferenceRuntime<TChoice extends string>(args: {
  allowed: readonly TChoice[];
  fallback: TChoice;
  key: string;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
  value: unknown;
}): {
  stored: boolean;
  value: TChoice;
} {
  const model = namedPreferenceModelRuntime(args.value, args.allowed, args.fallback);
  if (args.select) {
    args.select.value = model.value;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

export function themePreferenceModelRuntime<TTheme extends string>(
  theme: unknown,
  allowedThemes: readonly TTheme[],
  fallback: TTheme,
  docsPath = "/docs/wiki/"
): {
  theme: TTheme;
  value: TTheme;
  wikiHref: string;
} {
  const value = namedPreferenceModelRuntime(theme, allowedThemes, fallback).value;
  return {
    theme: value,
    value,
    wikiHref: `${docsPath}?theme=${encodeURIComponent(value)}`
  };
}

export function applyThemePreferenceRuntime<TTheme extends string>(args: {
  allowedThemes: readonly TTheme[];
  documentElement?: PreferenceAttributeTargetRuntime | null;
  fallback: TTheme;
  key: string;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
  theme: unknown;
  wikiLink?: PreferenceHrefTargetRuntime | null;
}): ReturnType<typeof themePreferenceModelRuntime<TTheme>> & {
  stored: boolean;
} {
  const model = themePreferenceModelRuntime(args.theme, args.allowedThemes, args.fallback);
  if (args.documentElement) {
    args.documentElement.setAttribute("data-theme", model.theme);
  }
  if (args.select) {
    args.select.value = model.value;
  }
  if (args.wikiLink) {
    args.wikiLink.href = model.wikiHref;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

export function fontPreferenceModelRuntime<TFont extends string>(
  font: unknown,
  allowedFonts: readonly TFont[],
  fallback: TFont
): {
  font: TFont;
  value: TFont;
} {
  const value = namedPreferenceModelRuntime(font, allowedFonts, fallback).value;
  return {
    font: value,
    value
  };
}

export function applyFontPreferenceRuntime<TFont extends string>(args: {
  allowedFonts: readonly TFont[];
  documentElement?: PreferenceAttributeTargetRuntime | null;
  fallback: TFont;
  font: unknown;
  key: string;
  select?: PreferenceSelectRuntime | null;
  storage?: PreferenceStorageRuntime | null;
}): ReturnType<typeof fontPreferenceModelRuntime<TFont>> & {
  stored: boolean;
} {
  const model = fontPreferenceModelRuntime(args.font, args.allowedFonts, args.fallback);
  if (args.documentElement) {
    args.documentElement.setAttribute("data-font", model.font);
  }
  if (args.select) {
    args.select.value = model.value;
  }
  return {
    ...model,
    stored: writeStoredStringPreferenceRuntime(args.storage, args.key, model.value)
  };
}

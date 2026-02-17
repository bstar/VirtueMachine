export const CANONICAL_UI_PANEL_KEYS = Object.freeze([
  "avatar_panel",
  "inventory_panel",
  "paperdoll_panel",
  "party_panel",
  "message_log_panel",
  "conversation_panel"
]);

export const MODERN_UI_PANEL_KEYS = Object.freeze([
  "account_panel"
]);

type PanelScopeValidationInput = {
  canonical_ui?: Record<string, unknown>;
  modern_ui?: Record<string, unknown>;
};

export function listPanelScopeRuntime(): {
  canonical_ui: string[];
  modern_ui: string[];
} {
  return {
    canonical_ui: [...CANONICAL_UI_PANEL_KEYS],
    modern_ui: [...MODERN_UI_PANEL_KEYS]
  };
}

export function validatePanelScopeRuntime(input: PanelScopeValidationInput): {
  ok: boolean;
  canonical_missing: string[];
  modern_missing: string[];
  canonical_unclassified: string[];
  modern_unclassified: string[];
  duplicate_keys: string[];
} {
  const canonical = (input?.canonical_ui && typeof input.canonical_ui === "object")
    ? Object.keys(input.canonical_ui)
    : [];
  const modern = (input?.modern_ui && typeof input.modern_ui === "object")
    ? Object.keys(input.modern_ui)
    : [];

  const canonicalExpected = new Set(CANONICAL_UI_PANEL_KEYS);
  const modernExpected = new Set(MODERN_UI_PANEL_KEYS);
  const canonicalSet = new Set(canonical);
  const modernSet = new Set(modern);

  const canonical_missing = CANONICAL_UI_PANEL_KEYS.filter((k) => !canonicalSet.has(k));
  const modern_missing = MODERN_UI_PANEL_KEYS.filter((k) => !modernSet.has(k));
  const canonical_unclassified = canonical.filter((k) => !canonicalExpected.has(k));
  const modern_unclassified = modern.filter((k) => !modernExpected.has(k));
  const duplicate_keys = canonical.filter((k) => modernSet.has(k));

  const ok = canonical_missing.length === 0
    && modern_missing.length === 0
    && canonical_unclassified.length === 0
    && modern_unclassified.length === 0
    && duplicate_keys.length === 0;

  return {
    ok,
    canonical_missing,
    modern_missing,
    canonical_unclassified,
    modern_unclassified,
    duplicate_keys
  };
}

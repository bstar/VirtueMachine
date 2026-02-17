export type MechanicsCapabilityStatusRuntime = "implemented" | "partial" | "planned";

export type MechanicsCapabilityEntryRuntime = {
  key: string;
  status: MechanicsCapabilityStatusRuntime;
  category: "core" | "interaction" | "systems";
  canonical: boolean;
  legacy_anchor: string;
  regression_gates: string[];
  note: string;
};

const BASE_CAPABILITIES: ReadonlyArray<MechanicsCapabilityEntryRuntime> = Object.freeze([
  {
    key: "world_navigation",
    status: "implemented",
    category: "core",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_0A33.c",
    regression_gates: ["modern/tools/ci_required_tests.sh"],
    note: "Avatar movement/path input baseline is active."
  },
  {
    key: "targeted_interaction_core",
    status: "implemented",
    category: "interaction",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_27a1.c",
    regression_gates: ["modern/tools/test_client_web_ui_target_resolver.sh"],
    note: "Legacy-targeted verb cursor pipeline is active."
  },
  {
    key: "inventory_pickup_drop_baseline",
    status: "implemented",
    category: "interaction",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_27a1.c",
    regression_gates: [
      "modern/tools/test_client_web_ui_inventory_paperdoll.sh",
      "modern/tools/test_client_web_ui_paperdoll_equipment.sh"
    ],
    note: "Get/drop baseline behavior and inventory projection are wired."
  },
  {
    key: "conversation_opcode_engine",
    status: "partial",
    category: "interaction",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_16E1.c",
    regression_gates: ["modern/tools/test_client_web_conversation.sh"],
    note: "Conversation opcode path is active but not feature-complete."
  },
  {
    key: "combat_resolution",
    status: "planned",
    category: "systems",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_2337.c",
    regression_gates: [],
    note: "Combat verbs route through placeholders pending full canonical resolution."
  },
  {
    key: "spellcasting_resolution",
    status: "planned",
    category: "systems",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_1944.c",
    regression_gates: [],
    note: "Cast command path exists; full spell resolution pending."
  },
  {
    key: "npc_schedule_pathing",
    status: "planned",
    category: "systems",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_0C9C.c",
    regression_gates: [],
    note: "NPC schedule/pathing systems are deferred."
  },
  {
    key: "quest_state_progression",
    status: "planned",
    category: "systems",
    canonical: true,
    legacy_anchor: "legacy/u6-decompiled/SRC/seg_1703.c",
    regression_gates: [],
    note: "Quest progression beyond dialogue scaffolding is deferred."
  }
]);

export function buildMechanicsCapabilityMatrixRuntime(runtimeExtensions: Record<string, unknown> | null | undefined = null): MechanicsCapabilityEntryRuntime[] {
  const ext = (runtimeExtensions && typeof runtimeExtensions === "object")
    ? runtimeExtensions
    : {};
  return BASE_CAPABILITIES.map((entry) => {
    if (entry.key === "quest_state_progression" && !!(ext as any).quest_system) {
      return {
        ...entry,
        status: "partial",
        regression_gates: [...entry.regression_gates],
        note: "Quest extension hooks enabled; canonical progression remains incomplete."
      };
    }
    return {
      ...entry,
      regression_gates: [...entry.regression_gates]
    };
  });
}

export function summarizeMechanicsCapabilitiesRuntime(entries: MechanicsCapabilityEntryRuntime[]): {
  total: number;
  implemented: number;
  partial: number;
  planned: number;
} {
  const src = Array.isArray(entries) ? entries : [];
  let implemented = 0;
  let partial = 0;
  let planned = 0;
  for (const e of src) {
    if (e.status === "implemented") implemented += 1;
    else if (e.status === "partial") partial += 1;
    else planned += 1;
  }
  return {
    total: src.length >>> 0,
    implemented: implemented >>> 0,
    partial: partial >>> 0,
    planned: planned >>> 0
  };
}

export function validateMechanicsCapabilityMatrixRuntime(entries: MechanicsCapabilityEntryRuntime[]): {
  duplicate_keys: number;
  missing_legacy_anchors: number;
  missing_regression_gates: number;
} {
  const src = Array.isArray(entries) ? entries : [];
  const seen = new Set<string>();
  let duplicateKeys = 0;
  let missingLegacyAnchors = 0;
  let missingRegressionGates = 0;
  for (const entry of src) {
    const key = String(entry.key || "");
    if (seen.has(key)) duplicateKeys += 1;
    seen.add(key);
    if (String(entry.legacy_anchor || "").trim().length === 0) missingLegacyAnchors += 1;
    const gates = Array.isArray(entry.regression_gates) ? entry.regression_gates : [];
    if (entry.status !== "planned" && gates.length === 0) missingRegressionGates += 1;
  }
  return {
    duplicate_keys: duplicateKeys >>> 0,
    missing_legacy_anchors: missingLegacyAnchors >>> 0,
    missing_regression_gates: missingRegressionGates >>> 0
  };
}

export type MechanicsCapabilityStatusRuntime = "implemented" | "partial" | "planned";

export type MechanicsCapabilityEntryRuntime = {
  key: string;
  status: MechanicsCapabilityStatusRuntime;
  category: "core" | "interaction" | "systems";
  canonical: boolean;
  note: string;
};

const BASE_CAPABILITIES: ReadonlyArray<MechanicsCapabilityEntryRuntime> = Object.freeze([
  {
    key: "world_navigation",
    status: "implemented",
    category: "core",
    canonical: true,
    note: "Avatar movement/path input baseline is active."
  },
  {
    key: "targeted_interaction_core",
    status: "implemented",
    category: "interaction",
    canonical: true,
    note: "Legacy-targeted verb cursor pipeline is active."
  },
  {
    key: "inventory_pickup_drop_baseline",
    status: "implemented",
    category: "interaction",
    canonical: true,
    note: "Get/drop baseline behavior and inventory projection are wired."
  },
  {
    key: "conversation_opcode_engine",
    status: "partial",
    category: "interaction",
    canonical: true,
    note: "Conversation opcode path is active but not feature-complete."
  },
  {
    key: "combat_resolution",
    status: "planned",
    category: "systems",
    canonical: true,
    note: "Combat verbs route through placeholders pending full canonical resolution."
  },
  {
    key: "spellcasting_resolution",
    status: "planned",
    category: "systems",
    canonical: true,
    note: "Cast command path exists; full spell resolution pending."
  },
  {
    key: "npc_schedule_pathing",
    status: "planned",
    category: "systems",
    canonical: true,
    note: "NPC schedule/pathing systems are deferred."
  },
  {
    key: "quest_state_progression",
    status: "planned",
    category: "systems",
    canonical: true,
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
        note: "Quest extension hooks enabled; canonical progression remains incomplete."
      };
    }
    return { ...entry };
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

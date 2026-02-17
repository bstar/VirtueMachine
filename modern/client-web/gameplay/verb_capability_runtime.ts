import type { MechanicsCapabilityEntryRuntime, MechanicsCapabilityStatusRuntime } from "./mechanics_capability_runtime.ts";

const VERB_TO_CAPABILITY = Object.freeze({
  a: "combat_resolution",
  c: "spellcasting_resolution",
  d: "inventory_pickup_drop_baseline",
  g: "inventory_pickup_drop_baseline",
  l: "targeted_interaction_core",
  m: "targeted_interaction_core",
  o: "targeted_interaction_core",
  s: "targeted_interaction_core",
  t: "conversation_opcode_engine",
  u: "targeted_interaction_core"
});

export type VerbCapabilityBindingRuntime = {
  verb: string;
  capability_key: string;
  status: MechanicsCapabilityStatusRuntime | "unknown";
};

export function buildVerbCapabilityBindingsRuntime(
  capabilities: MechanicsCapabilityEntryRuntime[]
): VerbCapabilityBindingRuntime[] {
  const byKey = new Map<string, MechanicsCapabilityEntryRuntime>();
  for (const entry of (Array.isArray(capabilities) ? capabilities : [])) {
    byKey.set(String(entry.key), entry);
  }
  const out: VerbCapabilityBindingRuntime[] = [];
  for (const [verb, key] of Object.entries(VERB_TO_CAPABILITY)) {
    const cap = byKey.get(String(key));
    out.push({
      verb,
      capability_key: String(key),
      status: cap ? cap.status : "unknown"
    });
  }
  out.sort((a, b) => a.verb.localeCompare(b.verb));
  return out;
}

export function summarizeVerbCapabilityBindingsRuntime(
  bindings: VerbCapabilityBindingRuntime[]
): {
  total: number;
  implemented: number;
  partial: number;
  planned: number;
  unknown: number;
} {
  let implemented = 0;
  let partial = 0;
  let planned = 0;
  let unknown = 0;
  const src = Array.isArray(bindings) ? bindings : [];
  for (const binding of src) {
    if (binding.status === "implemented") implemented += 1;
    else if (binding.status === "partial") partial += 1;
    else if (binding.status === "planned") planned += 1;
    else unknown += 1;
  }
  return {
    total: src.length >>> 0,
    implemented: implemented >>> 0,
    partial: partial >>> 0,
    planned: planned >>> 0,
    unknown: unknown >>> 0
  };
}

export function summarizeVerbCapabilityCoverageRuntime(
  capabilities: MechanicsCapabilityEntryRuntime[],
  bindings: VerbCapabilityBindingRuntime[]
): {
  interaction_capabilities: number;
  mapped_interaction_capabilities: number;
  unmapped_interaction_capability_keys: string[];
  unknown_binding_verbs: string[];
} {
  const capabilitySrc = Array.isArray(capabilities) ? capabilities : [];
  const bindingSrc = Array.isArray(bindings) ? bindings : [];
  const interactionCaps = capabilitySrc.filter((cap) => cap.category === "interaction" && cap.status !== "planned");
  const mappedKeys = new Set<string>(bindingSrc.map((binding) => String(binding.capability_key)));
  const unmapped = interactionCaps
    .map((cap) => String(cap.key))
    .filter((key) => !mappedKeys.has(key))
    .sort((a, b) => a.localeCompare(b));
  const unknownVerbs = bindingSrc
    .filter((binding) => binding.status === "unknown")
    .map((binding) => String(binding.verb))
    .sort((a, b) => a.localeCompare(b));
  return {
    interaction_capabilities: interactionCaps.length >>> 0,
    mapped_interaction_capabilities: (interactionCaps.length - unmapped.length) >>> 0,
    unmapped_interaction_capability_keys: unmapped,
    unknown_binding_verbs: unknownVerbs
  };
}

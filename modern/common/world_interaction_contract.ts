export const WORLD_OBJECT_INTERACTION_VERBS = ["take", "drop", "put", "equip"] as const;
export const WORLD_ROUTE_INTERACTION_VERBS = [...WORLD_OBJECT_INTERACTION_VERBS, "talk"] as const;

export type WorldObjectInteractionVerb = typeof WORLD_OBJECT_INTERACTION_VERBS[number];
export type WorldRouteInteractionVerb = typeof WORLD_ROUTE_INTERACTION_VERBS[number];

export function normalizeWorldObjectInteractionVerbRuntime(raw: unknown): WorldObjectInteractionVerb | null {
  const verb = String(raw || "").trim().toLowerCase();
  return (WORLD_OBJECT_INTERACTION_VERBS as readonly string[]).includes(verb)
    ? verb as WorldObjectInteractionVerb
    : null;
}

export function normalizeWorldRouteInteractionVerbRuntime(raw: unknown): WorldRouteInteractionVerb | null {
  const verb = String(raw || "").trim().toLowerCase();
  return (WORLD_ROUTE_INTERACTION_VERBS as readonly string[]).includes(verb)
    ? verb as WorldRouteInteractionVerb
    : null;
}

export function worldObjectInteractionVerbListRuntime(): string {
  return WORLD_OBJECT_INTERACTION_VERBS.join(", ");
}

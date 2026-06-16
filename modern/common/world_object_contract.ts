export const WORLD_OBJECT_HOLDER_KINDS = ["none", "object", "npc"] as const;

export type WorldObjectHolderKind = typeof WORLD_OBJECT_HOLDER_KINDS[number];

export function normalizeWorldObjectHolderKindRuntime(raw: unknown): WorldObjectHolderKind {
  const value = String(raw || "none").trim().toLowerCase();
  return (WORLD_OBJECT_HOLDER_KINDS as readonly string[]).includes(value)
    ? value as WorldObjectHolderKind
    : "none";
}

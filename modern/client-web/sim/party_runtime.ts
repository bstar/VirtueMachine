export type PartyMemberIdSourceRuntime = number | string;

export function normalizePartyMemberIdRuntime(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return 1;
  }
  return (n >>> 0) || 1;
}

export function partyMemberIdSourcesFromJsonRuntime(value: unknown): PartyMemberIdSourceRuntime[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is PartyMemberIdSourceRuntime => {
    return typeof item === "number" || typeof item === "string";
  });
}

export function normalizePartyMemberIdsRuntime(
  partyMembers: readonly PartyMemberIdSourceRuntime[] | null | undefined,
  fallbackId = 1
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of partyMembers || []) {
    const id = normalizePartyMemberIdRuntime(raw);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
    if (out.length >= 10) {
      break;
    }
  }
  if (!out.length) {
    out.push(normalizePartyMemberIdRuntime(fallbackId));
  }
  return out;
}

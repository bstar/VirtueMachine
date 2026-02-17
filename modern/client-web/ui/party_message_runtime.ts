export type PartyPanelMemberRuntime = {
  id: number;
  name: string;
  in_party: boolean;
  active: boolean;
  party_index: number;
};

export type PartySwitchResolutionRuntime = {
  changed: boolean;
  next_active_index: number;
  selected_party_id: number | null;
  requested_digit: number;
  target_index: number;
  reason: "applied" | "same_index" | "out_of_range" | "invalid_digit";
};

export type MessageLogPanelEntryRuntime = {
  tick: number;
  level: string;
  text: string;
  seq: number;
};

function toU32(v: unknown): number {
  return Number(v) >>> 0;
}

function normalizePartyMemberIdRuntime(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    return 1;
  }
  return (n >>> 0) || 1;
}

export function normalizePartyMemberIdsRuntime(
  partyMembers: unknown,
  fallbackId: number = 1
): number[] {
  const src = Array.isArray(partyMembers) ? partyMembers : [];
  const dedup = new Set<number>();
  for (const raw of src) {
    dedup.add(normalizePartyMemberIdRuntime(raw));
  }
  if (!dedup.size) {
    dedup.add(normalizePartyMemberIdRuntime(fallbackId));
  }
  return Array.from(dedup).slice(0, 10);
}

export function clampActivePartyIndexRuntime(activeIndex: unknown, partyCount: number): number {
  const n = Number(activeIndex) | 0;
  if (!Number.isFinite(n) || partyCount <= 0) {
    return 0;
  }
  if (n < 0) {
    return 0;
  }
  if (n >= partyCount) {
    return 0;
  }
  return n;
}

export function projectPartyPanelMembersRuntime(input: {
  partyMembers: unknown;
  activeIndex: unknown;
  nameById?: Record<string, string> | null;
}): PartyPanelMemberRuntime[] {
  const ids = normalizePartyMemberIdsRuntime(input?.partyMembers, 1);
  const activeIndex = clampActivePartyIndexRuntime(input?.activeIndex, ids.length);
  const nameById = (input?.nameById && typeof input.nameById === "object")
    ? input.nameById
    : {};
  return ids.map((id, index) => ({
    id: toU32(id),
    name: String((nameById as any)?.[String(id)] || (id === 1 ? "Avatar" : `Actor_${id}`)),
    in_party: true,
    active: index === activeIndex,
    party_index: index
  }));
}

function digitKeyToLegacyTargetIndexRuntime(digitKey: unknown): number {
  const s = String(digitKey || "").trim();
  if (!/^\d$/.test(s)) {
    return -1;
  }
  const d = Number(s) | 0;
  if (d >= 1 && d <= 9) {
    return d - 1;
  }
  if (d === 0) {
    return 9;
  }
  return -1;
}

export function resolvePartySwitchDigitRuntime(input: {
  digitKey: unknown;
  partyMembers: unknown;
  activeIndex: unknown;
}): PartySwitchResolutionRuntime {
  const ids = normalizePartyMemberIdsRuntime(input?.partyMembers, 1);
  const activeIndex = clampActivePartyIndexRuntime(input?.activeIndex, ids.length);
  const targetIndex = digitKeyToLegacyTargetIndexRuntime(input?.digitKey);
  const requestedDigit = Number(String(input?.digitKey || "").trim()) | 0;
  if (targetIndex < 0) {
    return {
      changed: false,
      next_active_index: activeIndex,
      selected_party_id: ids[activeIndex] || null,
      requested_digit: requestedDigit,
      target_index: targetIndex,
      reason: "invalid_digit"
    };
  }
  if (targetIndex >= ids.length) {
    return {
      changed: false,
      next_active_index: activeIndex,
      selected_party_id: ids[activeIndex] || null,
      requested_digit: requestedDigit,
      target_index: targetIndex,
      reason: "out_of_range"
    };
  }
  if (targetIndex === activeIndex) {
    return {
      changed: false,
      next_active_index: activeIndex,
      selected_party_id: ids[activeIndex] || null,
      requested_digit: requestedDigit,
      target_index: targetIndex,
      reason: "same_index"
    };
  }
  return {
    changed: true,
    next_active_index: targetIndex,
    selected_party_id: ids[targetIndex] || null,
    requested_digit: requestedDigit,
    target_index: targetIndex,
    reason: "applied"
  };
}

export function projectMessageLogEntriesRuntime(input: {
  entries: unknown;
  maxEntries?: number;
  lineMaxChars?: number;
}): MessageLogPanelEntryRuntime[] {
  const maxEntries = Math.max(1, Number(input?.maxEntries) | 0) || 8;
  const lineMaxChars = Math.max(8, Number(input?.lineMaxChars) | 0) || 64;
  const src = Array.isArray(input?.entries) ? input.entries : [];
  const out: MessageLogPanelEntryRuntime[] = src.map((row: any, seq: number) => ({
    tick: toU32(row?.tick ?? seq),
    level: String(row?.level || "info"),
    text: String(row?.text || "").replace(/\s+/g, " ").trim().slice(0, lineMaxChars),
    seq: toU32(row?.seq ?? seq)
  }));
  return out.slice(-maxEntries);
}

export function buildPartyMessageRegressionProbesRuntime(): {
  party_selection: Array<{
    id: string;
    changed: boolean;
    next_active_index: number;
    reason: string;
  }>;
  message_windows: Array<{
    id: string;
    count: number;
    first_tick: number;
    last_tick: number;
  }>;
} {
  const party_selection = [
    { id: "select_first", args: { digitKey: "1", partyMembers: [1, 12, 23], activeIndex: 2 } },
    { id: "select_same", args: { digitKey: "2", partyMembers: [1, 12, 23], activeIndex: 1 } },
    { id: "select_out_of_range", args: { digitKey: "9", partyMembers: [1, 12, 23], activeIndex: 1 } },
    { id: "select_zero_out_of_range", args: { digitKey: "0", partyMembers: [1, 12, 23], activeIndex: 0 } }
  ].map((row) => {
    const r = resolvePartySwitchDigitRuntime(row.args);
    return {
      id: row.id,
      changed: !!r.changed,
      next_active_index: r.next_active_index | 0,
      reason: String(r.reason)
    };
  });

  const makeLog = (count: number) => Array.from({ length: count }, (_unused, i) => ({
    tick: i + 100,
    level: "info",
    text: `entry_${i}`
  }));
  const message_windows = [
    { id: "window_short", out: projectMessageLogEntriesRuntime({ entries: makeLog(3), maxEntries: 8 }) },
    { id: "window_trim", out: projectMessageLogEntriesRuntime({ entries: makeLog(12), maxEntries: 8 }) }
  ].map((row) => ({
    id: row.id,
    count: row.out.length >>> 0,
    first_tick: row.out.length ? (row.out[0].tick >>> 0) : 0,
    last_tick: row.out.length ? (row.out[row.out.length - 1].tick >>> 0) : 0
  }));

  return {
    party_selection,
    message_windows
  };
}

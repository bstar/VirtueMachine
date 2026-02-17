export type MessageLogEntryRuntime = {
  tick: number;
  level: string;
  text: string;
  seq: number;
};

export type MessageLogWindowRuntime = {
  entries: MessageLogEntryRuntime[];
  total_entries: number;
  window_size: number;
  scroll_offset: number;
  max_offset: number;
  start_index: number;
  end_index: number;
};

export type MessageLogScrollCommandRuntime =
  | "line_up"
  | "line_down"
  | "page_up"
  | "page_down"
  | "home"
  | "end";

function toU32(v: unknown): number {
  return Number(v) >>> 0;
}

function clampMessageScrollOffsetRuntime(totalEntries: number, windowSize: number, offset: unknown): number {
  const maxOffset = Math.max(0, totalEntries - windowSize);
  const n = Number(offset) | 0;
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  if (n > maxOffset) {
    return maxOffset;
  }
  return n;
}

export function normalizeMessageLogEntriesRuntime(input: {
  entries: unknown;
  lineMaxChars?: number;
}): MessageLogEntryRuntime[] {
  const lineMaxChars = Math.max(8, Number(input?.lineMaxChars) | 0) || 64;
  const src = Array.isArray(input?.entries) ? input.entries : [];
  const out: MessageLogEntryRuntime[] = src.map((row: any, i: number) => ({
    tick: toU32(row?.tick != null ? row.tick : i),
    level: String(row?.level || "info"),
    text: String(row?.text || "").replace(/\s+/g, " ").trim().slice(0, lineMaxChars),
    seq: toU32(row?.seq != null ? row.seq : i)
  }));
  out.sort((a, b) => (a.tick - b.tick) || (a.seq - b.seq));
  return out;
}

export function computeMessageLogWindowRuntime(input: {
  entries: unknown;
  windowSize?: number;
  scrollOffset?: unknown;
  lineMaxChars?: number;
}): MessageLogWindowRuntime {
  const entries = normalizeMessageLogEntriesRuntime({
    entries: input?.entries,
    lineMaxChars: input?.lineMaxChars
  });
  const totalEntries = entries.length >>> 0;
  const windowSize = Math.max(1, Number(input?.windowSize) | 0) || 8;
  const scrollOffset = clampMessageScrollOffsetRuntime(totalEntries, windowSize, input?.scrollOffset);
  const endExclusive = Math.max(0, totalEntries - scrollOffset);
  const start = Math.max(0, endExclusive - windowSize);
  const sliced = entries.slice(start, endExclusive);
  const maxOffset = Math.max(0, totalEntries - windowSize);
  return {
    entries: sliced,
    total_entries: totalEntries,
    window_size: windowSize,
    scroll_offset: scrollOffset,
    max_offset: maxOffset,
    start_index: start,
    end_index: endExclusive
  };
}

export function applyMessageLogScrollCommandRuntime(input: {
  entries: unknown;
  windowSize?: number;
  scrollOffset?: unknown;
  lineMaxChars?: number;
  command: MessageLogScrollCommandRuntime;
}): MessageLogWindowRuntime {
  const initial = computeMessageLogWindowRuntime({
    entries: input?.entries,
    windowSize: input?.windowSize,
    scrollOffset: input?.scrollOffset,
    lineMaxChars: input?.lineMaxChars
  });
  const step = Math.max(1, initial.window_size | 0);
  let nextOffset = initial.scroll_offset | 0;
  switch (input.command) {
    case "line_up":
      nextOffset += 1;
      break;
    case "line_down":
      nextOffset -= 1;
      break;
    case "page_up":
      nextOffset += step;
      break;
    case "page_down":
      nextOffset -= step;
      break;
    case "home":
      nextOffset = initial.max_offset;
      break;
    case "end":
      nextOffset = 0;
      break;
    default:
      break;
  }
  return computeMessageLogWindowRuntime({
    entries: input?.entries,
    windowSize: initial.window_size,
    scrollOffset: nextOffset,
    lineMaxChars: input?.lineMaxChars
  });
}

export function encodeMessageLogSnapshotRuntime(input: {
  entries: unknown;
  windowSize?: number;
  scrollOffset?: unknown;
  lineMaxChars?: number;
}): string {
  const normalized = computeMessageLogWindowRuntime({
    entries: input?.entries,
    windowSize: input?.windowSize,
    scrollOffset: input?.scrollOffset,
    lineMaxChars: input?.lineMaxChars
  });
  return JSON.stringify({
    entries: normalizeMessageLogEntriesRuntime({
      entries: input?.entries,
      lineMaxChars: input?.lineMaxChars
    }),
    window_size: normalized.window_size,
    scroll_offset: normalized.scroll_offset
  });
}

export function decodeMessageLogSnapshotRuntime(raw: unknown): {
  entries: MessageLogEntryRuntime[];
  window_size: number;
  scroll_offset: number;
} | null {
  try {
    const parsed = (typeof raw === "string") ? JSON.parse(raw) : raw;
    const entries = normalizeMessageLogEntriesRuntime({
      entries: parsed?.entries,
      lineMaxChars: 64
    });
    const windowSize = Math.max(1, Number(parsed?.window_size) | 0) || 8;
    const scrollOffset = clampMessageScrollOffsetRuntime(entries.length, windowSize, parsed?.scroll_offset);
    return {
      entries,
      window_size: windowSize,
      scroll_offset: scrollOffset
    };
  } catch (_err) {
    return null;
  }
}

export function buildMessageLogRegressionProbesRuntime(): {
  window_cases: Array<{ id: string; count: number; first_tick: number; last_tick: number; max_offset: number }>;
  scroll_command_cases: Array<{ id: string; command: string; offset: number; first_tick: number; last_tick: number }>;
  persistence_cases: Array<{ id: string; ok: boolean; entry_count: number; offset: number }>;
} {
  const makeEntries = (n: number) => Array.from({ length: n }, (_unused, i) => ({
    tick: 100 + i,
    level: "info",
    text: `entry_${i}`,
    seq: i
  }));
  const entries = makeEntries(12);

  const windowShort = computeMessageLogWindowRuntime({ entries: makeEntries(3), windowSize: 8, scrollOffset: 0 });
  const windowTrim = computeMessageLogWindowRuntime({ entries, windowSize: 8, scrollOffset: 0 });

  const scrollCases = [
    { id: "line_up", command: "line_up" as const, offset: 0 },
    { id: "page_up", command: "page_up" as const, offset: 0 },
    { id: "home", command: "home" as const, offset: 0 },
    { id: "end", command: "end" as const, offset: 4 }
  ].map((row) => {
    const out = applyMessageLogScrollCommandRuntime({
      entries,
      windowSize: 8,
      scrollOffset: row.offset,
      command: row.command
    });
    return {
      id: row.id,
      command: row.command,
      offset: out.scroll_offset,
      first_tick: out.entries.length ? out.entries[0].tick : 0,
      last_tick: out.entries.length ? out.entries[out.entries.length - 1].tick : 0
    };
  });

  const encoded = encodeMessageLogSnapshotRuntime({
    entries,
    windowSize: 8,
    scrollOffset: 3
  });
  const decoded = decodeMessageLogSnapshotRuntime(encoded);
  const persistence = [{
    id: "roundtrip",
    ok: !!decoded,
    entry_count: decoded ? decoded.entries.length : 0,
    offset: decoded ? decoded.scroll_offset : 0
  }];

  return {
    window_cases: [
      {
        id: "window_short",
        count: windowShort.entries.length,
        first_tick: windowShort.entries.length ? windowShort.entries[0].tick : 0,
        last_tick: windowShort.entries.length ? windowShort.entries[windowShort.entries.length - 1].tick : 0,
        max_offset: windowShort.max_offset
      },
      {
        id: "window_trim",
        count: windowTrim.entries.length,
        first_tick: windowTrim.entries.length ? windowTrim.entries[0].tick : 0,
        last_tick: windowTrim.entries.length ? windowTrim.entries[windowTrim.entries.length - 1].tick : 0,
        max_offset: windowTrim.max_offset
      }
    ],
    scroll_command_cases: scrollCases,
    persistence_cases: persistence
  };
}

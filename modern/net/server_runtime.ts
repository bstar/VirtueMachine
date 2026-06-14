import nodeCrypto from "node:crypto";

export type WorldClockRuntime = {
  date_d: number;
  date_m: number;
  date_y: number;
  last_advanced_at_ms: number;
  tick: number;
  time_h: number;
  time_m: number;
};

export function defaultWorldClockRuntime(nowMs = Date.now()): WorldClockRuntime {
  return {
    tick: 0,
    time_m: 0,
    time_h: 0,
    date_d: 1,
    date_m: 1,
    date_y: 1,
    last_advanced_at_ms: nowMs
  };
}

export function normalizeWorldClockRuntime(raw: unknown, nowMs = Date.now()): WorldClockRuntime {
  const base = defaultWorldClockRuntime(nowMs);
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const row = raw as Partial<WorldClockRuntime>;
  return {
    tick: Number(row.tick) >>> 0,
    time_m: Number(row.time_m) >>> 0,
    time_h: Number(row.time_h) >>> 0,
    date_d: Number(row.date_d) >>> 0 || 1,
    date_m: Number(row.date_m) >>> 0 || 1,
    date_y: Number(row.date_y) >>> 0 || 1,
    last_advanced_at_ms: Number(row.last_advanced_at_ms) || nowMs
  };
}

export function parseU16LERuntime(bytes: Uint8Array | Buffer, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

export function decodePackedCoordRuntime(raw0: number, raw1: number, raw2: number): { x: number; y: number; z: number } {
  return {
    x: (raw0 | ((raw1 & 0x03) << 8)) >>> 0,
    y: ((raw1 >> 2) | ((raw2 & 0x0f) << 6)) >>> 0,
    z: ((raw2 >> 4) & 0x0f) >>> 0
  };
}

export function clampIntRuntime(n: unknown, lo: number, hi: number): number {
  const v = Number(n) | 0;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function queryIntOrRuntime(url: URL, key: string, fallback: number): number {
  if (!url.searchParams.has(key)) {
    return fallback;
  }
  const v = Number(url.searchParams.get(key));
  if (!Number.isFinite(v)) {
    return fallback;
  }
  return v | 0;
}

export function advanceWorldClockMinuteRuntime(clock: WorldClockRuntime, args: {
  daysPerMonth: number;
  hoursPerDay: number;
  minutesPerHour: number;
  monthsPerYear: number;
}): void {
  clock.time_m += 1;
  if (clock.time_m < args.minutesPerHour) return;
  clock.time_m = 0;
  clock.time_h += 1;
  if (clock.time_h < args.hoursPerDay) return;
  clock.time_h = 0;
  clock.date_d += 1;
  if (clock.date_d <= args.daysPerMonth) return;
  clock.date_d = 1;
  clock.date_m += 1;
  if (clock.date_m <= args.monthsPerYear) return;
  clock.date_m = 1;
  clock.date_y += 1;
}

export function computeSnapshotHashRuntime(snapshotBase64: unknown): string {
  return nodeCrypto.createHash("sha256").update(String(snapshotBase64 || "")).digest("hex");
}

export function deterministicRecoveryTickLastRuntime(
  events: readonly { item_id?: unknown; tick?: unknown }[],
  itemId: unknown
): number | null {
  const wanted = String(itemId);
  const filtered = events
    .filter((e) => String(e.item_id) === wanted)
    .map((e) => Number(e.tick))
    .filter((tick) => Number.isFinite(tick))
    .sort((a, b) => b - a);
  return filtered.length ? filtered[0] : null;
}

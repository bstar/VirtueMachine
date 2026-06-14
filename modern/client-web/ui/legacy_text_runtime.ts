export type LegacyLookStringEntryRuntime = {
  text?: unknown;
  tileId: number;
};

export function legacyLookupTileStringRuntime(
  tileId: number,
  entries: readonly LegacyLookStringEntryRuntime[] | null | undefined
): string {
  const n = Array.isArray(entries) ? entries.length : 0;
  if (n <= 0) {
    return "nothing";
  }
  let i = 0;
  let si = entries[0].tileId | 0;
  let out = String(entries[0].text || "nothing");
  const target = tileId & 0xffff;
  while (si < target && (i + 1) < n) {
    i += 1;
    si = entries[i].tileId | 0;
    out = String(entries[i].text || out);
  }
  return out || "nothing";
}

export function legacyArticleForTileRuntime(
  tileId: number,
  tileFlags2: ArrayLike<number> | null | undefined
): string {
  if (!tileFlags2) {
    return "";
  }
  const f = Number(tileFlags2[tileId & 0x07ff]) & 0xc0;
  if (f === 0x40) return "a ";
  if (f === 0x80) return "an ";
  if (f === 0xc0) return "the ";
  return "";
}

export function canonicalLookSentenceForTileRuntime(
  tileId: number,
  entries: readonly LegacyLookStringEntryRuntime[] | null | undefined,
  tileFlags2: ArrayLike<number> | null | undefined
): string {
  const name = legacyLookupTileStringRuntime(tileId, entries);
  const article = legacyArticleForTileRuntime(tileId, tileFlags2);
  return `Thou dost see ${article}${name}.`;
}

export function canonicalTalkSpeakerForTileRuntime(
  tileId: number,
  entries: readonly LegacyLookStringEntryRuntime[] | null | undefined,
  tileFlags2: ArrayLike<number> | null | undefined
): string {
  const raw = String(legacyLookupTileStringRuntime(tileId, entries) || "Unknown");
  const article = String(legacyArticleForTileRuntime(tileId, tileFlags2) || "").trim().toLowerCase();
  if (!article) {
    return normalizeLegacySpeakerCapsRuntime(raw);
  }
  const prefix = `${article} `;
  if (raw.toLowerCase().startsWith(prefix)) {
    return normalizeLegacySpeakerCapsRuntime(raw.slice(prefix.length).trim() || raw);
  }
  return normalizeLegacySpeakerCapsRuntime(raw);
}

export function sanitizeLegacyHudLabelTextRuntime(text: unknown): string {
  return String(text || "")
    .replace(/[^\x20-\x7e]+/g, " ")
    .replace(/[^A-Za-z0-9 .,'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function areaIdForWorldXYRuntime(x: unknown, y: unknown): number {
  const ax = ((Number(x) | 0) >> 7) & 0x7;
  const ay = ((Number(y) | 0) >> 7) & 0x7;
  return ((ay << 3) | ax) & 0x3f;
}

function normalizeLegacySpeakerCapsRuntime(value: unknown): string {
  const text = normalizeLegacySpeakerTextRuntime(value);
  if (!text) return text;
  const letters = text.replace(/[^A-Za-z]+/g, "");
  if (!letters || letters !== letters.toUpperCase()) {
    return text;
  }
  return text
    .toLowerCase()
    .replace(/\b([a-z])/g, (_m, ch: string) => ch.toUpperCase());
}

function normalizeLegacySpeakerTextRuntime(value: unknown): string {
  return String(value || "")
    .replace(/\bor britannia\b/ig, "of Britannia")
    .replace(/\s+/g, " ")
    .trim();
}

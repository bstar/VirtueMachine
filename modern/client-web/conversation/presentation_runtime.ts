export function formatYouSeeLine(subject: unknown): string {
  const base = String(subject || "").trim();
  if (!base) {
    return "You see someone.";
  }
  const trimmed = base.replace(/\s+/g, " ").trim();
  if (/[.!?]$/.test(trimmed)) {
    return `You see ${trimmed}`;
  }
  return `You see ${trimmed}.`;
}

export function canonicalTalkFallbackGreeting(
  objNum: unknown,
  vmContext: { varStr?: unknown[] } | null | undefined,
  macroSymbolToIndex: ((symbol: string) => number) | null | undefined
): string {
  const n = Number(objNum) | 0;
  if (n !== 5) {
    return "";
  }
  const idx = (symbol: string): number => {
    if (typeof macroSymbolToIndex !== "function") return -1;
    return Number(macroSymbolToIndex(symbol)) | 0;
  };
  const varStr = Array.isArray(vmContext?.varStr) ? vmContext.varStr : [];
  const timeWord = String(varStr[idx("T")] || "morning");
  const player = String(varStr[4] || varStr[idx("P")] || "Avatar");
  return `Good ${timeWord}, ${player}. What wouldst thou speak of?`;
}

export function canonicalizeOpeningLines(
  objNum: unknown,
  lines: unknown,
  fallbackGreeting: unknown
): string[] {
  const n = Number(objNum) | 0;
  const src = Array.isArray(lines) ? lines : [];
  if (n !== 5) {
    return src;
  }
  const joined = src.join(" ");
  const asksTopic = /what wouldst thou speak of\?/i.test(joined);
  const badPlaceholder = /\$2\b/.test(joined);
  if (asksTopic && badPlaceholder) {
    const fallback = String(fallbackGreeting || "").trim();
    return fallback ? [fallback] : src;
  }
  return src;
}

export function conversationMacroSymbolToIndex(sym: unknown): number {
  const ch = String(sym || "").toUpperCase();
  if (!ch) return -1;
  if (ch >= "0" && ch <= "9") {
    return ch.charCodeAt(0) - 0x30;
  }
  if (ch >= "A" && ch <= "Z") {
    return ch.charCodeAt(0) - 0x37;
  }
  return -1;
}

export type ConversationVmContext = {
  varStr: string[];
  varInt: number[];
  talkFlags: Record<string, unknown>;
  objNum: number;
};

export function buildConversationVmContext(input: Record<string, unknown> | null = null): ConversationVmContext {
  const src = (input && typeof input === "object") ? input : {};
  const varStr = new Array(64).fill("");
  const varInt = new Array(64).fill(0);
  const talkFlags = Object.create(null);
  const hour = Number(src.hour) | 0;
  const timeWord = (hour < 12) ? "morning" : ((hour < 18) ? "afternoon" : "evening");
  const player = String(src.player || "Avatar").trim() || "Avatar";
  const target = String(src.target || "").trim();
  const greeting = String(src.greeting || "milady").trim() || "milady";
  const partySize = Number(src.partySize) | 0;
  varStr[conversationMacroSymbolToIndex("G")] = greeting;
  varStr[conversationMacroSymbolToIndex("N")] = target;
  varStr[conversationMacroSymbolToIndex("P")] = player;
  varStr[conversationMacroSymbolToIndex("T")] = timeWord;
  varStr[4] = "Avatar";
  varInt[conversationMacroSymbolToIndex("H")] = hour;
  varInt[conversationMacroSymbolToIndex("G")] = (greeting.toLowerCase() === "milady") ? 1 : 0;
  varInt[conversationMacroSymbolToIndex("N")] = Math.max(0, partySize - 1);
  return {
    varStr,
    varInt,
    talkFlags,
    objNum: Number(src.objNum) | 0
  };
}

export function renderConversationMacrosWithContext(text: unknown, vmContext: ConversationVmContext | Record<string, unknown> | null = null): string {
  const ctx = (vmContext && typeof vmContext === "object") ? vmContext : {};
  const varStr = Array.isArray(ctx.varStr) ? ctx.varStr : [];
  return String(text || "")
    .replace(/\$([0-9A-Z])/gi, (_m, sym) => {
      const idx = conversationMacroSymbolToIndex(sym);
      if (idx < 0 || idx >= varStr.length) return "";
      return String(varStr[idx] || "");
    })
    .replace(/@([A-Za-z0-9]+)/g, "$1");
}

export function splitConversationInputWords(input: unknown): string[] {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9?\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function conversationWordMatchesPattern(pattern: unknown, word: unknown): boolean {
  const p = String(pattern || "").toLowerCase();
  const w = String(word || "").toLowerCase();
  if (!p || w.length < p.length) {
    return false;
  }
  for (let i = 0; i < p.length; i += 1) {
    const pc = p[i];
    if (pc !== "?" && pc !== w[i]) {
      return false;
    }
  }
  return true;
}

export function conversationKeyMatchesInput(pattern: unknown, input: unknown): boolean {
  const key = String(pattern || "").trim().toLowerCase();
  if (!key) return false;
  if (key === "*") return true;
  const words = splitConversationInputWords(input);
  for (const w of words) {
    if (conversationWordMatchesPattern(key, w)) {
      return true;
    }
  }
  return false;
}

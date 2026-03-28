export const CONV_OP_DESC = 0xf1;
export const CONV_OP_MAIN = 0xf2;
export const CONV_OP_END = 0xff;

export function decompressU6LzwRuntime(bytes: Uint8Array | null | undefined): Uint8Array | null {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) return null;
  const outLen = (
    (bytes[0] & 0xff)
    | ((bytes[1] & 0xff) << 8)
    | ((bytes[2] & 0xff) << 16)
    | ((bytes[3] & 0xff) << 24)
  ) >>> 0;
  const src = bytes.subarray(4);
  const out = new Uint8Array(outLen);
  const CLEAR = 256;
  const END = 257;
  const table: Array<Uint8Array | undefined> = new Array(4096);
  for (let i = 0; i < 256; i += 1) table[i] = Uint8Array.of(i);
  let bitPos = 0;
  let codeSize = 9;
  let nextCode = 258;
  let prev: Uint8Array | null = null;
  let outPos = 0;
  function readCode(n: number): number {
    let outCode = 0;
    for (let i = 0; i < n; i += 1) {
      const bi = (bitPos + i) >> 3;
      const bt = (bitPos + i) & 7;
      if (bi >= src.length) return -1;
      outCode |= ((src[bi] >> bt) & 1) << i;
    }
    bitPos += n;
    return outCode;
  }
  while (outPos < out.length) {
    const code = readCode(codeSize);
    if (code < 0) break;
    if (code === CLEAR) {
      for (let i = 258; i < table.length; i += 1) table[i] = undefined;
      codeSize = 9;
      nextCode = 258;
      prev = null;
      continue;
    }
    if (code === END) break;
    let entry: Uint8Array | null = null;
    if (table[code]) {
      entry = table[code]!;
    } else if (code === nextCode && prev) {
      entry = new Uint8Array(prev.length + 1);
      entry.set(prev, 0);
      entry[prev.length] = prev[0];
    } else {
      break;
    }
    out.set(entry.slice(0, Math.max(0, out.length - outPos)), outPos);
    outPos += entry.length;
    if (prev && nextCode < 4096) {
      const next = new Uint8Array(prev.length + 1);
      next.set(prev, 0);
      next[prev.length] = entry[0];
      table[nextCode] = next;
      nextCode += 1;
      if ((nextCode === 512 || nextCode === 1024 || nextCode === 2048) && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }
  return out;
}

export function decodeU6LzwWithKnownLengthRuntime(srcBytes: Uint8Array | null | undefined, outLen: number): Uint8Array | null {
  const src = (srcBytes instanceof Uint8Array) ? srcBytes : null;
  const outSize = Number(outLen) >>> 0;
  if (!src || !src.length || outSize === 0 || outSize > 0x7fffffff) {
    return null;
  }
  const wrapped = new Uint8Array(src.length + 4);
  wrapped[0] = outSize & 0xff;
  wrapped[1] = (outSize >>> 8) & 0xff;
  wrapped[2] = (outSize >>> 16) & 0xff;
  wrapped[3] = (outSize >>> 24) & 0xff;
  wrapped.set(src, 4);
  return decompressU6LzwRuntime(wrapped);
}

export function conversationArchiveForNpcRuntime(objNum: number, objType: number): { archive: "a" | "b"; index: number } | null {
  const n = Number(objNum) | 0;
  const t = Number(objType) & 0x03ff;
  if (n >= 0xe0) {
    if (t === 0x175) return { archive: "b", index: 0x66 };
    if (t === 0x17e) return { archive: "b", index: 0x67 };
    if (t === 0x16b) return { archive: "b", index: 0x68 };
    return null;
  }
  if (n > 0x62) {
    return { archive: "b", index: n - 0x63 };
  }
  if (n < 0) {
    return null;
  }
  return { archive: "a", index: n };
}

export function loadLegacyConversationScriptFromArchiveRuntime(
  archive: Uint8Array | null | undefined,
  index: number
): Uint8Array | null {
  if (!(archive instanceof Uint8Array) || archive.length < 4) {
    return null;
  }
  const idx = Number(index) | 0;
  if (idx < 0) {
    return null;
  }
  const offPtr = idx << 2;
  if (offPtr < 0 || (offPtr + 4) > archive.length) {
    return null;
  }
  const dv = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const offset = dv.getUint32(offPtr, true) >>> 0;
  if (!offset || (offset + 4) > archive.length) {
    return null;
  }
  const inflatedSize = dv.getUint32(offset, true) >>> 0;
  let bytes: Uint8Array | null = null;
  if (inflatedSize && inflatedSize < 0x2800) {
    bytes = decodeU6LzwWithKnownLengthRuntime(archive.subarray(offset + 4), inflatedSize);
  } else {
    const end = Math.min(archive.length, offset + 4 + 0x2800);
    bytes = archive.subarray(offset + 4, end);
  }
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) {
    return null;
  }
  return bytes;
}

export function loadLegacyConversationScriptForNpcRuntime(
  archives: { a?: Uint8Array | null; b?: Uint8Array | null } | null | undefined,
  objNum: number,
  objType: number
): Uint8Array | null {
  const spec = conversationArchiveForNpcRuntime(objNum, objType);
  if (!spec) {
    return null;
  }
  const archive = spec.archive === "b" ? archives?.b : archives?.a;
  return loadLegacyConversationScriptFromArchiveRuntime(archive || null, spec.index);
}

export function parseConversationHeaderAndDescRuntime(scriptBytes: Uint8Array | null | undefined): {
  name: string;
  desc: string;
  mainPc: number;
} {
  if (!(scriptBytes instanceof Uint8Array) || scriptBytes.length < 4) {
    return { name: "", desc: "", mainPc: 0 };
  }
  let i = 0;
  if (scriptBytes[i] === CONV_OP_END) i += 1;
  if (i < scriptBytes.length) i += 1;
  let name = "";
  while (i < scriptBytes.length && scriptBytes[i] !== CONV_OP_DESC) {
    const b = scriptBytes[i++];
    if (b >= 32 && b < 127) {
      name += String.fromCharCode(b);
    }
  }
  if (i < scriptBytes.length && scriptBytes[i] === CONV_OP_DESC) {
    i += 1;
  }
  let desc = "";
  while (i < scriptBytes.length && scriptBytes[i] !== CONV_OP_MAIN) {
    const b = scriptBytes[i++];
    if (b === 0x2a) {
      break;
    }
    if (b === 10 || b === 13) {
      desc += " ";
    } else if (b >= 32 && b < 127) {
      desc += String.fromCharCode(b);
    }
  }
  while (i < scriptBytes.length && scriptBytes[i] !== CONV_OP_MAIN) {
    i += 1;
  }
  if (i < scriptBytes.length && scriptBytes[i] === CONV_OP_MAIN) {
    i += 1;
  }
  return {
    name: String(name || "").trim(),
    desc: String(desc || "").replace(/\s+/g, " ").trim(),
    mainPc: i
  };
}

export function conversationTextReadabilityScoreRuntime(text: unknown): number {
  const s = String(text || "");
  if (!s) return 0;
  let good = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (/[A-Za-z0-9 ,.'!?-]/.test(s[i])) {
      good += 1;
    }
  }
  return good / s.length;
}

export function isLikelyValidConversationHeaderRuntime(header: { name?: unknown; desc?: unknown } | null | undefined): boolean {
  const name = String(header?.name || "").trim();
  const desc = String(header?.desc || "").trim();
  if (!name || !desc) {
    return false;
  }
  if (conversationTextReadabilityScoreRuntime(name) < 0.85) {
    return false;
  }
  if (conversationTextReadabilityScoreRuntime(desc) < 0.85) {
    return false;
  }
  return /[A-Za-z]/.test(name) && /[A-Za-z]/.test(desc);
}

export function isLikelyValidConversationScriptRuntime(
  scriptBytes: Uint8Array | null | undefined,
  header: { name?: unknown; desc?: unknown; mainPc?: unknown } | null | undefined
): boolean {
  if (!(scriptBytes instanceof Uint8Array) || scriptBytes.length < 8) {
    return false;
  }
  if (scriptBytes[0] !== CONV_OP_END) {
    return false;
  }
  if (!isLikelyValidConversationHeaderRuntime(header)) {
    return false;
  }
  const mainPc = Number(header?.mainPc) | 0;
  if (mainPc <= 2 || mainPc >= scriptBytes.length) {
    return false;
  }
  for (let i = mainPc; i < scriptBytes.length; i += 1) {
    if ((scriptBytes[i] & 0xff) === 0xef) {
      return true;
    }
  }
  return false;
}

export type LegacyDecompressRuntime = (bytes: Uint8Array) => Uint8Array | null | undefined;

export type LegacyPixmapRuntime = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

export type LegacyLookStringEntryRuntime = {
  tileId: number;
  text: string;
};

export function decodeLegacyPixmapRuntime(
  bytes: Uint8Array | null | undefined,
  decompress: LegacyDecompressRuntime
): LegacyPixmapRuntime | null {
  if (!bytes || bytes.length < 4) {
    return null;
  }
  const decoded = decompress(bytes);
  if (!decoded || decoded.length < 4) {
    return null;
  }
  const w = decoded[0] | (decoded[1] << 8);
  const h = decoded[2] | (decoded[3] << 8);
  const size = w * h;
  if (w <= 0 || h <= 0 || decoded.length < (4 + size)) {
    return null;
  }
  return {
    width: w,
    height: h,
    pixels: decoded.slice(4, 4 + size)
  };
}

export function decodeLookLzdEntriesRuntime(
  bytes: Uint8Array,
  decompress: LegacyDecompressRuntime
): LegacyLookStringEntryRuntime[] {
  const decoded = decompress(bytes);
  if (!decoded || decoded.length < 3) {
    return [];
  }
  const entries: LegacyLookStringEntryRuntime[] = [];
  let p = 0;
  const td = new TextDecoder("latin1");
  while ((p + 2) <= decoded.length) {
    const tileId = (decoded[p] | (decoded[p + 1] << 8)) & 0xffff;
    p += 2;
    let e = p;
    while (e < decoded.length && decoded[e] !== 0) {
      e += 1;
    }
    const raw = td.decode(decoded.slice(p, e)).trim();
    if (raw) {
      entries.push({ tileId, text: raw });
    }
    if (e >= decoded.length) {
      break;
    }
    p = e + 1;
  }
  return entries;
}

import type { IndexedPixmapRuntime } from "../render/indexed_pixels_runtime.ts";

export type LegacyDecompressRuntime = (bytes: Uint8Array) => Uint8Array | null | undefined;

export type U6ShapeRuntime = IndexedPixmapRuntime & {
  hotX: number;
  hotY: number;
};

type CursorArchiveItemRuntime = {
  flag: number;
  offset: number;
  size: number;
};

export function decodeU6ShapeFromBufferRuntime(buf: Uint8Array | null | undefined): U6ShapeRuntime | null {
  if (!buf || buf.length < 10) {
    return null;
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const x1 = dv.getUint16(0, true);
  const x2 = dv.getUint16(2, true);
  const y1 = dv.getUint16(4, true);
  const y2 = dv.getUint16(6, true);
  const hotX = x2 | 0;
  const hotY = y1 | 0;
  const width = ((x1 + x2 + 1) | 0);
  const height = ((y1 + y2 + 1) | 0);
  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
    return null;
  }
  const pixels = new Uint8Array(width * height);
  pixels.fill(0xff);

  let off = 8;
  while ((off + 2) <= buf.length) {
    let num = dv.getUint16(off, true);
    off += 2;
    if (num === 0) {
      break;
    }
    if ((off + 4) > buf.length) {
      break;
    }
    const xPos = dv.getInt16(off, true);
    off += 2;
    const yPos = dv.getInt16(off, true);
    off += 2;

    const encoded = (num & 1) !== 0;
    num >>>= 1;
    const rowBase = ((hotY + yPos) * width) + hotX + xPos;
    if (rowBase < 0 || rowBase >= pixels.length) {
      break;
    }

    if (!encoded) {
      const n = Math.min(num, Math.max(0, buf.length - off));
      const end = Math.min(pixels.length, rowBase + n);
      const count = Math.max(0, end - rowBase);
      if (count > 0) {
        pixels.set(buf.slice(off, off + count), rowBase);
      }
      off += n;
      continue;
    }

    let j = 0;
    while (j < num && off < buf.length) {
      let num2 = buf[off++] & 0xff;
      const repeat = (num2 & 1) !== 0;
      num2 >>>= 1;
      if (num2 <= 0) {
        continue;
      }
      const writeAt = rowBase + j;
      const maxWrite = Math.max(0, Math.min(num2, pixels.length - writeAt));
      if (repeat) {
        if (off >= buf.length) {
          break;
        }
        const value = buf[off++] & 0xff;
        if (maxWrite > 0) {
          pixels.fill(value, writeAt, writeAt + maxWrite);
        }
      } else {
        const avail = Math.max(0, buf.length - off);
        const copyCount = Math.min(maxWrite, avail);
        if (copyCount > 0) {
          pixels.set(buf.slice(off, off + copyCount), writeAt);
        }
        off += num2;
      }
      j += num2;
    }
  }

  return { width, height, hotX, hotY, pixels };
}

export function decodeU6ShpArchiveRuntime(
  bytes: Uint8Array | null | undefined,
  decompress: LegacyDecompressRuntime
): Array<U6ShapeRuntime | null> {
  if (!bytes || bytes.length < 8) {
    return [];
  }
  const decoded = decompress(bytes);
  if (!decoded || decoded.length < 8) {
    return [];
  }
  const dv = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);
  const firstOff = dv.getUint32(4, true);
  if (firstOff < 8 || firstOff >= decoded.length || (firstOff % 4) !== 0) {
    return [];
  }
  const count = Math.floor((firstOff - 4) / 4);
  if (count <= 0) {
    return [];
  }
  const offs = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    offs[i] = dv.getUint32(4 + (i * 4), true) >>> 0;
  }
  const out: Array<U6ShapeRuntime | null> = [];
  for (let i = 0; i < count; i += 1) {
    const start = offs[i] >>> 0;
    if (start <= 0 || start >= decoded.length) {
      out.push(null);
      continue;
    }
    let end = decoded.length;
    for (let j = i + 1; j < count; j += 1) {
      const cand = offs[j] >>> 0;
      if (cand > start && cand <= decoded.length) {
        end = cand;
        break;
      }
    }
    out.push(decodeU6ShapeFromBufferRuntime(decoded.slice(start, end)));
  }
  return out;
}

export function decodeU6CursorPtrRuntime(
  bytes: Uint8Array | null | undefined,
  decompress: LegacyDecompressRuntime
): U6ShapeRuntime[] {
  if (!bytes || bytes.length < 8) {
    return [];
  }
  const decoded = decompress(bytes);
  if (!decoded || decoded.length < 16) {
    return [];
  }
  const dv = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);
  const fileSize = dv.getUint32(0, true) >>> 0;
  if (fileSize <= 0 || fileSize > decoded.length) {
    return [];
  }
  const firstOffsetRaw = dv.getUint32(4, true) >>> 0;
  const firstOffset = firstOffsetRaw & 0x00ffffff;
  if (firstOffset < 8 || firstOffset > fileSize || (firstOffset % 4) !== 0) {
    return [];
  }
  const count = Math.floor((firstOffset - 4) / 4);
  if (count <= 0 || count > 512) {
    return [];
  }

  const items: CursorArchiveItemRuntime[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = dv.getUint32(4 + (i * 4), true) >>> 0;
    const flag = (raw >>> 24) & 0xff;
    const offset = raw & 0x00ffffff;
    items.push({ flag, offset, size: 0 });
  }

  for (let i = 0; i < count; i += 1) {
    const cur = items[i];
    if (!cur.offset) {
      continue;
    }
    let nextOffset = fileSize;
    for (let j = i + 1; j < count; j += 1) {
      if (items[j].offset > cur.offset) {
        nextOffset = items[j].offset;
        break;
      }
    }
    cur.size = Math.max(0, nextOffset - cur.offset);
  }

  const cursors: U6ShapeRuntime[] = [];
  for (const item of items) {
    if (!item.offset || item.size <= 0 || (item.offset + item.size) > decoded.length) {
      continue;
    }
    let payload: Uint8Array = decoded.slice(item.offset, item.offset + item.size);
    if (item.flag === 0x01 || item.flag === 0x20) {
      const decompressed = decompress(payload);
      if (!decompressed) {
        continue;
      }
      payload = decompressed;
    }
    const shape = decodeU6ShapeFromBufferRuntime(payload);
    if (shape) {
      cursors.push(shape);
    }
  }
  return cursors;
}

export function decodePortraitFromArchiveRuntime(
  bytes: Uint8Array | null | undefined,
  decompress: LegacyDecompressRuntime,
  index = 0
): IndexedPixmapRuntime | null {
  if (!bytes || bytes.length < 8) {
    return null;
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const firstOff = dv.getUint32(0, true);
  if (firstOff <= 0 || firstOff >= bytes.length || (firstOff % 4) !== 0) {
    return null;
  }
  const count = Math.floor(firstOff / 4);
  if (count <= 0 || index < 0 || index >= count) {
    return null;
  }
  const offs = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    offs[i] = dv.getUint32(i * 4, true);
  }
  const start = offs[index] >>> 0;
  if (start <= 0 || start >= bytes.length) {
    return null;
  }
  let end = bytes.length;
  for (let i = index + 1; i < count; i += 1) {
    const o = offs[i] >>> 0;
    if (o > start && o <= bytes.length) {
      end = o;
      break;
    }
  }
  if (end <= start) {
    return null;
  }
  const dec = decompress(bytes.slice(start, end));
  const w = 56;
  const h = 64;
  const need = w * h;
  if (!dec || dec.length < need) {
    return null;
  }
  return {
    width: w,
    height: h,
    pixels: dec.slice(0, need)
  };
}

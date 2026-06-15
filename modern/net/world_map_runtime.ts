import fs from "node:fs";
import path from "node:path";

function parseU16LE(bytes: Buffer | Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

export function loadTileFlagMap(runtimeDir: string): Uint8Array {
  const tileflagPath = path.join(runtimeDir, "tileflag");
  try {
    const buf = fs.readFileSync(tileflagPath);
    if (buf.length >= 0x1000) {
      return new Uint8Array(buf.slice(0x800, 0x1000));
    }
    return new Uint8Array(buf.slice(0, 0x800));
  } catch (_err) {
    return new Uint8Array(0x800);
  }
}

export function loadTerrainTypeMap(runtimeDir: string): Uint8Array {
  const tileflagPath = path.join(runtimeDir, "tileflag");
  try {
    const buf = fs.readFileSync(tileflagPath);
    return new Uint8Array(buf.slice(0, Math.min(buf.length, 0x800)));
  } catch (_err) {
    return new Uint8Array(0x800);
  }
}

export function loadTypeWeightMap(runtimeDir: string): Uint8Array {
  const tileflagPath = path.join(runtimeDir, "tileflag");
  try {
    const buf = fs.readFileSync(tileflagPath);
    if (buf.length >= 0x1400) {
      return new Uint8Array(buf.slice(0x1000, 0x1400));
    }
    return new Uint8Array(0x400);
  } catch (_err) {
    return new Uint8Array(0x400);
  }
}

export class U6MapRuntime {
  map: Buffer;
  chunks: Buffer;
  window: Buffer;
  loadedZ: number;
  loadedMapId0: number;

  constructor(runtimeDir: string) {
    this.map = fs.readFileSync(path.join(runtimeDir, "map"));
    this.chunks = fs.readFileSync(path.join(runtimeDir, "chunks"));
    this.window = Buffer.alloc(0x600);
    this.loadedZ = -1;
    this.loadedMapId0 = -1;
  }

  mkMapId(x: number, y: number): number {
    return (x >> 7) + ((y >> 4) & 0x38);
  }

  loadWindow(x: number, y: number, z: number): void {
    x &= 0x3ff;
    y &= 0x3ff;
    if (z !== 0) {
      const off = ((z + z + z) << 9) + 0x5a00;
      this.map.copy(this.window, 0, off, off + 0x600);
      this.loadedZ = z;
      this.loadedMapId0 = -1;
      return;
    }
    const mapId = this.mkMapId(x, y);
    const ids = [mapId, (mapId + 1) & 0x3f, (mapId + 8) & 0x3f, (mapId + 9) & 0x3f];
    for (let i = 0; i < 4; i += 1) {
      const src = ids[i] * 0x180;
      const dst = i * 0x180;
      this.map.copy(this.window, dst, src, src + 0x180);
    }
    this.loadedZ = 0;
    this.loadedMapId0 = mapId;
  }

  chunkIndexAt(x: number, y: number, z: number): number {
    this.loadWindow(x, y, z);
    x &= 0x3ff;
    y &= 0x3ff;
    let si = 0;
    if (z !== 0) {
      si = ((x >> 3) & 0x1f) + ((y << 2) & 0x3e0);
      si += si >> 1;
    } else {
      const mapId = this.mkMapId(x, y);
      let bp02 = 0;
      if ((mapId - this.loadedMapId0) & 1) bp02 = 0x100;
      if ((mapId - this.loadedMapId0) & 8) bp02 += 0x200;
      si = ((x >> 3) & 0x0f) + bp02;
      si += (y << 1) & 0x0f0;
      si += si >> 1;
    }
    if (si < 0 || si + 1 >= this.window.length) {
      return 0;
    }
    const v = parseU16LE(this.window, si);
    return (x & 8) ? (v >> 4) : (v & 0x0fff);
  }

  tileAt(x: number, y: number, z: number): number {
    const ci = this.chunkIndexAt(x, y, z);
    const co = ci * 0x40;
    if (co < 0 || co + 0x40 > this.chunks.length) {
      return 0;
    }
    return this.chunks[co + ((y & 7) * 8) + (x & 7)] & 0xff;
  }
}

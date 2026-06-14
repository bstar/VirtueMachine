import type { RgbPaletteRuntime } from "../assets/palette_runtime.ts";
import type { CanvasFactoryRuntime } from "./indexed_pixels_runtime.ts";

export type LegacyTileTransparencyRuntime = (
  mask: number,
  tileId: number,
  paletteIndex: number
) => boolean;

export class U6TileSetRuntime {
  tileIndex: DataView;
  maskType: Uint8Array;
  tiles: Uint8Array;
  cache: Map<string, HTMLCanvasElement>;
  pixelCache: Map<number, Uint8Array>;
  fxBandCache: Map<number, boolean>;
  canvasFactory: CanvasFactoryRuntime;
  isTransparent: LegacyTileTransparencyRuntime;

  constructor(
    tileIndexBytes: Uint8Array,
    maskTypeBytes: Uint8Array,
    mapTilesBytes: Uint8Array,
    objTilesBytes: Uint8Array,
    canvasFactory: CanvasFactoryRuntime,
    isTransparent: LegacyTileTransparencyRuntime
  ) {
    this.tileIndex = new DataView(tileIndexBytes.buffer, tileIndexBytes.byteOffset, tileIndexBytes.byteLength);
    this.maskType = maskTypeBytes.slice(0, 2048);
    this.tiles = new Uint8Array(mapTilesBytes.length + objTilesBytes.length);
    this.tiles.set(mapTilesBytes, 0);
    this.tiles.set(objTilesBytes, mapTilesBytes.length);
    this.cache = new Map();
    this.pixelCache = new Map();
    this.fxBandCache = new Map();
    this.canvasFactory = canvasFactory;
    this.isTransparent = isTransparent;
  }

  maskTypeFor(tileId: number): number {
    return tileId >= 0 && tileId < this.maskType.length ? this.maskType[tileId] : 0;
  }

  getTileOffset(tileId: number): number {
    if (tileId < 0 || tileId >= (this.tileIndex.byteLength / 2)) {
      return -1;
    }
    return this.tileIndex.getUint16(tileId * 2, true) * 16;
  }

  decodePixelBlockTile(_tileId: number, srcOff: number): Uint8Array {
    const out = new Uint8Array(256);
    out.fill(0xff);

    let ptr = srcOff + 1;
    let dataPtr = 0;
    let guard = 0;
    while (guard < 4096 && ptr + 2 < this.tiles.length) {
      guard += 1;
      const disp = this.tiles[ptr + 0] | (this.tiles[ptr + 1] << 8);
      const x = (disp % 160) + (disp >= 1760 ? 160 : 0);
      const len = this.tiles[ptr + 2];
      if (len === 0) {
        break;
      }
      dataPtr += x;
      for (let i = 0; i < len && (ptr + 3 + i) < this.tiles.length; i += 1) {
        const d = dataPtr + i;
        if (d >= 0 && d < 256) {
          out[d] = this.tiles[ptr + 3 + i];
        }
      }
      dataPtr += len;
      ptr += 3 + len;
    }
    return out;
  }

  decodeTilePixels(tileId: number): Uint8Array {
    const cached = this.pixelCache.get(tileId);
    if (cached) {
      return cached;
    }
    const out = new Uint8Array(256);
    const off = this.getTileOffset(tileId);
    if (off < 0 || off >= this.tiles.length) {
      this.pixelCache.set(tileId, out);
      return out;
    }

    const mask = this.maskTypeFor(tileId);
    if (mask === 10) {
      const decoded = this.decodePixelBlockTile(tileId, off);
      this.pixelCache.set(tileId, decoded);
      return decoded;
    }

    const max = Math.min(256, this.tiles.length - off);
    out.set(this.tiles.slice(off, off + max), 0);
    this.pixelCache.set(tileId, out);
    return out;
  }

  buildTileCanvas(tileId: number, palette: RgbPaletteRuntime): HTMLCanvasElement | null {
    const tilePixels = this.decodeTilePixels(tileId);
    const mask = this.maskTypeFor(tileId);
    const c = this.canvasFactory.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const g = c.getContext("2d");
    if (!g) {
      return null;
    }
    const img = g.createImageData(16, 16);

    for (let i = 0; i < 256; i += 1) {
      const palIdx = tilePixels[i];
      const rgb = palette[palIdx] ?? [0, 0, 0];
      const a = this.isTransparent(mask, tileId, palIdx) ? 0 : 255;
      const p = i * 4;
      img.data[p + 0] = rgb[0];
      img.data[p + 1] = rgb[1];
      img.data[p + 2] = rgb[2];
      img.data[p + 3] = a;
    }

    g.putImageData(img, 0, 0);
    return c;
  }

  tileCanvas(tileId: number, palette: RgbPaletteRuntime, paletteKey = "static"): HTMLCanvasElement | null {
    const key = `${paletteKey}:${tileId}`;
    if (!this.cache.has(key)) {
      const canvas = this.buildTileCanvas(tileId, palette);
      if (canvas) {
        this.cache.set(key, canvas);
      }
    }
    return this.cache.get(key) ?? null;
  }

  tileUsesLegacyPaletteFx(tileId: number): boolean {
    const cached = this.fxBandCache.get(tileId);
    if (cached !== undefined) {
      return cached;
    }
    const mask = this.maskTypeFor(tileId);
    const zeroIsTransparent = tileId <= 0x1ff;
    const px = this.decodeTilePixels(tileId);
    let uses = false;
    for (let i = 0; i < px.length; i += 1) {
      const palIdx = px[i];
      if (mask === 10 || mask === 5) {
        if (palIdx === 0xff || (zeroIsTransparent && palIdx === 0x00)) {
          continue;
        }
      }
      if ((palIdx >= 0xe0 && palIdx <= 0xef) || (palIdx >= 0xf0 && palIdx <= 0xfb)) {
        uses = true;
        break;
      }
    }
    this.fxBandCache.set(tileId, uses);
    return uses;
  }
}

import type {
  RgbPaletteColorRuntime,
  RgbPaletteRuntime
} from "../assets/palette_runtime.ts";

export type IndexedPixmapRuntime = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

export type CanvasFactoryRuntime = {
  createElement(tagName: "canvas"): HTMLCanvasElement;
};

export const TERRAIN_PALETTE_BASE_RUNTIME = Object.freeze([
  0x2c, 0x40, 0x58, 0x74,
  0x88, 0x9c, 0xac, 0xbc,
  0xc8, 0xd4, 0xe0, 0xe8,
  0xf0, 0xf4, 0xf8, 0xfc
]);

export function fallbackTileColorRuntime(t: number): RgbPaletteColorRuntime {
  const r = (t * 53) & 0xff;
  const g = (t * 97) & 0xff;
  const b = (t * 31) & 0xff;
  return [r, g, b];
}

export function tilePaletteIndexRuntime(
  tileId: number,
  terrainType: Uint8Array | null | undefined
): number {
  if (!terrainType || tileId < 0 || tileId >= terrainType.length) {
    return tileId & 0xff;
  }
  const terrain = terrainType[tileId];
  const cls = terrain & 0x0f;
  const weight = (terrain >> 4) & 0x0f;
  const base = TERRAIN_PALETTE_BASE_RUNTIME[cls] ?? (tileId & 0xff);
  return (base + (tileId & 0x03) + (weight >> 2)) & 0xff;
}

export function buildBaseTileTableRuntime(bytes: Uint8Array): Uint16Array {
  const out = new Uint16Array(1024);
  const n = Math.min(1024, Math.floor(bytes.length / 2));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < n; i += 1) {
    out[i] = dv.getUint16(i * 2, true);
  }
  return out;
}

export function canvasFromIndexedPixelsRuntime(
  pixmap: IndexedPixmapRuntime | null | undefined,
  palette: RgbPaletteRuntime | null | undefined,
  canvasFactory: CanvasFactoryRuntime,
  transparentIndex: number | null = null
): HTMLCanvasElement | null {
  if (!pixmap || !palette) {
    return null;
  }
  const c = canvasFactory.createElement("canvas");
  c.width = pixmap.width | 0;
  c.height = pixmap.height | 0;
  const g = c.getContext("2d");
  if (!g) {
    return null;
  }
  const img = g.createImageData(c.width, c.height);
  for (let i = 0, p = 0; i < pixmap.pixels.length; i += 1, p += 4) {
    const index = pixmap.pixels[i] & 0xff;
    if (transparentIndex !== null && index === (transparentIndex & 0xff)) {
      img.data[p + 0] = 0;
      img.data[p + 1] = 0;
      img.data[p + 2] = 0;
      img.data[p + 3] = 0;
      continue;
    }
    const rgb = palette[index] ?? [0, 0, 0];
    img.data[p + 0] = rgb[0] | 0;
    img.data[p + 1] = rgb[1] | 0;
    img.data[p + 2] = rgb[2] | 0;
    img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

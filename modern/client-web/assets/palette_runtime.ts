export type RgbPaletteColorRuntime = [number, number, number];
export type RgbPaletteRuntime = RgbPaletteColorRuntime[];

export const STARTUP_MENU_PAL_RUNTIME: readonly RgbPaletteColorRuntime[] = Object.freeze([
  [232, 96, 0],
  [236, 128, 0],
  [244, 164, 0],
  [248, 200, 0],
  [252, 252, 84],
  [248, 200, 0],
  [244, 164, 0],
  [236, 128, 0],
  [232, 96, 0]
]);

export const STARTUP_MENU_PAL_IDX_RUNTIME = Object.freeze([14, 33, 34, 35, 36]);

export function cloneRgbPaletteRuntime(palette: RgbPaletteRuntime): RgbPaletteRuntime {
  return palette.map((rgb) => [rgb[0] | 0, rgb[1] | 0, rgb[2] | 0]);
}

export function buildLegacyPaletteFrameRuntime(
  basePalette: RgbPaletteRuntime | null | undefined,
  counter: number
): RgbPaletteRuntime | null {
  if (!basePalette) {
    return null;
  }
  const pal = cloneRgbPaletteRuntime(basePalette);
  const c = counter & 0xff;

  for (let i = 0; i < 8; i += 1) {
    const dstA = ((c - i) & 7) + 0xe0;
    const srcA = 0xe7 - i;
    pal[dstA] = basePalette[srcA];

    const dstB = ((c - i) & 7) + 0xe8;
    const srcB = 0xef - i;
    pal[dstB] = basePalette[srcB];
  }

  const h = (c >> 1) & 0xff;
  for (let i = 0; i < 4; i += 1) {
    const slot = (h - i) & 3;
    pal[slot + 0xf0] = basePalette[0xf3 - i];
    pal[slot + 0xf4] = basePalette[0xf7 - i];
    pal[slot + 0xf8] = basePalette[0xfb - i];
  }
  return pal;
}

export function buildPaletteFromU6PalRuntime(bytes: Uint8Array): RgbPaletteRuntime {
  const colors: RgbPaletteRuntime = new Array(256);
  for (let i = 0; i < 256; i += 1) {
    const off = i * 3;
    if (off + 2 >= bytes.length) {
      colors[i] = [0, 0, 0];
      continue;
    }
    const r = Math.min(255, bytes[off + 0] * 4);
    const g = Math.min(255, bytes[off + 1] * 4);
    const b = Math.min(255, bytes[off + 2] * 4);
    colors[i] = [r, g, b];
  }
  return colors;
}

export function buildStartupPaletteForMenuRuntime(
  basePalette: RgbPaletteRuntime | null | undefined,
  startupMenuIndex: number
): RgbPaletteRuntime | null {
  if (!basePalette || basePalette.length < 256) {
    return null;
  }
  const palette = cloneRgbPaletteRuntime(basePalette);
  const idx = startupMenuIndex | 0;
  for (let i = 0; i < 5; i += 1) {
    const src = STARTUP_MENU_PAL_RUNTIME[(4 + i - idx)] || STARTUP_MENU_PAL_RUNTIME[4];
    const di = STARTUP_MENU_PAL_IDX_RUNTIME[i] | 0;
    palette[di] = [src[0] | 0, src[1] | 0, src[2] | 0];
  }
  return palette;
}

export function buildPackedIntroPalettesRuntime(bytes: Uint8Array): RgbPaletteRuntime[] {
  const stride = 0x240;
  const count = Math.floor((bytes?.length || 0) / stride);
  const out: RgbPaletteRuntime[] = new Array(count);
  for (let idx = 0; idx < count; idx += 1) {
    const palette: RgbPaletteRuntime = new Array(256);
    const srcOff = idx * stride;
    for (let i = 0; i < 256; i += 1) {
      const rgb: RgbPaletteColorRuntime = [0, 0, 0];
      for (let j = 0; j < 3; j += 1) {
        const bitPos = (i * 3 * 6) + (j * 6);
        const bytePos = srcOff + (bitPos >> 3);
        const shift = bitPos & 7;
        const lo = bytes[bytePos] ?? 0;
        const hi = bytes[bytePos + 1] ?? 0;
        const color = ((lo | (hi << 8)) >> shift) & 0x3f;
        rgb[j] = Math.min(255, color << 2);
      }
      palette[i] = rgb;
    }
    out[idx] = palette;
  }
  return out;
}

export function rotatePaletteRangeInPlaceRuntime(
  palette: RgbPaletteRuntime | null | undefined,
  pos: number,
  length: number,
  count: number
): void {
  const start = Number(pos) | 0;
  const len = Math.max(0, Number(length) | 0);
  const steps = len > 0 ? ((Number(count) | 0) % len + len) % len : 0;
  if (!palette || len <= 1 || steps <= 0) {
    return;
  }
  for (let s = 0; s < steps; s += 1) {
    const last = palette[start + len - 1];
    for (let i = len - 1; i > 0; i -= 1) {
      palette[start + i] = palette[start + i - 1];
    }
    palette[start] = last;
  }
}

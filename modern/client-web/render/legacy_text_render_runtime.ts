export type LegacyGlyphSpanRuntime = {
  advance: number;
  left: number;
  right: number;
};

export type LegacyTextCanvasRuntime = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
};

export function drawU6MainTextRuntime(
  g: LegacyTextCanvasRuntime,
  fontBytes: ArrayLike<number> | null | undefined,
  text: unknown,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  if (!fontBytes) {
    g.fillStyle = color;
    g.font = `${Math.max(8, 8 * scale)}px monospace`;
    g.fillText(String(text || ""), sx, sy + (7 * scale));
    return;
  }
  const msg = String(text || "");
  g.fillStyle = color;
  for (let i = 0; i < msg.length; i += 1) {
    const code = msg.charCodeAt(i) & 0xff;
    const off = code * 8;
    for (let row = 0; row < 8; row += 1) {
      const bits = fontBytes[off + row] ?? 0;
      for (let col = 0; col < 8; col += 1) {
        if (bits & (0x80 >> col)) {
          g.fillRect(
            sx + ((i * 8 + col) * scale),
            sy + (row * scale),
            scale,
            scale
          );
        }
      }
    }
  }
}

export function u6GlyphSpanRuntime(
  fontBytes: ArrayLike<number> | null | undefined,
  code: number
): LegacyGlyphSpanRuntime {
  if (!fontBytes) {
    return { left: 0, right: 7, advance: 8 };
  }
  const ch = Number(code) & 0xff;
  if (ch === 32) {
    return { left: 0, right: 2, advance: 3 };
  }
  const off = ch * 8;
  let left = 8;
  let right = -1;
  for (let row = 0; row < 8; row += 1) {
    const bits = fontBytes[off + row] ?? 0;
    for (let col = 0; col < 8; col += 1) {
      if (bits & (0x80 >> col)) {
        if (col < left) left = col;
        if (col > right) right = col;
      }
    }
  }
  if (right < left) {
    return { left: 0, right: 2, advance: 3 };
  }
  return {
    left,
    right,
    advance: Math.max(1, right - left + 1)
  };
}

export function measureU6TextWidthRuntime(
  fontBytes: ArrayLike<number> | null | undefined,
  text: unknown,
  compact = false
): number {
  const msg = String(text || "");
  if (!compact || !fontBytes) {
    return msg.length * 8;
  }
  let width = 0;
  for (let i = 0; i < msg.length; i += 1) {
    width += u6GlyphSpanRuntime(fontBytes, msg.charCodeAt(i)).advance;
  }
  return width;
}

export function drawU6CompactTextRuntime(
  g: LegacyTextCanvasRuntime,
  fontBytes: ArrayLike<number> | null | undefined,
  text: unknown,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  if (!fontBytes) {
    drawU6MainTextRuntime(g, fontBytes, text, sx, sy, scale, color);
    return;
  }
  const msg = String(text || "");
  g.fillStyle = color;
  let cursor = 0;
  for (let i = 0; i < msg.length; i += 1) {
    const code = msg.charCodeAt(i) & 0xff;
    const off = code * 8;
    const glyph = u6GlyphSpanRuntime(fontBytes, code);
    for (let row = 0; row < 8; row += 1) {
      const bits = fontBytes[off + row] ?? 0;
      for (let col = glyph.left; col <= glyph.right; col += 1) {
        if (bits & (0x80 >> col)) {
          g.fillRect(
            sx + ((cursor + (col - glyph.left)) * scale),
            sy + (row * scale),
            scale,
            scale
          );
        }
      }
    }
    cursor += glyph.advance;
  }
}

export function drawLegacyContinueArrowRuntime(
  g: LegacyTextCanvasRuntime,
  fontBytes: ArrayLike<number> | null | undefined,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  drawU6MainTextRuntime(g, fontBytes, String.fromCharCode(1), sx, sy, Math.max(1, scale | 0), color);
}

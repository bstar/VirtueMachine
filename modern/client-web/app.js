const TICK_MS = 100;
const TILE_SIZE = 64;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;
const TICKS_PER_MINUTE = 4;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 13;
const REPLAY_CHECKPOINT_INTERVAL = 32;
const TERRAIN_PALETTE_BASE = [
  0x2c, 0x40, 0x58, 0x74,
  0x88, 0x9c, 0xac, 0xbc,
  0xc8, 0xd4, 0xe0, 0xe8,
  0xf0, 0xf4, 0xf8, 0xfc
];
const LEGACY_CORNER_TABLE = [
  0, 0, 1, 10,
  0, 0, 2, 2,
  1, 5, 1, 1,
  11, 0, 2, 2
];
const OBJ_COORD_USE_MASK = 0x18;
const OBJ_COORD_USE_LOCXYZ = 0x00;
const ENTITY_TYPE_ACTOR_MIN = 0x153;
const ENTITY_TYPE_ACTOR_MAX = 0x1af;
const OBJECT_TYPES_FLOOR_DECOR = new Set([0x12e, 0x12f, 0x130]);
const OBJECT_TYPES_DOOR = new Set([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
const OBJECT_TYPES_TOP_DECOR = new Set([0x05f, 0x060, 0x080, 0x081, 0x084, 0x07a, 0x0d1, 0x0ea]);
const OBJECT_TYPES_RENDER = new Set([
  0x062, /* open chest */
  0x07a, /* candle */
  0x05f, /* grapes */
  0x060, /* butter */
  0x080, /* loaf of bread */
  0x081, /* portion of meat */
  0x084, /* cheese */
  0x0a2, /* stove */
  0x0a3, /* bed */
  0x0a4, /* fireplace */
  0x0b0, /* chest of drawers */
  0x0b1, /* desk */
  0x0ba, /* open barrel */
  0x0c6, /* cutting table */
  0x0ce, /* throne-room decor variant */
  0x0d5, /* throne-room decor variant */
  0x0d8, /* bookshelf */
  0x0d9, /* anvil */
  0x0d1, /* meat rib type */
  0x0dc, /* throne-room trim */
  0x0dd, /* throne-room trim */
  0x0de, /* throne-room trim */
  0x0e4, /* table square corner */
  0x0e6, /* table round corner */
  0x0ea, /* fountain */
  0x0ed, /* table middle */
  0x0ec, /* fire field */
  0x0ef, /* table round corner alt */
  0x0fa, /* table square corner alt */
  0x10f, /* doorsill */
  0x110, /* throne-room wall segment */
  0x111, /* throne-room wall segment */
  0x114, /* throne-room trim segment */
  0x117, /* table */
  0x129, /* oaken door */
  0x12a, /* windowed door */
  0x12b, /* cedar door */
  0x12c, /* steel door */
  0x12d, /* doorway */
  0x12e, /* throne-room stair carpet edge */
  0x12f, /* throne-room carpet/dais */
  0x130, /* throne-room carpet/dais */
  0x137, /* stone table */
  0x147, /* throne */
  0x120, /* water wheel */
  0x125, /* spinning wheel */
  0x0fc, /* chair */
  0x14e /* secret door */
]);

const HASH_OFFSET = 1469598103934665603n;
const HASH_PRIME = 1099511628211n;
const HASH_MASK = (1n << 64n) - 1n;

const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

const statTick = document.getElementById("statTick");
const statPos = document.getElementById("statPos");
const statClock = document.getElementById("statClock");
const statDate = document.getElementById("statDate");
const statTile = document.getElementById("statTile");
const statObjects = document.getElementById("statObjects");
const statEntities = document.getElementById("statEntities");
const statRenderParity = document.getElementById("statRenderParity");
const statNpcOcclusionBlocks = document.getElementById("statNpcOcclusionBlocks");
const statQueued = document.getElementById("statQueued");
const statSource = document.getElementById("statSource");
const statHash = document.getElementById("statHash");
const statReplay = document.getElementById("statReplay");
const statPalettePhase = document.getElementById("statPalettePhase");
const statCenterTiles = document.getElementById("statCenterTiles");
const statCenterBand = document.getElementById("statCenterBand");
const topTimeOfDay = document.getElementById("topTimeOfDay");
const diagBox = document.getElementById("diagBox");
const replayDownload = document.getElementById("replayDownload");
const themeSelect = document.getElementById("themeSelect");
const layoutSelect = document.getElementById("layoutSelect");
const fontSelect = document.getElementById("fontSelect");
const gridToggle = document.getElementById("gridToggle");
const debugOverlayToggle = document.getElementById("debugOverlayToggle");
const animationToggle = document.getElementById("animationToggle");
const paletteFxToggle = document.getElementById("paletteFxToggle");
const locationSelect = document.getElementById("locationSelect");
const jumpButton = document.getElementById("jumpButton");
const captureButton = document.getElementById("captureButton");

const THEME_KEY = "vm_theme";
const LAYOUT_KEY = "vm_layout";
const FONT_KEY = "vm_font";
const GRID_KEY = "vm_grid";
const DEBUG_OVERLAY_KEY = "vm_overlay_debug";
const ANIMATION_KEY = "vm_animation";
const PALETTE_FX_KEY = "vm_palette_fx";
const THEMES = [
  "obsidian",
  "phosphor",
  "amber",
  "cga-cyan",
  "cga-magenta",
  "parchment",
  "cobalt",
  "bloodstone",
  "moonstone",
  "ash"
];
const LAYOUTS = [
  "classic-right",
  "classic-left",
  "ledger-split",
  "ledger-compact",
  "ledger-focus"
];
const FONTS = ["blockblueprint", "kaijuz", "orangekid", "silkscreen"];
const CAPTURE_PRESETS = [
  { id: "avatar_start", label: "Avatar Start (307,352,0)", x: 307, y: 352, z: 0 },
  { id: "lb_throne", label: "Lord British Throne (307,347,0)", x: 307, y: 347, z: 0 },
  { id: "wood_corner_a", label: "Wood Corner A (355,411,0)", x: 355, y: 411, z: 0 },
  { id: "wood_corner_b", label: "Wood Corner B (356,411,0)", x: 356, y: 411, z: 0 },
  { id: "britain_core", label: "Britain Core (337,365,0)", x: 337, y: 365, z: 0 },
  { id: "farmland", label: "Farmland Props (292,431,0)", x: 292, y: 431, z: 0 },
  { id: "anim_fire", label: "Animation Test Fire (360,397,0)", x: 360, y: 397, z: 0 },
  { id: "anim_wheels", label: "Animation Test Wheels (307,384,0)", x: 307, y: 384, z: 0 }
];
const INITIAL_WORLD = Object.freeze({
  is_on_quest: 0,
  next_sleep: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 1,
  wind_dir: 0,
  active: 0,
  map_x: 0x133,
  map_y: 0x160,
  map_z: 0,
  in_combat: 0,
  sound_enabled: 1
});

const INITIAL_SEED = 0x12345678;

const state = {
  sim: createInitialSimState(),
  queue: [],
  commandLog: [],
  mapCtx: null,
  tileSet: null,
  objectLayer: null,
  entityLayer: null,
  animData: null,
  animationFrozen: false,
  frozenAnimationTick: null,
  objectOverlayCount: 0,
  entityOverlayCount: 0,
  renderParityMismatches: 0,
  interactionProbeTile: null,
  npcOcclusionBlockedMoves: 0,
  showGrid: false,
  showOverlayDebug: false,
  enablePaletteFx: true,
  palette: null,
  basePalette: null,
  tileFlags: null,
  terrainType: null,
  paletteFrameTick: -1,
  paletteFrame: null,
  centerRawTile: 0,
  centerAnimatedTile: 0,
  centerPaletteBand: "none",
  lastTs: performance.now(),
  accMs: 0,
  replayUrl: null
};

class U6AnimDataJS {
  constructor(entries) {
    this.entries = entries;
    this.state = new Uint8Array(entries.length);
    this.state.fill(1);
    this.byBase = new Map();
    for (let i = 0; i < entries.length; i += 1) {
      this.byBase.set(entries[i].baseTile, i);
    }
  }

  setByBaseTile(tileId, mode) {
    const i = this.byBase.get(tileId);
    if (i === undefined) {
      return;
    }
    this.state[i] = mode & 0x03;
  }

  hasBaseTile(tileId) {
    return this.byBase.has(tileId);
  }

  animatedTile(tileId, counter) {
    const i = this.byBase.get(tileId);
    if (i === undefined) {
      return tileId;
    }
    const e = this.entries[i];
    let frame = e.startFrame;
    if (this.state[i] === 1) {
      frame += ((counter & e.mask) >>> e.shift);
    } else if (this.state[i] === 2) {
      frame += (((~counter) & e.mask) >>> e.shift);
    }
    return frame & 0xffff;
  }

  static fromBytes(bytes) {
    if (!bytes || bytes.length < 2) {
      return null;
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const maxAnim = 32;
    let count = dv.getUint16(0, true);
    if (count > maxAnim) {
      count = maxAnim;
    }
    if (bytes.length < (2 + (maxAnim * 2) + (maxAnim * 2) + maxAnim + maxAnim)) {
      return null;
    }
    const entries = [];
    const offBase = 2;
    const offStart = offBase + (maxAnim * 2);
    const offMask = offStart + (maxAnim * 2);
    const offShift = offMask + maxAnim;
    for (let i = 0; i < count; i += 1) {
      entries.push({
        baseTile: dv.getUint16(offBase + (i * 2), true),
        startFrame: dv.getUint16(offStart + (i * 2), true),
        mask: bytes[offMask + i],
        shift: bytes[offShift + i] & 0x07
      });
    }
    return new U6AnimDataJS(entries);
  }
}

function animationTick() {
  if (state.animationFrozen) {
    if (state.frozenAnimationTick === null) {
      state.frozenAnimationTick = state.sim.tick >>> 0;
    }
    return state.frozenAnimationTick;
  }
  return state.sim.tick >>> 0;
}

function resolveAnimatedTileAtTick(tileId, counter) {
  if (!state.animData || !state.animData.hasBaseTile(tileId)) {
    return tileId;
  }
  return state.animData.animatedTile(tileId, counter);
}

function resolveAnimatedTile(tileId) {
  return resolveAnimatedTileAtTick(tileId, animationTick());
}

function resolveAnimatedObjectTileAtTick(obj, counter) {
  if (!obj) {
    return 0;
  }
  if (state.animData && state.animData.hasBaseTile(obj.baseTile)) {
    const animBase = state.animData.animatedTile(obj.baseTile, counter);
    return (animBase + (obj.frame | 0)) & 0xffff;
  }
  return resolveAnimatedTileAtTick(obj.tileId, counter);
}

function resolveAnimatedObjectTile(obj) {
  return resolveAnimatedObjectTileAtTick(obj, animationTick());
}

function buildLegacyPaletteFrame(basePalette, counter) {
  if (!basePalette) {
    return null;
  }
  const pal = basePalette.slice();
  const c = counter & 0xff;

  // Legacy VGA palette cycling from seg_0903 PaletteAnimation():
  // 0xE0..0xE7 <- rotating 0xE0..0xE7 (source window anchored at 0xE7)
  // 0xE8..0xEF <- rotating 0xE8..0xEF (source window anchored at 0xEF)
  for (let i = 0; i < 8; i += 1) {
    const dstA = ((c - i) & 7) + 0xe0;
    const srcA = 0xe7 - i;
    pal[dstA] = basePalette[srcA];

    const dstB = ((c - i) & 7) + 0xe8;
    const srcB = 0xef - i;
    pal[dstB] = basePalette[srcB];
  }

  // 0xF0..0xFB in 3x4 groups, cycled at half speed.
  const h = (c >> 1) & 0xff;
  for (let i = 0; i < 4; i += 1) {
    const slot = (h - i) & 3;
    pal[slot + 0xf0] = basePalette[0xf3 - i];
    pal[slot + 0xf4] = basePalette[0xf7 - i];
    pal[slot + 0xf8] = basePalette[0xfb - i];
  }
  return pal;
}

function renderPaletteTick() {
  return animationTick();
}

function legacyPalettePhase() {
  /* Legacy VGA cycling repeats every 8 steps for the animated bands. */
  return renderPaletteTick() & 0x07;
}

function getRenderPalette() {
  if (!state.basePalette) {
    return null;
  }
  if (!state.enablePaletteFx) {
    return state.basePalette;
  }
  const phase = legacyPalettePhase();
  if (state.paletteFrame && state.paletteFrameTick === phase) {
    return state.paletteFrame;
  }
  state.paletteFrame = buildLegacyPaletteFrame(state.basePalette, phase);
  state.paletteFrameTick = phase;
  return state.paletteFrame;
}

function getRenderPaletteKey() {
  if (!state.enablePaletteFx) {
    return "pal-static";
  }
  return `palfx-${legacyPalettePhase()}`;
}

class U6MapJS {
  constructor(mapBytes, chunkBytes) {
    this.map = mapBytes;
    this.chunks = chunkBytes;
    this.window = new Uint8Array(0x600);
    this.loadedZ = -1;
    this.loadedMapId0 = -1;
  }

  mkMapId(x, y) {
    return (x >> 7) + ((y >> 4) & 0x38);
  }

  readU16LE(buf, off) {
    return buf[off] | (buf[off + 1] << 8);
  }

  loadWindow(x, y, z) {
    x &= 0x3ff;
    y &= 0x3ff;

    if (z !== 0) {
      const off = ((z + z + z) << 9) + 0x5a00;
      this.window.set(this.map.slice(off, off + 0x600), 0);
      this.loadedZ = z;
      this.loadedMapId0 = -1;
      return;
    }

    const mapId = this.mkMapId(x, y);
    const ids = [mapId, (mapId + 1) & 0x3f, (mapId + 8) & 0x3f, (mapId + 9) & 0x3f];
    for (let i = 0; i < 4; i += 1) {
      const src = ids[i] * 0x180;
      const dst = i * 0x180;
      this.window.set(this.map.slice(src, src + 0x180), dst);
    }
    this.loadedZ = 0;
    this.loadedMapId0 = mapId;
  }

  chunkIndexAt(x, y, z) {
    this.loadWindow(x, y, z);
    x &= 0x3ff;
    y &= 0x3ff;

    let si;
    if (z !== 0) {
      si = ((x >> 3) & 0x1f) + ((y << 2) & 0x3e0);
      si += si >> 1;
    } else {
      const mapId = this.mkMapId(x, y);
      let bp02 = 0;
      if ((mapId - this.loadedMapId0) & 1) bp02 = 0x100;
      if ((mapId - this.loadedMapId0) & 8) bp02 += 0x200;
      si = ((x >> 3) & 0xf) + bp02;
      si += (y << 1) & 0xf0;
      si += si >> 1;
    }

    const v = this.readU16LE(this.window, si);
    return (x & 8) ? (v >> 4) : (v & 0x0fff);
  }

  tileAt(x, y, z) {
    const ci = this.chunkIndexAt(x, y, z);
    const co = ci * 0x40;
    if (co + 0x40 > this.chunks.length) return 0;
    return this.chunks[co + ((y & 7) * 8) + (x & 7)];
  }
}

class U6TileSetJS {
  constructor(tileIndexBytes, maskTypeBytes, mapTilesBytes, objTilesBytes) {
    this.tileIndex = new DataView(tileIndexBytes.buffer, tileIndexBytes.byteOffset, tileIndexBytes.byteLength);
    this.maskType = maskTypeBytes.slice(0, 2048);
    this.tiles = new Uint8Array(mapTilesBytes.length + objTilesBytes.length);
    this.tiles.set(mapTilesBytes, 0);
    this.tiles.set(objTilesBytes, mapTilesBytes.length);
    this.cache = new Map();
    this.pixelCache = new Map();
    this.fxBandCache = new Map();
  }

  maskTypeFor(tileId) {
    return tileId >= 0 && tileId < this.maskType.length ? this.maskType[tileId] : 0;
  }

  getTileOffset(tileId) {
    if (tileId < 0 || tileId >= (this.tileIndex.byteLength / 2)) {
      return -1;
    }
    return this.tileIndex.getUint16(tileId * 2, true) * 16;
  }

  decodePixelBlockTile(tileId, srcOff) {
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

  decodeTilePixels(tileId) {
    if (this.pixelCache.has(tileId)) {
      return this.pixelCache.get(tileId);
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

  buildTileCanvas(tileId, palette) {
    const tilePixels = this.decodeTilePixels(tileId);
    const mask = this.maskTypeFor(tileId);
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const g = c.getContext("2d");
    const img = g.createImageData(16, 16);

    for (let i = 0; i < 256; i += 1) {
      const palIdx = tilePixels[i];
      const rgb = palette[palIdx] ?? [0, 0, 0];
      let a = 255;
      const zeroIsTransparent = tileId <= 0x1ff;
      if (mask === 10) {
        a = (palIdx === 0xff || (zeroIsTransparent && palIdx === 0x00)) ? 0 : 255;
      } else if (mask === 5) {
        a = (palIdx === 0xff || (zeroIsTransparent && palIdx === 0x00)) ? 0 : 255;
      }
      const p = i * 4;
      img.data[p + 0] = rgb[0];
      img.data[p + 1] = rgb[1];
      img.data[p + 2] = rgb[2];
      img.data[p + 3] = a;
    }

    g.putImageData(img, 0, 0);
    return c;
  }

  tileCanvas(tileId, palette, paletteKey = "static") {
    const key = `${paletteKey}:${tileId}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, this.buildTileCanvas(tileId, palette));
    }
    return this.cache.get(key);
  }

  tileUsesLegacyPaletteFx(tileId) {
    if (this.fxBandCache.has(tileId)) {
      return this.fxBandCache.get(tileId);
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

class U6ObjectLayerJS {
  constructor(baseTiles) {
    this.baseTiles = baseTiles;
    this.byCoord = new Map();
    this.totalLoaded = 0;
    this.filesLoaded = 0;
  }

  decodeCoord(raw0, raw1, raw2) {
    const x = raw0 | ((raw1 & 0x03) << 8);
    const y = (raw1 >> 2) | ((raw2 & 0x0f) << 6);
    const z = (raw2 >> 4) & 0x0f;
    return { x, y, z };
  }

  coordKey(x, y, z) {
    return `${x & 0x3ff},${y & 0x3ff},${z & 0x0f}`;
  }

  drawPriority(type) {
    if (OBJECT_TYPES_FLOOR_DECOR.has(type)) {
      return -1;
    }
    if (OBJECT_TYPES_TOP_DECOR.has(type)) {
      return 2;
    }
    if (OBJECT_TYPES_DOOR.has(type)) {
      return 1;
    }
    return 0;
  }

  parseObjBlk(bytes) {
    if (!bytes || bytes.length < 2) {
      return [];
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let count = dv.getUint16(0, true);
    const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
    if (count > maxCount) {
      count = maxCount;
    }

    const entries = [];
    for (let i = 0; i < count; i += 1) {
      const off = 2 + (i * 8);
      const status = bytes[off + 0];
      if ((status & OBJ_COORD_USE_MASK) !== OBJ_COORD_USE_LOCXYZ) {
        continue;
      }

      const { x, y, z } = this.decodeCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
      const shapeType = dv.getUint16(off + 4, true);
      const type = shapeType & 0x3ff;

      const frame = shapeType >>> 10;
      const base = this.baseTiles[type] ?? 0;
      const tileId = (base + frame) & 0xffff;
      entries.push({
        x,
        y,
        z,
        type,
        baseTile: base,
        frame,
        tileId,
        order: i,
        drawPri: this.drawPriority(type),
        renderable: OBJECT_TYPES_RENDER.has(type)
      });
    }
    return entries;
  }

  addEntries(entries) {
    for (const e of entries) {
      const key = this.coordKey(e.x, e.y, e.z);
      if (!this.byCoord.has(key)) {
        this.byCoord.set(key, []);
      }
      this.byCoord.get(key).push(e);
      this.totalLoaded += 1;
    }
  }

  async loadOutdoor(fetcher) {
    this.byCoord.clear();
    this.totalLoaded = 0;
    this.filesLoaded = 0;

    for (let ay = 0; ay < 8; ay += 1) {
      for (let ax = 0; ax < 8; ax += 1) {
        const name = `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
        const res = await fetcher(name);
        if (!res || !res.ok) {
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        this.addEntries(this.parseObjBlk(buf));
        this.filesLoaded += 1;
      }
    }
    for (const list of this.byCoord.values()) {
      list.sort((a, b) => {
        if (a.drawPri !== b.drawPri) {
          return a.drawPri - b.drawPri;
        }
        return a.order - b.order;
      });
    }
  }

  objectsAt(x, y, z) {
    return this.byCoord.get(this.coordKey(x, y, z)) ?? [];
  }
}

class U6EntityLayerJS {
  constructor(baseTiles) {
    this.baseTiles = baseTiles;
    this.entries = [];
    this.totalLoaded = 0;
  }

  isRenderableEntityType(type) {
    return type >= ENTITY_TYPE_ACTOR_MIN && type <= ENTITY_TYPE_ACTOR_MAX;
  }

  parseObjList(bytes) {
    if (!bytes || bytes.length < 0x0900) {
      return [];
    }
    const objStatusOff = 0x0000;
    const objPosOff = 0x0100;
    const objShapeOff = 0x0400;
    const npcStatusOff = 0x0800;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = [];
    for (let id = 0; id < 0x100; id += 1) {
      const status = bytes[objStatusOff + id];
      const npcStatus = bytes[npcStatusOff + id];
      if ((status & OBJ_COORD_USE_MASK) !== OBJ_COORD_USE_LOCXYZ) {
        continue;
      }
      const shapeType = dv.getUint16(objShapeOff + (id * 2), true);
      if (shapeType === 0) {
        continue;
      }
      const type = shapeType & 0x03ff;
      if (!this.isRenderableEntityType(type)) {
        continue;
      }
      const frame = shapeType >>> 10;
      const pos = objPosOff + (id * 3);
      const x = bytes[pos + 0] | ((bytes[pos + 1] & 0x03) << 8);
      const y = (bytes[pos + 1] >> 2) | ((bytes[pos + 2] & 0x0f) << 6);
      const z = (bytes[pos + 2] >> 4) & 0x0f;
      const baseTile = this.baseTiles[type] ?? 0;
      if (baseTile === 0) {
        continue;
      }
      out.push({
        id,
        x,
        y,
        z,
        status,
        npcStatus,
        type,
        frame,
        baseTile,
        tileId: (baseTile + frame) & 0xffff,
        order: id
      });
    }
    out.sort((a, b) => a.order - b.order);
    return out;
  }

  load(bytes) {
    this.entries = this.parseObjList(bytes);
    for (const e of this.entries) {
      e.homeX = e.x;
      e.homeY = e.y;
      e.patrolPhase = e.id & 0x03;
      e.patrolRadius = 2;
      e.movable = (
        (e.type >= 0x178 && e.type <= 0x183)
        || e.type === 0x187
        || e.type === 0x188
      );
    }
    this.totalLoaded = this.entries.length;
  }

  entitiesInView(startX, startY, z, w, h) {
    const endX = startX + w;
    const endY = startY + h;
    const out = [];
    for (const e of this.entries) {
      if (e.z !== z) {
        continue;
      }
      if (e.x < startX || e.x >= endX || e.y < startY || e.y >= endY) {
        continue;
      }
      out.push(e);
    }
    out.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.order - b.order;
    });
    return out;
  }

  tileBlocks(x, y, z, mapCtx, tileFlags, terrainType, objectLayer) {
    if (!mapCtx) {
      return false;
    }
    const t = mapCtx.tileAt(x, y, z);
    if (tileFlags && ((tileFlags[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (terrainType && ((terrainType[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (objectLayer && tileFlags) {
      const overlays = objectLayer.objectsAt(x, y, z);
      for (const o of overlays) {
        const tf = tileFlags[o.tileId & 0x7ff] ?? 0;
        if (tf & 0x04) {
          return true;
        }
      }
    }
    return false;
  }

  step(tick, mapCtx, tileFlags, terrainType, objectLayer, visibleAtWorld) {
    if ((tick % 8) !== 0) {
      return 0;
    }
    const dirs = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1]
    ];
    const occupied = new Set();
    for (const e of this.entries) {
      occupied.add(`${e.x & 0x3ff},${e.y & 0x3ff},${e.z & 0x0f}`);
    }

    let blockedByOcclusion = 0;
    const phase = (tick >> 3) & 0xff;
    for (const e of this.entries) {
      if (!e.movable || e.z !== 0) {
        continue;
      }
      const baseDir = (phase + e.patrolPhase) & 0x03;
      const candidateDir = [
        baseDir,
        (baseDir + 1) & 0x03,
        (baseDir + 3) & 0x03,
        (baseDir + 2) & 0x03
      ];
      let moved = false;
      for (const d of candidateDir) {
        const nx = (e.x + dirs[d][0]) & 0x3ff;
        const ny = (e.y + dirs[d][1]) & 0x3ff;
        const dz = e.z & 0x0f;
        if (Math.abs(nx - e.homeX) + Math.abs(ny - e.homeY) > e.patrolRadius) {
          continue;
        }
        const k = `${nx},${ny},${dz}`;
        if (occupied.has(k)) {
          continue;
        }
        if (visibleAtWorld && !visibleAtWorld(nx, ny)) {
          blockedByOcclusion += 1;
          continue;
        }
        if (this.tileBlocks(nx, ny, dz, mapCtx, tileFlags, terrainType, objectLayer)) {
          continue;
        }
        occupied.delete(`${e.x & 0x3ff},${e.y & 0x3ff},${dz}`);
        e.x = nx;
        e.y = ny;
        occupied.add(k);
        moved = true;
        break;
      }
      if (!moved) {
        continue;
      }
    }
    return blockedByOcclusion;
  }
}

function decompressU6Lzw(bytes) {
  if (!bytes || bytes.length < 4) {
    return bytes;
  }
  const target = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
  if (target <= 0) {
    return bytes;
  }
  const src = bytes.slice(4);
  const out = new Uint8Array(target);
  let outPos = 0;
  let bitPos = 0;
  let codeSize = 9;
  let nextCode = 258;
  const CLEAR = 256;
  const END = 257;
  const table = new Array(4096);
  for (let i = 0; i < 256; i += 1) {
    table[i] = new Uint8Array([i]);
  }
  let prev = null;

  function readCode(n) {
    let outOff = 0;
    for (let i = 0; i < n; i += 1) {
      const bi = (bitPos + i) >> 3;
      const bt = (bitPos + i) & 7;
      if (bi >= src.length) {
        return -1;
      }
      outOff |= ((src[bi] >> bt) & 1) << i;
    }
    bitPos += n;
    return outOff;
  }

  while (outPos < out.length) {
    const code = readCode(codeSize);
    if (code < 0) {
      break;
    }
    if (code === CLEAR) {
      for (let i = 258; i < table.length; i += 1) {
        table[i] = undefined;
      }
      codeSize = 9;
      nextCode = 258;
      prev = null;
      continue;
    }
    if (code === END) {
      break;
    }

    let entry;
    if (table[code]) {
      entry = table[code];
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
      const n = new Uint8Array(prev.length + 1);
      n.set(prev, 0);
      n[prev.length] = entry[0];
      table[nextCode] = n;
      nextCode += 1;
      if ((nextCode === 512 || nextCode === 1024 || nextCode === 2048) && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }

  return out;
}

function createInitialSimState() {
  return {
    tick: 0,
    rngState: INITIAL_SEED >>> 0,
    worldFlags: 0,
    commandsApplied: 0,
    world: { ...INITIAL_WORLD }
  };
}

function setTheme(themeName) {
  const theme = THEMES.includes(themeName) ? themeName : "obsidian";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeSelect) {
    themeSelect.value = theme;
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initTheme() {
  let saved = "obsidian";
  try {
    const fromStorage = localStorage.getItem(THEME_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setTheme(saved);
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      setTheme(themeSelect.value);
    });
  }
}

function setLayout(layoutName) {
  const layout = LAYOUTS.includes(layoutName) ? layoutName : "classic-right";
  document.documentElement.setAttribute("data-layout", layout);
  if (layoutSelect) {
    layoutSelect.value = layout;
  }
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initLayout() {
  let saved = "classic-right";
  try {
    const fromStorage = localStorage.getItem(LAYOUT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLayout(saved);
  if (layoutSelect) {
    layoutSelect.addEventListener("change", () => {
      setLayout(layoutSelect.value);
    });
  }
}

function setFont(fontName) {
  const font = FONTS.includes(fontName) ? fontName : "silkscreen";
  document.documentElement.setAttribute("data-font", font);
  if (fontSelect) {
    fontSelect.value = font;
  }
  try {
    localStorage.setItem(FONT_KEY, font);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initFont() {
  let saved = "silkscreen";
  try {
    const fromStorage = localStorage.getItem(FONT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  if (saved === "blockblueprint") {
    saved = "silkscreen";
  }
  setFont(saved);
  if (fontSelect) {
    fontSelect.addEventListener("change", () => {
      setFont(fontSelect.value);
    });
  }
}

function setGrid(enabled) {
  state.showGrid = !!enabled;
  if (gridToggle) {
    gridToggle.value = state.showGrid ? "on" : "off";
  }
  try {
    localStorage.setItem(GRID_KEY, state.showGrid ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initGrid() {
  let saved = "off";
  try {
    const fromStorage = localStorage.getItem(GRID_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setGrid(saved === "on");
  if (gridToggle) {
    gridToggle.addEventListener("change", () => {
      setGrid(gridToggle.value === "on");
    });
  }
}

function setOverlayDebug(enabled) {
  state.showOverlayDebug = !!enabled;
  if (debugOverlayToggle) {
    debugOverlayToggle.value = state.showOverlayDebug ? "on" : "off";
  }
  try {
    localStorage.setItem(DEBUG_OVERLAY_KEY, state.showOverlayDebug ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initOverlayDebug() {
  let saved = "off";
  try {
    const fromStorage = localStorage.getItem(DEBUG_OVERLAY_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setOverlayDebug(saved === "on");
  if (debugOverlayToggle) {
    debugOverlayToggle.addEventListener("change", () => {
      setOverlayDebug(debugOverlayToggle.value === "on");
    });
  }
}

function setAnimationMode(mode) {
  const nextMode = mode === "freeze" ? "freeze" : "live";
  state.animationFrozen = nextMode === "freeze";
  if (state.animationFrozen) {
    state.frozenAnimationTick = state.sim.tick >>> 0;
  } else {
    state.frozenAnimationTick = null;
  }
  if (animationToggle) {
    animationToggle.value = nextMode;
  }
  try {
    localStorage.setItem(ANIMATION_KEY, nextMode);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initAnimationMode() {
  let saved = "live";
  try {
    const fromStorage = localStorage.getItem(ANIMATION_KEY);
    if (fromStorage === "live" || fromStorage === "freeze") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setAnimationMode(saved);
  if (animationToggle) {
    animationToggle.addEventListener("change", () => {
      setAnimationMode(animationToggle.value);
    });
  }
}

function setPaletteFxMode(enabled) {
  state.enablePaletteFx = !!enabled;
  state.paletteFrameTick = -1;
  state.paletteFrame = null;
  if (paletteFxToggle) {
    paletteFxToggle.value = state.enablePaletteFx ? "on" : "off";
  }
  try {
    localStorage.setItem(PALETTE_FX_KEY, state.enablePaletteFx ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initPaletteFxMode() {
  let saved = "on";
  try {
    const fromStorage = localStorage.getItem(PALETTE_FX_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setPaletteFxMode(saved === "on");
  if (paletteFxToggle) {
    paletteFxToggle.addEventListener("change", () => {
      setPaletteFxMode(paletteFxToggle.value === "on");
    });
  }
}

function initCapturePresets() {
  if (!locationSelect) {
    return;
  }
  locationSelect.innerHTML = "";
  for (const p of CAPTURE_PRESETS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    locationSelect.appendChild(opt);
  }
}

function activeCapturePreset() {
  const id = locationSelect ? locationSelect.value : "";
  return CAPTURE_PRESETS.find((p) => p.id === id) ?? CAPTURE_PRESETS[0];
}

function jumpToPreset() {
  const p = activeCapturePreset();
  if (!p) {
    return;
  }
  state.queue.length = 0;
  state.sim.world.map_x = p.x | 0;
  state.sim.world.map_y = p.y | 0;
  state.sim.world.map_z = p.z | 0;
  diagBox.className = "diag ok";
  diagBox.textContent = `Moved camera focus to preset ${p.label}.`;
}

function captureViewportPng() {
  const p = activeCapturePreset();
  const tag = p ? p.id : "custom";
  const filename = `virtuemachine-${tag}-${state.sim.world.map_x}-${state.sim.world.map_y}-${state.sim.world.map_z}.png`;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  diagBox.className = "diag ok";
  diagBox.textContent = `Captured ${filename}`;
}

function cloneSimState(sim) {
  return {
    tick: sim.tick >>> 0,
    rngState: sim.rngState >>> 0,
    worldFlags: sim.worldFlags >>> 0,
    commandsApplied: sim.commandsApplied >>> 0,
    world: { ...sim.world }
  };
}

function xorshift32(x) {
  let v = x >>> 0;
  if (v === 0) {
    v = 0x6d2b79f5;
  }
  v ^= v << 13;
  v ^= v >>> 17;
  v ^= v << 5;
  return v >>> 0;
}

function clampI32(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value | 0;
}

function advanceWorldMinute(world) {
  world.time_m += 1;
  if (world.time_m < MINUTES_PER_HOUR) return;
  world.time_m = 0;
  world.time_h += 1;
  if (world.time_h < HOURS_PER_DAY) return;
  world.time_h = 0;
  world.date_d += 1;
  if (world.date_d <= DAYS_PER_MONTH) return;
  world.date_d = 1;
  world.date_m += 1;
  if (world.date_m <= MONTHS_PER_YEAR) return;
  world.date_m = 1;
  world.date_y += 1;
}

function applyCommand(sim, cmd) {
  if (cmd.type === 1) {
    sim.world.map_x = clampI32(sim.world.map_x + cmd.arg0, -4096, 4095);
    sim.world.map_y = clampI32(sim.world.map_y + cmd.arg1, -4096, 4095);
  }
  sim.commandsApplied += 1;
}

function stepSimTick(sim, queue) {
  const nextTick = (sim.tick + 1) >>> 0;
  const pending = [];

  for (const cmd of queue) {
    if (cmd.tick === nextTick) {
      applyCommand(sim, cmd);
      continue;
    }
    pending.push(cmd);
  }

  sim.rngState = xorshift32(sim.rngState);
  sim.worldFlags ^= sim.rngState & 1;
  if ((nextTick % TICKS_PER_MINUTE) === 0) {
    advanceWorldMinute(sim.world);
  }
  sim.tick = nextTick;

  return pending;
}

function hashMixU32(h, value) {
  const mixed = (h ^ BigInt(value >>> 0)) * HASH_PRIME;
  return mixed & HASH_MASK;
}

function asU32Signed(value) {
  return (value | 0) >>> 0;
}

function simStateHash(sim) {
  let h = HASH_OFFSET;
  h = hashMixU32(h, sim.tick);
  h = hashMixU32(h, sim.rngState);
  h = hashMixU32(h, sim.worldFlags);
  h = hashMixU32(h, sim.commandsApplied);
  h = hashMixU32(h, sim.world.is_on_quest);
  h = hashMixU32(h, sim.world.next_sleep);
  h = hashMixU32(h, sim.world.time_m);
  h = hashMixU32(h, sim.world.time_h);
  h = hashMixU32(h, sim.world.date_d);
  h = hashMixU32(h, sim.world.date_m);
  h = hashMixU32(h, sim.world.date_y);
  h = hashMixU32(h, asU32Signed(sim.world.wind_dir));
  h = hashMixU32(h, sim.world.active);
  h = hashMixU32(h, asU32Signed(sim.world.map_x));
  h = hashMixU32(h, asU32Signed(sim.world.map_y));
  h = hashMixU32(h, asU32Signed(sim.world.map_z));
  h = hashMixU32(h, sim.world.in_combat);
  h = hashMixU32(h, sim.world.sound_enabled);
  return h;
}

function hashHex(hashValue) {
  return hashValue.toString(16).padStart(16, "0");
}

function timeOfDayLabel(hour) {
  const h = hour | 0;
  if (h < 5) return "Midnight";
  if (h < 8) return "Dawn";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 20) return "Dusk";
  return "Night";
}

function packCommand(tick, type, arg0, arg1) {
  const b = new Uint8Array(COMMAND_WIRE_SIZE);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, tick, true);
  dv.setUint8(4, type);
  dv.setInt32(8, arg0, true);
  dv.setInt32(12, arg1, true);
  return b;
}

function unpackCommand(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    tick: dv.getUint32(0, true),
    type: dv.getUint8(4),
    arg0: dv.getInt32(8, true),
    arg1: dv.getInt32(12, true)
  };
}

function queueMove(dx, dy) {
  const bytes = packCommand(state.sim.tick + 1, 1, dx, dy);
  const cmd = unpackCommand(bytes);
  state.queue.push(cmd);
  state.commandLog.push({ ...cmd });
}

function buildPaletteFromU6Pal(bytes) {
  const colors = new Array(256);
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

function buildBaseTileTable(bytes) {
  const out = new Uint16Array(1024);
  const n = Math.min(1024, Math.floor(bytes.length / 2));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < n; i += 1) {
    out[i] = dv.getUint16(i * 2, true);
  }
  return out;
}

function fallbackTileColor(t) {
  const r = (t * 53) & 0xff;
  const g = (t * 97) & 0xff;
  const b = (t * 31) & 0xff;
  return [r, g, b];
}

function tilePaletteIndex(tileId) {
  if (!state.terrainType || tileId < 0 || tileId >= state.terrainType.length) {
    return tileId & 0xff;
  }
  const terrain = state.terrainType[tileId];
  const cls = terrain & 0x0f;
  const weight = (terrain >> 4) & 0x0f;
  const base = TERRAIN_PALETTE_BASE[cls] ?? (tileId & 0xff);
  return (base + (tileId & 0x03) + (weight >> 2)) & 0xff;
}

function terrainOf(tileId) {
  if (!state.terrainType || tileId < 0 || tileId >= state.terrainType.length) {
    return 0;
  }
  return state.terrainType[tileId];
}

function hasWallTerrain(tileId) {
  return (terrainOf(tileId) & 0x04) !== 0;
}

function buildLegacyViewContext(startX, startY, wz) {
  if (!state.mapCtx) {
    return null;
  }

  const PAD = 1;
  const W = VIEW_W + (PAD * 2);
  const H = VIEW_H + (PAD * 2);
  const C_X = PAD + (VIEW_W >> 1);
  const C_Y = PAD + (VIEW_H >> 1);
  const FLAG_BA = 0x04;
  const FLAG_WALL = 0x08;
  const FLAG_WIN = 0x10;
  const FLAG_OPA = 0x20;
  const FLAG_VISITED = 0x40;
  const FLAG_VISIBLE = 0x80;

  const baseTiles = Array.from({ length: H }, () => new Uint16Array(W));
  const flags = Array.from({ length: H }, () => new Uint8Array(W));
  const open = Array.from({ length: H }, () => new Uint8Array(W));

  const tileFlagsFor = (tileId) => {
    if (!state.tileFlags) {
      return 0;
    }
    return state.tileFlags[tileId & 0x7ff] ?? 0;
  };
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const markFlag = (x, y, bit) => {
    if (inBounds(x, y)) {
      flags[y][x] |= bit;
    }
  };
  const isTileOpa = (tileId) => (tileFlagsFor(tileId) & 0x04) !== 0;
  const isTileWin = (tileId) => (tileFlagsFor(tileId) & 0x08) !== 0;
  const isTileFor = (tileId) => (tileFlagsFor(tileId) & 0x10) !== 0;
  const isTileDoubleV = (tileId) => (tileFlagsFor(tileId) & 0x40) !== 0;
  const isTileDoubleH = (tileId) => (tileFlagsFor(tileId) & 0x80) !== 0;

  const applyObjFlags = (gx, gy, tileId) => {
    if (!inBounds(gx, gy)) {
      return;
    }
    if (isTileWin(tileId)) {
      markFlag(gx, gy, FLAG_WIN);
    } else if (isTileOpa(tileId)) {
      markFlag(gx, gy, FLAG_OPA);
    } else {
      const isBa = false;
      if (isBa) {
        markFlag(gx, gy, FLAG_BA);
      }
    }
    if (isTileOpa(tileId - 1)) {
      if (isTileDoubleV(tileId)) {
        markFlag(gx, gy - 1, FLAG_OPA);
      }
      if (isTileDoubleH(tileId)) {
        markFlag(gx - 1, gy, FLAG_OPA);
      }
    }
    if (hasWallTerrain(tileId)) {
      markFlag(gx, gy, FLAG_WALL);
      if (isTileDoubleV(tileId)) {
        markFlag(gx, gy - 1, FLAG_WALL);
      }
      if (isTileDoubleH(tileId)) {
        markFlag(gx - 1, gy, FLAG_WALL);
      }
    }
  };

  for (let gy = 0; gy < H; gy += 1) {
    for (let gx = 0; gx < W; gx += 1) {
      const wx = startX + gx - PAD;
      const wy = startY + gy - PAD;
      baseTiles[gy][gx] = state.mapCtx.tileAt(wx, wy, wz);
    }
  }

  if (state.objectLayer) {
    for (let gy = 0; gy < H; gy += 1) {
      for (let gx = 0; gx < W; gx += 1) {
        const wx = startX + gx - PAD;
        const wy = startY + gy - PAD;
        const overlays = state.objectLayer.objectsAt(wx, wy, wz);
        for (const o of overlays) {
          const tileId = resolveAnimatedObjectTile(o);
          applyObjFlags(gx, gy, tileId);
        }
      }
    }
  }

  const isVisibleAt = (gx, gy) => {
    if (!inBounds(gx, gy)) {
      return false;
    }
    const tile = baseTiles[gy][gx];
    const f = flags[gy][gx];
    if (f & FLAG_OPA) {
      return false;
    }
    if (isTileWin(tile) || (f & FLAG_WIN)) {
      return (
        (gx === C_X && Math.abs(gy - C_Y) < 2)
        || (gy === C_Y && Math.abs(gx - C_X) < 2)
      );
    }
    if (!(f & FLAG_BA) && isTileOpa(tile)) {
      return false;
    }
    return true;
  };

  const q = [];
  const pushVisit = (gx, gy) => {
    if (!inBounds(gx, gy)) {
      return;
    }
    if (flags[gy][gx] & FLAG_VISITED) {
      return;
    }
    flags[gy][gx] |= FLAG_VISITED;
    q.push([gx, gy]);
  };

  if (isVisibleAt(C_X, C_Y)) {
    pushVisit(C_X, C_Y);
  } else {
    if (isVisibleAt(C_X + 1, C_Y)) pushVisit(C_X + 1, C_Y);
    if (isVisibleAt(C_X, C_Y + 1)) pushVisit(C_X, C_Y + 1);
  }

  const stepX = [0, 1, 0, 0, -1, -1, 0, 0];
  const stepY = [-1, 0, 1, 1, 0, 0, -1, -1];

  while (q.length) {
    const [gx, gy] = q.shift();
    flags[gy][gx] |= FLAG_VISIBLE;
    if (!isVisibleAt(gx, gy)) {
      continue;
    }
    open[gy][gx] = 1;
    /* Match legacy C_1100_0131 neighbor walk: cumulative step sequence
       that traces N, NE, E, SE, S, SW, W, NW around the current cell. */
    let nx = gx;
    let ny = gy;
    for (let i = 0; i < stepX.length; i += 1) {
      nx += stepX[i];
      ny += stepY[i];
      pushVisit(nx, ny);
    }
  }

  const visibleAtWorld = (wx, wy) => {
    const gx = wx - startX + PAD;
    const gy = wy - startY + PAD;
    if (!inBounds(gx, gy)) {
      return true;
    }
    return (flags[gy][gx] & FLAG_VISIBLE) !== 0;
  };
  const wallAtWorld = (wx, wy) => {
    const gx = wx - startX + PAD;
    const gy = wy - startY + PAD;
    if (!inBounds(gx, gy)) {
      return false;
    }
    return (flags[gy][gx] & FLAG_WALL) !== 0;
  };
  const openAtWorld = (wx, wy) => {
    const gx = wx - startX + PAD;
    const gy = wy - startY + PAD;
    if (!inBounds(gx, gy)) {
      return false;
    }
    return open[gy][gx] !== 0;
  };

  return { visibleAtWorld, wallAtWorld, openAtWorld };
}

function applyLegacyCornerVariant(tileId, wx, wy, wz, viewCtx) {
  /* Heuristic guard: in the web prototype we don't have full AreaFlags/object
     occlusion state from legacy `seg_1100`; remapping mid/high wall families
     (notably 0xC0+) can incorrectly turn wood walls into stone variants. */
  if (tileId >= 0x0c0 && tileId < 0x100) {
    return tileId;
  }

  const t = terrainOf(tileId);
  const terrainLow = t & 0x0f;
  if (terrainLow !== (0x04 | 0x02)) {
    return tileId;
  }

  let base = tileId & 0x0f0;
  if (base < 0x090) {
    base = 0x090;
  }

  const north = state.mapCtx.tileAt(wx, wy - 1, wz);
  const east = state.mapCtx.tileAt(wx + 1, wy, wz);
  const south = state.mapCtx.tileAt(wx, wy + 1, wz);
  const west = state.mapCtx.tileAt(wx - 1, wy, wz);

  /* Use view-context visibility bits like legacy AreaFlags[...]&0x80. */
  let bp0c = 0;
  if (!viewCtx || viewCtx.visibleAtWorld(wx, wy - 1)) bp0c |= 8;
  if (!viewCtx || viewCtx.visibleAtWorld(wx + 1, wy)) bp0c |= 4;
  if (!viewCtx || viewCtx.visibleAtWorld(wx, wy + 1)) bp0c |= 2;
  if (!viewCtx || viewCtx.visibleAtWorld(wx - 1, wy)) bp0c |= 1;

  if (bp0c === 0x0f || bp0c === 0x00) {
    return tileId;
  }

  let imped = (t >> 4) & 0x0f;
  if (imped & 4) {
    const nt = terrainOf(north);
    const nl = nt & 0x0f;
    if (!(nl & 0x04) || !(nt & 0x20)) {
      if (!viewCtx || !viewCtx.wallAtWorld(wx, wy - 1)) {
        imped &= ~8;
      }
    }
  }
  if (imped & 2) {
    const wt = terrainOf(west);
    const wl = wt & 0x0f;
    if (!(wl & 0x04) || !(wt & 0x40)) {
      if (!viewCtx || !viewCtx.wallAtWorld(wx - 1, wy)) {
        imped &= ~1;
      }
    }
  }

  if (imped === (4 | 2 | 1) || imped === (8 | 2 | 1) || imped > (8 | 4) || imped === bp0c) {
    imped &= bp0c;
    if (imped === (2 | 1) || imped === (8 | 4)) {
      return 0x100 + (base >> 3) - (0x090 >> 3) + LEGACY_CORNER_TABLE[imped];
    }
    return base + LEGACY_CORNER_TABLE[imped];
  }

  return tileId;
}

function shouldBlackoutTile(rawTile, wx, wy, viewCtx) {
  if (!viewCtx) {
    return false;
  }
  if (viewCtx.openAtWorld(wx, wy)) {
    return false;
  }
  const terrainLow = terrainOf(rawTile) & 0x0f;
  if (terrainLow === (0x04 | 0x02) && viewCtx.visibleAtWorld(wx, wy)) {
    return false;
  }
  return true;
}

function tileColor(t, palette) {
  if (!palette) {
    const [r, g, b] = fallbackTileColor(t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const idx = tilePaletteIndex(t);
  const c = palette[idx] ?? [0, 0, 0];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function paletteForTile(tileId) {
  if (!state.basePalette) {
    return null;
  }
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return state.basePalette;
  }
  return getRenderPalette();
}

function paletteKeyForTile(tileId) {
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return "pal-static";
  }
  return getRenderPaletteKey();
}

function overlayTileIsFloor(tileId) {
  if (!state.tileFlags) {
    return false;
  }
  return (state.tileFlags[tileId & 0x7ff] & 0x10) !== 0;
}

function overlayTileIsOccluder(tileId) {
  if (!state.tileFlags) {
    return false;
  }
  const tf = state.tileFlags[tileId & 0x7ff] ?? 0;
  if ((tf & 0x04) !== 0 || (tf & 0x08) !== 0) {
    return true;
  }
  return hasWallTerrain(tileId);
}

function buildOverlayCells(startX, startY, wz, viewCtx) {
  const overlayCells = (state.tileSet && state.objectLayer)
    ? Array.from({ length: VIEW_W * VIEW_H }, () => [])
    : null;
  const parity = {
    hiddenSuppressedCount: 0,
    spillOutOfBoundsCount: 0,
    unsortedSourceCount: 0
  };
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  const inView = (gx, gy) => gx >= 0 && gy >= 0 && gx < VIEW_W && gy < VIEW_H;
  const insertLegacyCellTile = (gx, gy, tileId, bp06, source, debugLabel = "") => {
    if (!overlayCells) {
      return;
    }
    if (!inView(gx, gy)) {
      parity.spillOutOfBoundsCount += 1;
      return;
    }
    const wx = startX + gx;
    const wy = startY + gy;
    if (viewCtx && !viewCtx.visibleAtWorld(wx, wy)) {
      parity.hiddenSuppressedCount += 1;
      return;
    }
    const list = overlayCells[cellIndex(gx, gy)];
    const entry = {
      tileId: tileId & 0xffff,
      floor: overlayTileIsFloor(tileId),
      occluder: overlayTileIsOccluder(tileId),
      sourceX: source.x,
      sourceY: source.y,
      sourceType: source.type,
      sourceObjType: source.objType,
      dbg: debugLabel
    };
    if (entry.floor || bp06 === 2) {
      if (bp06 & 1) {
        list.push(entry);
        return;
      }
      const idx = list.findIndex((e) => !e.floor);
      if (idx === -1) {
        list.push(entry);
      } else {
        list.splice(idx, 0, entry);
      }
      return;
    }
    list.unshift(entry);
  };

  let overlayCount = 0;
  if (!overlayCells) {
    return { overlayCells: null, parity, overlayCount };
  }

  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      const overlays = state.objectLayer.objectsAt(wx, wy, wz);
      let prevDrawPri = Number.NEGATIVE_INFINITY;
      let prevOrder = Number.NEGATIVE_INFINITY;
      for (const o of overlays) {
        if (!o.renderable) {
          continue;
        }
        if (o.drawPri < prevDrawPri || (o.drawPri === prevDrawPri && o.order < prevOrder)) {
          parity.unsortedSourceCount += 1;
        }
        prevDrawPri = o.drawPri;
        prevOrder = o.order;

        const animObjTile = resolveAnimatedObjectTile(o);
        const dbgMain = `0x${animObjTile.toString(16)}`;
        insertLegacyCellTile(gx, gy, animObjTile, 0, { x: wx, y: wy, type: "main", objType: o.type }, dbgMain);

        const tf = state.tileFlags ? (state.tileFlags[animObjTile & 0x7ff] ?? 0) : 0;
        if (tf & 0x80) {
          insertLegacyCellTile(gx - 1, gy, animObjTile - 1, 1, { x: wx, y: wy, type: "spill-left", objType: o.type }, `0x${(animObjTile - 1).toString(16)}`);
          if (tf & 0x40) {
            insertLegacyCellTile(gx, gy - 1, animObjTile - 2, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(animObjTile - 2).toString(16)}`);
            insertLegacyCellTile(gx - 1, gy - 1, animObjTile - 3, 1, { x: wx, y: wy, type: "spill-up-left", objType: o.type }, `0x${(animObjTile - 3).toString(16)}`);
          }
        } else if (tf & 0x40) {
          insertLegacyCellTile(gx, gy - 1, animObjTile - 1, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(animObjTile - 1).toString(16)}`);
        }
        overlayCount += 1;
      }
    }
  }
  return { overlayCells, parity, overlayCount };
}

function topInteractiveOverlayAt(overlayCells, startX, startY, wx, wy) {
  if (!overlayCells) {
    return null;
  }
  const gx = wx - startX;
  const gy = wy - startY;
  if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
    return null;
  }
  const list = overlayCells[(gy * VIEW_W) + gx];
  if (!list || list.length === 0) {
    return null;
  }
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const e = list[i];
    if (e.sourceX === wx && e.sourceY === wy && e.sourceType === "main") {
      return e;
    }
  }
  return null;
}

function measureActorOcclusionParity(overlayCells, startX, startY, viewCtx, entities) {
  if (!overlayCells || !entities || entities.length === 0) {
    return 0;
  }
  let mismatches = 0;
  for (const e of entities) {
    if (viewCtx && !viewCtx.visibleAtWorld(e.x, e.y)) {
      continue;
    }
    const gx = e.x - startX;
    const gy = e.y - startY;
    if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
      continue;
    }
    const list = overlayCells[(gy * VIEW_W) + gx];
    if (!list || list.length === 0) {
      continue;
    }
    const hasOccluder = list.some((entry) => entry.occluder);
    const cellOpen = !viewCtx || viewCtx.openAtWorld(e.x, e.y);
    if (cellOpen && hasOccluder) {
      mismatches += 1;
    }
  }
  return mismatches;
}

function drawTileGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0f13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = state.sim.world.map_x - (VIEW_W >> 1);
  const startY = state.sim.world.map_y - (VIEW_H >> 1);
  const renderPalette = getRenderPalette();
  const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
  const overlayBuild = buildOverlayCells(startX, startY, state.sim.world.map_z, viewCtx);
  const overlayCells = overlayBuild.overlayCells;
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  const drawOverlayEntry = (entry, px, py) => {
    const op = paletteForTile(entry.tileId);
    const ok = paletteKeyForTile(entry.tileId);
    const oc = state.tileSet.tileCanvas(entry.tileId, op, ok);
    ctx.drawImage(oc, px, py, TILE_SIZE, TILE_SIZE);
    if (state.showOverlayDebug && entry.dbg) {
      ctx.fillStyle = "rgba(7, 12, 16, 0.72)";
      ctx.fillRect(px + 3, py + 3, 48, 14);
      ctx.fillStyle = "#f5f5f5";
      ctx.font = "10px monospace";
      ctx.fillText(entry.dbg, px + 5, py + 13);
    }
  };
  const drawEntityTile = (tileId, gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
      return;
    }
    const wx = startX + gx;
    const wy = startY + gy;
    if (viewCtx && !viewCtx.visibleAtWorld(wx, wy)) {
      return;
    }
    const px = gx * TILE_SIZE;
    const py = gy * TILE_SIZE;
    const ep = paletteForTile(tileId);
    const ek = paletteKeyForTile(tileId);
    const ec = state.tileSet.tileCanvas(tileId, ep, ek);
    ctx.drawImage(ec, px, py, TILE_SIZE, TILE_SIZE);
  };

  let centerTile = 0;
  let centerRawTile = 0;
  let centerAnimatedTile = 0;
  let centerPaletteBand = "none";
  const overlayCount = overlayBuild.overlayCount;
  let entityCount = 0;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      let t = 0;
      let rawTile = 0;
      if (state.mapCtx) {
        rawTile = state.mapCtx.tileAt(wx, wy, state.sim.world.map_z);
        t = rawTile;
        if (shouldBlackoutTile(rawTile, wx, wy, viewCtx)) {
          t = 0x0ff;
          rawTile = 0x0ff;
        } else {
          t = applyLegacyCornerVariant(t, wx, wy, state.sim.world.map_z, viewCtx);
        }
      } else {
        t = (wx * 7 + wy * 13) & 0xff;
        rawTile = t;
      }
      if (gx === (VIEW_W >> 1) && gy === (VIEW_H >> 1)) {
        centerTile = t;
        centerRawTile = rawTile;
      }
      const px = gx * TILE_SIZE;
      const py = gy * TILE_SIZE;
      if (state.tileSet) {
        const animRawTile = resolveAnimatedTile(rawTile);
        const animTile = resolveAnimatedTile(t);
        if (gx === (VIEW_W >> 1) && gy === (VIEW_H >> 1)) {
          centerAnimatedTile = animTile;
          const idx = tilePaletteIndex(animTile);
          if (idx >= 0xe0 && idx <= 0xef) {
            centerPaletteBand = "E0-EF";
          } else if (idx >= 0xf0 && idx <= 0xfb) {
            centerPaletteBand = "F0-FB";
          } else {
            centerPaletteBand = "static";
          }
        }
        const basePal = state.basePalette;
        const baseKey = "pal-static";
        const baseTileCanvas = state.tileSet.tileCanvas(animRawTile, basePal, baseKey);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(baseTileCanvas, px, py, TILE_SIZE, TILE_SIZE);
        const topPal = state.basePalette;
        const topKey = "pal-static";
        const tc = state.tileSet.tileCanvas(animTile, topPal, topKey);
        ctx.drawImage(tc, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = tileColor(t, renderPalette);
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
      if (state.showGrid) {
        ctx.strokeStyle = "rgba(15, 20, 24, 0.55)";
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  if (overlayCells && state.tileSet) {
    for (let gy = 0; gy < VIEW_H; gy += 1) {
      for (let gx = 0; gx < VIEW_W; gx += 1) {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        if (viewCtx && !viewCtx.visibleAtWorld(startX + gx, startY + gy)) {
          continue;
        }
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (!t.occluder) {
            drawOverlayEntry(t, px, py);
          }
        }
      }
    }
  }
  if (state.tileSet && state.entityLayer) {
    const entities = state.entityLayer.entitiesInView(startX, startY, state.sim.world.map_z, VIEW_W, VIEW_H);
    for (const e of entities) {
      if (viewCtx && !viewCtx.visibleAtWorld(e.x, e.y)) {
        continue;
      }
      const gx = e.x - startX;
      const gy = e.y - startY;
      if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
        continue;
      }
      const animEntityTile = resolveAnimatedObjectTile(e);
      drawEntityTile(animEntityTile, gx, gy);
      const tf = state.tileFlags ? (state.tileFlags[animEntityTile & 0x7ff] ?? 0) : 0;
      if (tf & 0x80) {
        drawEntityTile(animEntityTile - 1, gx - 1, gy);
        if (tf & 0x40) {
          drawEntityTile(animEntityTile - 2, gx, gy - 1);
          drawEntityTile(animEntityTile - 3, gx - 1, gy - 1);
        }
      } else if (tf & 0x40) {
        drawEntityTile(animEntityTile - 1, gx, gy - 1);
      }
      entityCount += 1;
    }
    const interactionProbe = topInteractiveOverlayAt(
      overlayCells,
      startX,
      startY,
      state.sim.world.map_x,
      state.sim.world.map_y
    );
    state.interactionProbeTile = interactionProbe ? interactionProbe.tileId : null;
    const actorOcclusionMismatch = measureActorOcclusionParity(overlayCells, startX, startY, viewCtx, entities);
    state.renderParityMismatches = overlayBuild.parity.unsortedSourceCount
      + actorOcclusionMismatch;
  } else {
    state.interactionProbeTile = null;
    state.renderParityMismatches = overlayBuild.parity.unsortedSourceCount;
  }
  if (overlayCells && state.tileSet) {
    for (let gy = 0; gy < VIEW_H; gy += 1) {
      for (let gx = 0; gx < VIEW_W; gx += 1) {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        if (viewCtx && !viewCtx.visibleAtWorld(startX + gx, startY + gy)) {
          continue;
        }
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (t.occluder) {
            drawOverlayEntry(t, px, py);
          }
        }
      }
    }
  }
  state.objectOverlayCount = overlayCount;
  state.entityOverlayCount = entityCount;
  state.centerRawTile = centerRawTile;
  state.centerAnimatedTile = centerAnimatedTile || centerTile;
  state.centerPaletteBand = centerPaletteBand;

  const cx = (VIEW_W >> 1) * TILE_SIZE;
  const cy = (VIEW_H >> 1) * TILE_SIZE;
  ctx.strokeStyle = "#f1f3f5";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + 2, cy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  statTile.textContent = `0x${centerTile.toString(16).padStart(2, "0")}`;
}

function updateStats() {
  const w = state.sim.world;
  statTick.textContent = String(state.sim.tick);
  statPos.textContent = `${w.map_x}, ${w.map_y}, ${w.map_z}`;
  const hh = String(w.time_h).padStart(2, "0");
  const mm = String(w.time_m).padStart(2, "0");
  statClock.textContent = `${hh}:${mm}`;
  statDate.textContent = `${w.date_d} / ${w.date_m} / ${w.date_y}`;
  if (topTimeOfDay) {
    topTimeOfDay.textContent = `${timeOfDayLabel(w.time_h)} (${hh}:${mm})`;
  }
  statQueued.textContent = String(state.queue.length);
  if (state.objectLayer) {
    statObjects.textContent = `${state.objectOverlayCount} / ${state.objectLayer.totalLoaded}`;
  } else {
    statObjects.textContent = "0 / 0";
  }
  if (statEntities) {
    if (state.entityLayer) {
      statEntities.textContent = `${state.entityOverlayCount} / ${state.entityLayer.totalLoaded}`;
    } else {
      statEntities.textContent = "0 / 0";
    }
  }
  if (statRenderParity) {
    if (state.renderParityMismatches > 0) {
      statRenderParity.textContent = `warn (${state.renderParityMismatches})`;
    } else if (state.interactionProbeTile != null) {
      statRenderParity.textContent = `ok (probe 0x${state.interactionProbeTile.toString(16)})`;
    } else {
      statRenderParity.textContent = "ok";
    }
  }
  if (statNpcOcclusionBlocks) {
    statNpcOcclusionBlocks.textContent = String(state.npcOcclusionBlockedMoves);
  }
  statHash.textContent = hashHex(simStateHash(state.sim));
  if (statPalettePhase) {
    statPalettePhase.textContent = state.enablePaletteFx ? String(renderPaletteTick() & 0xff) : "off";
  }
  if (statCenterTiles) {
    statCenterTiles.textContent = `0x${state.centerRawTile.toString(16)} -> 0x${state.centerAnimatedTile.toString(16)}`;
  }
  if (statCenterBand) {
    statCenterBand.textContent = state.centerPaletteBand;
  }
}

function releaseReplayUrl() {
  if (state.replayUrl) {
    URL.revokeObjectURL(state.replayUrl);
    state.replayUrl = null;
  }
}

function setReplayCsv(csvText) {
  releaseReplayUrl();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  state.replayUrl = URL.createObjectURL(blob);
  replayDownload.href = state.replayUrl;
  replayDownload.download = "virtuemachine-replay-checkpoints.csv";
  replayDownload.classList.remove("disabled");
}

function replayCheckpointsCsv(checkpoints) {
  const lines = ["tick,hash"];
  for (const cp of checkpoints) {
    lines.push(`${cp.tick},${cp.hash}`);
  }
  return `${lines.join("\n")}\n`;
}

function runReplayCheckpoints(commands, totalTicks, interval) {
  const sim = createInitialSimState();
  const queue = commands.map((cmd) => ({ ...cmd }));
  const checkpoints = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = stepSimTick(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    if ((sim.tick % interval) === 0 || sim.tick === totalTicks) {
      checkpoints.push({
        tick: sim.tick,
        hash: hashHex(simStateHash(sim))
      });
    }
  }

  return checkpoints;
}

function animationViewportHash(sim) {
  if (!state.mapCtx) {
    return null;
  }
  const wz = sim.world.map_z;
  const startX = sim.world.map_x - (VIEW_W >> 1);
  const startY = sim.world.map_y - (VIEW_H >> 1);
  const tick = sim.tick >>> 0;
  const samples = [
    [VIEW_W >> 1, VIEW_H >> 1],
    [0, 0],
    [VIEW_W - 1, 0],
    [0, VIEW_H - 1],
    [VIEW_W - 1, VIEW_H - 1]
  ];
  let h = HASH_OFFSET;
  h = hashMixU32(h, tick);

  for (const [gx, gy] of samples) {
    const wx = startX + gx;
    const wy = startY + gy;
    const rawTile = state.mapCtx.tileAt(wx, wy, wz);
    const animTile = resolveAnimatedTileAtTick(rawTile, tick);
    h = hashMixU32(h, asU32Signed(wx));
    h = hashMixU32(h, asU32Signed(wy));
    h = hashMixU32(h, animTile);
    if (state.objectLayer) {
      const overlays = state.objectLayer.objectsAt(wx, wy, wz);
      h = hashMixU32(h, overlays.length);
      for (const o of overlays) {
        const animObjTile = resolveAnimatedObjectTileAtTick(o, tick);
        h = hashMixU32(h, animObjTile);
      }
    }
  }
  return hashHex(h);
}

function runAnimationCheckpoints(commands, totalTicks, interval) {
  if (!state.mapCtx) {
    return [];
  }
  const sim = createInitialSimState();
  const queue = commands.map((cmd) => ({ ...cmd }));
  const checkpoints = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = stepSimTick(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    if ((sim.tick % interval) === 0 || sim.tick === totalTicks) {
      checkpoints.push({
        tick: sim.tick,
        hash: animationViewportHash(sim)
      });
    }
  }

  return checkpoints;
}

function verifyReplayStability() {
  const maxCommandTick = state.commandLog.reduce((maxTick, cmd) => Math.max(maxTick, cmd.tick), 0);
  const totalTicks = Math.max(state.sim.tick, maxCommandTick, 1);
  const a = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const b = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const aa = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const ab = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);

  const sameLength = a.length === b.length;
  const allMatch = sameLength && a.every((cp, idx) => cp.tick === b[idx].tick && cp.hash === b[idx].hash);
  const animSameLength = aa.length === ab.length;
  const animAllMatch = animSameLength && aa.every((cp, idx) => cp.tick === ab[idx].tick && cp.hash === ab[idx].hash);

  if (allMatch && animAllMatch) {
    const csv = replayCheckpointsCsv(a);
    setReplayCsv(csv);
    statReplay.textContent = `stable (${a.length} checkpoints)`;
    diagBox.className = "diag ok";
    if (aa.length) {
      diagBox.textContent = `Replay + animation verified stable over ${totalTicks} ticks. Download checkpoints.csv for baseline tracking.`;
    } else {
      diagBox.textContent = `Replay verified stable over ${totalTicks} ticks. Download checkpoints.csv for baseline tracking.`;
    }
    return;
  }

  statReplay.textContent = "mismatch";
  diagBox.className = "diag warn";
  if (!allMatch) {
    diagBox.textContent = "Replay mismatch detected. Determinism drift likely in command/tick path.";
    return;
  }
  diagBox.textContent = "Animation mismatch detected. Animated tile phase is not deterministic.";
}

function resetRun() {
  state.sim = createInitialSimState();
  state.queue = [];
  state.commandLog = [];
  state.paletteFrameTick = -1;
  state.paletteFrame = null;
  state.centerRawTile = 0;
  state.centerAnimatedTile = 0;
  state.centerPaletteBand = "none";
  state.renderParityMismatches = 0;
  state.interactionProbeTile = null;
  state.npcOcclusionBlockedMoves = 0;
  if (state.animationFrozen) {
    state.frozenAnimationTick = state.sim.tick >>> 0;
  }
  statReplay.textContent = "not run";
  releaseReplayUrl();
  replayDownload.classList.add("disabled");
  replayDownload.removeAttribute("href");
}

function tickLoop(ts) {
  state.accMs += ts - state.lastTs;
  state.lastTs = ts;

  while (state.accMs >= TICK_MS) {
    state.accMs -= TICK_MS;
    state.queue = stepSimTick(state.sim, state.queue);
    if (state.entityLayer) {
      const startX = state.sim.world.map_x - (VIEW_W >> 1);
      const startY = state.sim.world.map_y - (VIEW_H >> 1);
      const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
      const blocked = state.entityLayer.step(
        state.sim.tick,
        state.mapCtx,
        state.tileFlags,
        state.terrainType,
        state.objectLayer,
        viewCtx ? (x, y) => viewCtx.visibleAtWorld(x, y) : null
      );
      state.npcOcclusionBlockedMoves += blocked;
    }
  }

  drawTileGrid();
  updateStats();
  requestAnimationFrame(tickLoop);
}

async function loadRuntimeAssets() {
  const required = ["map", "chunks"];
  const missing = [];

  try {
    for (const name of required) {
      const res = await fetch(`../assets/runtime/${name}`);
      if (!res.ok) {
        missing.push(name);
      }
    }
    if (missing.length) {
      throw new Error(`missing ${missing.join(", ")}`);
    }

    const [mapRes, chunksRes, palRes, flagRes, idxRes, maskRes, mapTileRes, objTileRes, baseTileRes, animRes, objListRes] = await Promise.all([
      fetch("../assets/runtime/map"),
      fetch("../assets/runtime/chunks"),
      fetch("../assets/runtime/u6pal"),
      fetch("../assets/runtime/tileflag"),
      fetch("../assets/runtime/tileindx.vga"),
      fetch("../assets/runtime/masktype.vga"),
      fetch("../assets/runtime/maptiles.vga"),
      fetch("../assets/runtime/objtiles.vga"),
      fetch("../assets/runtime/basetile"),
      fetch("../assets/runtime/animdata"),
      fetch("../assets/runtime/savegame/objlist")
    ]);
    const [mapBuf, chunkBuf, palBuf, flagBuf, idxBuf, maskBuf, mapTileBuf, objTileBuf, baseTileBuf, animBuf, objListBuf] = await Promise.all([
      mapRes.arrayBuffer(),
      chunksRes.arrayBuffer(),
      palRes.arrayBuffer(),
      flagRes.arrayBuffer(),
      idxRes.arrayBuffer(),
      maskRes.arrayBuffer(),
      mapTileRes.arrayBuffer(),
      objTileRes.arrayBuffer(),
      baseTileRes.arrayBuffer(),
      animRes.arrayBuffer(),
      objListRes.arrayBuffer()
    ]);
    state.mapCtx = new U6MapJS(new Uint8Array(mapBuf), new Uint8Array(chunkBuf));
    if (palRes.ok && palBuf.byteLength >= 0x300) {
      state.basePalette = buildPaletteFromU6Pal(new Uint8Array(palBuf));
      state.palette = state.basePalette;
      state.paletteFrameTick = -1;
      state.paletteFrame = null;
    } else {
      state.basePalette = null;
      state.palette = null;
    }
    if (flagRes.ok && flagBuf.byteLength >= 0x1000) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
    } else if (flagRes.ok && flagBuf.byteLength >= 0x800) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0, 0x800));
    } else {
      state.tileFlags = null;
      state.terrainType = null;
    }

    if (
      state.palette
      && idxRes.ok && idxBuf.byteLength >= 0x200
      && maskRes.ok && maskBuf.byteLength >= 0x100
      && mapTileRes.ok && mapTileBuf.byteLength > 0
      && objTileRes.ok && objTileBuf.byteLength > 0
    ) {
      const maskDecoded = decompressU6Lzw(new Uint8Array(maskBuf));
      const mapDecoded = decompressU6Lzw(new Uint8Array(mapTileBuf));
      state.tileSet = new U6TileSetJS(
        new Uint8Array(idxBuf),
        maskDecoded,
        mapDecoded,
        new Uint8Array(objTileBuf)
      );
    } else {
      state.tileSet = null;
    }

    if (baseTileRes.ok && baseTileBuf.byteLength >= 2048) {
      const baseTiles = buildBaseTileTable(new Uint8Array(baseTileBuf));
      state.objectLayer = new U6ObjectLayerJS(baseTiles);
      await state.objectLayer.loadOutdoor((name) => fetch(`../assets/runtime/savegame/${name}`));
      if (objListRes.ok && objListBuf.byteLength >= 0x0900) {
        state.entityLayer = new U6EntityLayerJS(baseTiles);
        state.entityLayer.load(new Uint8Array(objListBuf));
      } else {
        state.entityLayer = null;
      }
      if (animRes.ok && animBuf.byteLength >= 2) {
        state.animData = U6AnimDataJS.fromBytes(new Uint8Array(animBuf));
      } else {
        state.animData = null;
      }
    } else {
      state.objectLayer = null;
      state.entityLayer = null;
      state.animData = null;
    }

    if (state.tileSet) {
      statSource.textContent = "runtime assets + tile art";
    } else if (state.palette) {
      statSource.textContent = "runtime assets + palette";
    } else {
      statSource.textContent = "runtime assets";
    }
    diagBox.className = "diag ok";
    if (state.tileSet) {
      if (state.objectLayer && state.objectLayer.filesLoaded > 0) {
        if (state.animData) {
          const entityMsg = state.entityLayer ? ` Entity layer active (${state.entityLayer.totalLoaded} objlist actors).` : "";
          diagBox.textContent = `Runtime assets loaded with tile decoder path. Object overlay active (${state.objectLayer.totalLoaded} objects from ${state.objectLayer.filesLoaded} objblk files). Animated tile remaps active (${state.animData.entries.length} entries).${entityMsg}`;
        } else {
          const entityMsg = state.entityLayer ? ` Entity layer active (${state.entityLayer.totalLoaded} objlist actors).` : "";
          diagBox.textContent = `Runtime assets loaded with tile decoder path. Object overlay active (${state.objectLayer.totalLoaded} objects from ${state.objectLayer.filesLoaded} objblk files).${entityMsg}`;
        }
      } else {
        diagBox.textContent = "Runtime assets loaded with tile decoder path (tileindx/masktype/maptiles/objtiles). Rendering bitmap tiles.";
      }
    } else if (state.palette) {
      diagBox.textContent = "Runtime assets loaded with u6pal/tileflag decoding. Terrain tint now uses original palette data.";
    } else {
      diagBox.textContent = "Runtime assets loaded. Rendering map/chunk data from local runtime directory.";
    }
  } catch (err) {
    state.mapCtx = null;
    state.tileSet = null;
    state.objectLayer = null;
    state.entityLayer = null;
    state.animData = null;
    state.palette = null;
    state.basePalette = null;
    state.tileFlags = null;
    state.terrainType = null;
    statSource.textContent = "synthetic fallback";
    diagBox.className = "diag warn";
    diagBox.textContent = `Fallback active: ${String(err.message || err)}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`;
  }
}

window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k === "w" || k === "k") queueMove(0, -1);
  else if (k === "s" || k === "j") queueMove(0, 1);
  else if (k === "a" || k === "h") queueMove(-1, 0);
  else if (k === "d" || k === "l") queueMove(1, 0);
  else if (k === "g") jumpToPreset();
  else if (k === "o") setOverlayDebug(!state.showOverlayDebug);
  else if (k === "p") captureViewportPng();
  else if (k === "r") resetRun();
  else if (k === "v") verifyReplayStability();
  else if (k === "f") setAnimationMode(state.animationFrozen ? "live" : "freeze");
  else if (k === "b") setPaletteFxMode(!state.enablePaletteFx);
  else return;
  ev.preventDefault();
});

loadRuntimeAssets().then(() => {
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});

initTheme();
initLayout();
initFont();
initGrid();
initOverlayDebug();
initAnimationMode();
initPaletteFxMode();
initCapturePresets();
if (jumpButton) {
  jumpButton.addEventListener("click", jumpToPreset);
}
if (captureButton) {
  captureButton.addEventListener("click", captureViewportPng);
}

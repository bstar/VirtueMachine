import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel
} from "./render_composition.js";

const TICK_MS = 100;
const TILE_SIZE = 64;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;
const MOVE_INPUT_MIN_INTERVAL_MS = 120;
const NET_PRESENCE_HEARTBEAT_TICKS = 4;
const NET_PRESENCE_POLL_TICKS = 10;
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
const AVATAR_ENTITY_ID = 1;
const OBJECT_TYPES_FLOOR_DECOR = new Set([0x12e, 0x12f, 0x130]);
const OBJECT_TYPES_DOOR = new Set([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
const OBJECT_TYPES_CLOSEABLE_DOOR = new Set([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);
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
const legacyBackdropCanvas = document.getElementById("legacyBackdrop");
const legacyViewportCanvas = document.getElementById("legacyViewport");
const legacyWorldSurface = document.getElementById("legacyWorldSurface");

const statTick = document.getElementById("statTick");
const statPos = document.getElementById("statPos");
const statClock = document.getElementById("statClock");
const statDate = document.getElementById("statDate");
const statTile = document.getElementById("statTile");
const statObjects = document.getElementById("statObjects");
const statEntities = document.getElementById("statEntities");
const statRenderParity = document.getElementById("statRenderParity");
const statAvatarState = document.getElementById("statAvatarState");
const statNpcOcclusionBlocks = document.getElementById("statNpcOcclusionBlocks");
const statQueued = document.getElementById("statQueued");
const statSource = document.getElementById("statSource");
const statHash = document.getElementById("statHash");
const statReplay = document.getElementById("statReplay");
const statPalettePhase = document.getElementById("statPalettePhase");
const statCenterTiles = document.getElementById("statCenterTiles");
const statCenterBand = document.getElementById("statCenterBand");
const statNetSession = document.getElementById("statNetSession");
const statNetPlayers = document.getElementById("statNetPlayers");
const statCriticalRecoveries = document.getElementById("statCriticalRecoveries");
const topTimeOfDay = document.getElementById("topTimeOfDay");
const topNetStatus = document.getElementById("topNetStatus");
const diagBox = document.getElementById("diagBox");
const replayDownload = document.getElementById("replayDownload");
const themeSelect = document.getElementById("themeSelect");
const fontSelect = document.getElementById("fontSelect");
const gridToggle = document.getElementById("gridToggle");
const debugOverlayToggle = document.getElementById("debugOverlayToggle");
const animationToggle = document.getElementById("animationToggle");
const paletteFxToggle = document.getElementById("paletteFxToggle");
const movementModeToggle = document.getElementById("movementModeToggle");
const renderModeToggle = document.getElementById("renderModeToggle");
const capturePreviewToggle = document.getElementById("capturePreviewToggle");
const legacyScaleModeToggle = document.getElementById("legacyScaleModeToggle");
const charStubCanvas = document.getElementById("charStubCanvas");
const locationSelect = document.getElementById("locationSelect");
const jumpButton = document.getElementById("jumpButton");
const captureButton = document.getElementById("captureButton");
const captureWorldHudButton = document.getElementById("captureWorldHudButton");
const netApiBaseInput = document.getElementById("netApiBaseInput");
const netUsernameInput = document.getElementById("netUsernameInput");
const netPasswordInput = document.getElementById("netPasswordInput");
const netCharacterNameInput = document.getElementById("netCharacterNameInput");
const netLoginButton = document.getElementById("netLoginButton");
const netRecoverButton = document.getElementById("netRecoverButton");
const netSaveButton = document.getElementById("netSaveButton");
const netLoadButton = document.getElementById("netLoadButton");
const netRenameButton = document.getElementById("netRenameButton");
const netMaintenanceToggle = document.getElementById("netMaintenanceToggle");
const netMaintenanceButton = document.getElementById("netMaintenanceButton");

const THEME_KEY = "vm_theme";
const FONT_KEY = "vm_font";
const GRID_KEY = "vm_grid";
const DEBUG_OVERLAY_KEY = "vm_overlay_debug";
const ANIMATION_KEY = "vm_animation";
const PALETTE_FX_KEY = "vm_palette_fx";
const MOVEMENT_MODE_KEY = "vm_movement_mode";
const RENDER_MODE_KEY = "vm_render_mode";
const LEGACY_FRAME_PREVIEW_KEY = "vm_legacy_frame_preview";
const LEGACY_SCALE_MODE_KEY = "vm_legacy_scale_mode";
const NET_API_BASE_KEY = "vm_net_api_base";
const NET_USERNAME_KEY = "vm_net_username";
const NET_CHARACTER_NAME_KEY = "vm_net_character_name";
const NET_MAINTENANCE_KEY = "vm_net_maintenance";
const LEGACY_UI_MAP_RECT = Object.freeze({ x: 8, y: 8, w: 160, h: 160 });
const LEGACY_FRAME_TILES = Object.freeze({
  cornerTL: 0x1b0,
  top: 0x1b1,
  cornerTR: 0x1b2,
  cornerBL: 0x1b3,
  bottom: 0x1b4,
  cornerBR: 0x1b5,
  left: 0x1b6,
  right: 0x1b7
});
const LEGACY_UI_TILE = Object.freeze({
  SLOT_EMPTY: 0x19b,
  BUTTON_ATTACK_BASE: 0x190,
  BUTTON_RIGHT: 0x19e,
  SKY_OUTSIDE_BASE: 0x160,
  CAVE_L: 0x174,
  CAVE_M: 0x175,
  CAVE_R: 0x176,
  EQUIP_UL: 0x170,
  EQUIP_UR: 0x171,
  EQUIP_DL: 0x172,
  EQUIP_DR: 0x173
});
const LEGACY_POSTURE_ICONS = Object.freeze([0x183, 0x180, 0x181, 0x184, 0x187]);
const LEGACY_HUD_TEXT_COLOR = "#8b3f24";
const LEGACY_AVATAR_PORTRAIT_INDEX = 0;
const STARTUP_MENU = Object.freeze([
  { id: "intro", label: "Introduction", enabled: false },
  { id: "create", label: "Create Character", enabled: false },
  { id: "transfer", label: "Transfer Character", enabled: false },
  { id: "ack", label: "Acknowledgements", enabled: false },
  { id: "journey", label: "Journey Onward", enabled: true }
]);
const STARTUP_MENU_PAL = Object.freeze([
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
const STARTUP_MENU_PAL_IDX = Object.freeze([14, 33, 34, 35, 36]);
const STARTUP_MENU_HITBOX = Object.freeze({
  x0: 56,
  x1: 264,
  rows: [
    [86, 108],
    [107, 128],
    [127, 149],
    [148, 170],
    [169, 196]
  ]
});
const LEGACY_DIGIT_3X5 = Object.freeze([
  0xF6DE, 0x4924, 0xE7CE, 0xE59E, 0xB792,
  0xF39E, 0xF3DE, 0xE4A4, 0xF7DE, 0xF79E
]);
const LEGACY_DIGIT_X = Object.freeze([
  [7, 0, 0, 0],
  [9, 4, 0, 0],
  [11, 7, 3, 0],
  [13, 9, 5, 1]
]);
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
const FONTS = ["sans", "silkscreen", "kaijuz", "orangekid", "blockblueprint"];
const RENDER_MODES = ["current", "nuvie"];
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
  renderModeDebug: null,
  interactionProbeTile: null,
  npcOcclusionBlockedMoves: 0,
  showGrid: false,
  showOverlayDebug: false,
  enablePaletteFx: true,
  movementMode: "ghost",
  renderMode: "current",
  avatarFacingDx: 0,
  avatarFacingDy: 1,
  avatarLastMoveTick: -1,
  lastMoveQueueAtMs: -1,
  lastMoveInputDx: 0,
  lastMoveInputDy: 1,
  avatarFrameSeed: 0,
  palette: null,
  basePalette: null,
  tileFlags: null,
  terrainType: null,
  paletteFrameTick: -1,
  paletteFrame: null,
  centerRawTile: 0,
  centerAnimatedTile: 0,
  centerPaletteBand: "none",
  cornerVariantCache: new Map(),
  lastTs: performance.now(),
  accMs: 0,
  replayUrl: null,
  legacyPaperPixmap: null,
  legacyScaleMode: "fit",
  legacyComposeCanvas: null,
  legacyBackdropBaseCanvas: null,
  avatarPortraitCanvas: null,
  u6MainFont: null,
  runtimeReady: false,
  sessionStarted: false,
  startupMenuIndex: 0,
  startupTitlePixmaps: null,
  startupMenuPixmap: null,
  startupCanvasCache: new Map(),
  cursorPixmaps: null,
  cursorIndex: 0,
  mouseNormX: 0,
  mouseNormY: 0,
  mouseInCanvas: false,
  net: {
    apiBase: "http://127.0.0.1:8081",
    token: "",
    userId: "",
    username: "",
    sessionId: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    characterId: "",
    characterName: "",
    remotePlayers: [],
    lastPresenceHeartbeatTick: -1,
    lastPresencePollTick: -1,
    presencePollInFlight: false,
    lastSavedTick: 0,
    maintenanceAuto: false,
    maintenanceInFlight: false,
    lastMaintenanceTick: -1,
    recoveryEventCount: 0,
    statusLevel: "idle",
    statusText: "Not logged in."
  }
};

function isLegacyScaleMode(mode) {
  return mode === "fit" || mode === "1" || mode === "2" || mode === "3" || mode === "4";
}

function isLegacyFramePreviewOn() {
  return document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
}

const LEGACY_SCALE_MODES = Object.freeze(["fit", "1", "2", "3", "4"]);
const CURSOR_ASPECT_X = 1.0;
const CURSOR_ASPECT_Y = 1.2;

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
  const doorTileId = resolveDoorTileId(state.sim, obj);
  if (state.animData && state.animData.hasBaseTile(obj.baseTile)) {
    const animBase = state.animData.animatedTile(obj.baseTile, counter);
    return (animBase + (obj.frame | 0)) & 0xffff;
  }
  return resolveAnimatedTileAtTick(doorTileId, counter);
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
      const a = isLegacyPixelTransparent(mask, tileId, palIdx) ? 0 : 255;
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

function decodeLegacyPixmap(bytes) {
  if (!bytes || bytes.length < 4) {
    return null;
  }
  const decoded = decompressU6Lzw(bytes);
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

function decodeU6ShapeFromBuffer(buf) {
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

function decodeU6ShpArchive(bytes) {
  if (!bytes || bytes.length < 8) {
    return [];
  }
  const decoded = decompressU6Lzw(bytes);
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
  const out = [];
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
    out.push(decodeU6ShapeFromBuffer(decoded.slice(start, end)));
  }
  return out;
}

function decodeU6CursorPtr(bytes) {
  if (!bytes || bytes.length < 8) {
    return [];
  }
  const decoded = decompressU6Lzw(bytes);
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

  const items = [];
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

  const cursors = [];
  for (const item of items) {
    if (!item || !item.offset || item.size <= 0 || (item.offset + item.size) > decoded.length) {
      continue;
    }
    let payload = decoded.slice(item.offset, item.offset + item.size);
    if (item.flag === 0x01 || item.flag === 0x20) {
      payload = decompressU6Lzw(payload);
    }
    const shape = decodeU6ShapeFromBuffer(payload);
    if (shape) {
      cursors.push(shape);
    }
  }
  return cursors;
}

function decodePortraitFromArchive(bytes, index = 0) {
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
  const dec = decompressU6Lzw(bytes.slice(start, end));
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

function canvasFromIndexedPixels(pixmap, palette, transparentIndex = null) {
  if (!pixmap || !palette) {
    return null;
  }
  const c = document.createElement("canvas");
  c.width = pixmap.width | 0;
  c.height = pixmap.height | 0;
  const g = c.getContext("2d");
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

function drawU6MainText(g, text, sx, sy, scale = 1, color = "#e7dcc0") {
  if (!state.u6MainFont) {
    g.fillStyle = color;
    g.font = `${Math.max(8, 8 * scale)}px monospace`;
    g.fillText(String(text || ""), sx, sy + (7 * scale));
    return;
  }
  const msg = String(text || "").toUpperCase();
  g.fillStyle = color;
  for (let i = 0; i < msg.length; i += 1) {
    const code = msg.charCodeAt(i) & 0xff;
    const off = code * 8;
    for (let row = 0; row < 8; row += 1) {
      const bits = state.u6MainFont[off + row] ?? 0;
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

function applyLegacyFrameLayout() {
  if (!legacyBackdropCanvas || !legacyWorldSurface || !canvas || !legacyViewportCanvas) {
    return;
  }

  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    legacyWorldSurface.style.width = "";
    legacyWorldSurface.style.height = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.width = "";
    canvas.style.height = "";
    legacyViewportCanvas.style.left = "";
    legacyViewportCanvas.style.top = "";
    legacyViewportCanvas.style.width = "";
    legacyViewportCanvas.style.height = "";
    return;
  }

  const pixmap = state.legacyPaperPixmap;
  const pal = state.basePalette;
  if (!pixmap || !pal || pal.length < 256) {
    return;
  }

  const srcW = pixmap.width | 0;
  const srcH = pixmap.height | 0;
  const host = legacyWorldSurface.parentElement || legacyWorldSurface;
  const hostRect = host.getBoundingClientRect();
  const fitScaleX = Math.floor((hostRect.width || srcW) / srcW);
  const fitScaleY = Math.floor((hostRect.height || srcH) / srcH);
  const fitScale = Math.max(1, Math.min(fitScaleX, fitScaleY));
  let scale = fitScale;
  if (state.legacyScaleMode !== "fit") {
    const fixed = Number.parseInt(state.legacyScaleMode, 10);
    if (Number.isFinite(fixed) && fixed >= 1) {
      scale = fixed;
    }
  }
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const src = document.createElement("canvas");
  src.width = srcW;
  src.height = srcH;
  const sg = src.getContext("2d");
  const id = sg.createImageData(srcW, srcH);
  for (let i = 0, p = 0; i < pixmap.pixels.length; i += 1, p += 4) {
    const c = pal[pixmap.pixels[i] & 0xff] ?? [0, 0, 0];
    id.data[p + 0] = c[0] | 0;
    id.data[p + 1] = c[1] | 0;
    id.data[p + 2] = c[2] | 0;
    id.data[p + 3] = 255;
  }
  sg.putImageData(id, 0, 0);

  legacyBackdropCanvas.width = outW;
  legacyBackdropCanvas.height = outH;
  const bg = legacyBackdropCanvas.getContext("2d");
  bg.imageSmoothingEnabled = false;
  bg.clearRect(0, 0, outW, outH);
  bg.drawImage(src, 0, 0, srcW, srcH, 0, 0, outW, outH);
  if (!state.legacyBackdropBaseCanvas) {
    state.legacyBackdropBaseCanvas = document.createElement("canvas");
  }
  state.legacyBackdropBaseCanvas.width = outW;
  state.legacyBackdropBaseCanvas.height = outH;
  const bb = state.legacyBackdropBaseCanvas.getContext("2d");
  bb.imageSmoothingEnabled = false;
  bb.clearRect(0, 0, outW, outH);
  bb.drawImage(legacyBackdropCanvas, 0, 0);

  const mapX = LEGACY_UI_MAP_RECT.x * scale;
  const mapY = LEGACY_UI_MAP_RECT.y * scale;
  const mapW = LEGACY_UI_MAP_RECT.w * scale;
  const mapH = LEGACY_UI_MAP_RECT.h * scale;
  legacyWorldSurface.style.width = `${outW}px`;
  legacyWorldSurface.style.height = `${outH}px`;
  legacyViewportCanvas.style.left = `${mapX}px`;
  legacyViewportCanvas.style.top = `${mapY}px`;
  legacyViewportCanvas.style.width = `${mapW}px`;
  legacyViewportCanvas.style.height = `${mapH}px`;
}

function renderLegacyHudStubOnBackdrop() {
  if (!legacyBackdropCanvas) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  const w = legacyBackdropCanvas.width | 0;
  const h = legacyBackdropCanvas.height | 0;
  if (w <= 0 || h <= 0) {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (state.legacyBackdropBaseCanvas
    && state.legacyBackdropBaseCanvas.width === w
    && state.legacyBackdropBaseCanvas.height === h) {
    g.clearRect(0, 0, w, h);
    g.drawImage(state.legacyBackdropBaseCanvas, 0, 0);
  }

  const scale = Math.max(1, Math.floor(w / 320));
  const x = (v) => v * scale;
  const y = (v) => v * scale;
  const drawTile = (tileId, sx, sy) => {
    if (!state.tileSet) {
      return;
    }
    const pal = paletteForTile(tileId);
    const key = paletteKeyForTile(tileId);
    const tc = state.tileSet.tileCanvas(tileId, pal, key);
    if (!tc) {
      return;
    }
    g.drawImage(tc, x(sx), y(sy), x(16), y(16));
  };

  const drawLegacyNumber = (value, sx, sy, color = LEGACY_HUD_TEXT_COLOR) => {
    const v = Math.max(0, Math.floor(value));
    const text = String(v).slice(0, 4);
    const sx0 = LEGACY_DIGIT_X[text.length - 1] ?? LEGACY_DIGIT_X[3];
    const baseY = sy + 11;
    g.fillStyle = color;
    for (let i = 0; i < text.length; i += 1) {
      const d = text.charCodeAt(i) - 48;
      if (d < 0 || d > 9) {
        continue;
      }
      let bits = LEGACY_DIGIT_3X5[d] & 0xffff;
      const dx = sx + sx0[i];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (bits & 0x8000) {
            g.fillRect(x(dx + col), y(baseY + row), x(1), y(1));
          }
          bits = (bits << 1) & 0xffff;
        }
      }
    }
  };

  /* Use real UI tiles for strip + panel stub to mimic legacy look. */
  for (let i = 0; i < 9; i += 1) {
    drawTile(LEGACY_UI_TILE.SLOT_EMPTY, i * 16, 176);
  }
  if (state.sim.world.map_z === 0 || state.sim.world.map_z === 5) {
    for (let i = 0; i < 9; i += 1) {
      drawTile(LEGACY_UI_TILE.SKY_OUTSIDE_BASE + i, i * 16, 4);
    }
  } else {
    drawTile(LEGACY_UI_TILE.CAVE_L, 0, 4);
    for (let i = 1; i < 8; i += 1) {
      drawTile(LEGACY_UI_TILE.CAVE_M, i * 16, 4);
    }
    drawTile(LEGACY_UI_TILE.CAVE_R, 128, 4);
  }
  drawTile(LEGACY_UI_TILE.EQUIP_UL, 192, 40);
  drawTile(LEGACY_UI_TILE.EQUIP_UR, 208, 40);
  drawTile(LEGACY_UI_TILE.EQUIP_DL, 192, 56);
  drawTile(LEGACY_UI_TILE.EQUIP_DR, 208, 56);

  /* Portrait + stats block using legacy main font and posture icons. */
  for (let ry = 0; ry < 10; ry += 1) {
    for (let rx = 0; rx < 8; rx += 1) {
      drawTile(LEGACY_UI_TILE.SLOT_EMPTY, 176 + (rx * 16), 8 + (ry * 16));
    }
  }
  const portraitName = (state.net.username && state.net.username.trim())
    ? state.net.username.trim().toUpperCase().slice(0, 12)
    : "AVATAR";
  drawU6MainText(g, portraitName, x(184), y(12), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  if (state.avatarPortraitCanvas) {
    g.drawImage(state.avatarPortraitCanvas, x(184), y(24), x(56), y(64));
  } else if (state.tileSet) {
    const avatarTile = avatarRenderTileId();
    if (avatarTile != null) {
      const pal = paletteForTile(avatarTile);
      const key = paletteKeyForTile(avatarTile);
      const tc = state.tileSet.tileCanvas(avatarTile, pal, key);
      if (tc) {
        g.drawImage(tc, x(204), y(40), x(16), y(16));
      }
    }
  }
  drawU6MainText(g, "HP", x(244), y(26), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, String(100), x(268), y(26), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, "MP", x(244), y(38), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, String(42), x(268), y(38), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, "TIME", x(244), y(50), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(
    g,
    `${String(state.sim.world.time_h).padStart(2, "0")}:${String(state.sim.world.time_m).padStart(2, "0")}`,
    x(244),
    y(62),
    Math.max(1, scale),
    LEGACY_HUD_TEXT_COLOR
  );
  for (let i = 0; i < LEGACY_POSTURE_ICONS.length; i += 1) {
    drawTile(LEGACY_POSTURE_ICONS[i], 184 + (i * 16), 88);
  }
  drawU6MainText(g, "MODE", x(184), y(108), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, state.movementMode === "avatar" ? "BATTLE" : "GHOST", x(184), y(120), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);

  /* Verb icons under world view, matching legacy strip placement. */
  for (let i = 0; i < 9; i += 1) {
    drawTile(LEGACY_UI_TILE.BUTTON_ATTACK_BASE + i, 8 + (i * 16), 176);
  }
  drawTile(LEGACY_UI_TILE.BUTTON_RIGHT, 152, 176);
}

function drawLegacyTileScaled(g, tileId, sx, sy, scale) {
  if (!state.tileSet) {
    return;
  }
  const pal = paletteForTile(tileId);
  const key = paletteKeyForTile(tileId);
  const tc = state.tileSet.tileCanvas(tileId, pal, key);
  if (!tc) {
    return;
  }
  g.drawImage(tc, sx, sy, 16 * scale, 16 * scale);
}

function renderStartupMenuLayer(g, scale) {
  const x = (v) => v * scale;
  const y = (v) => v * scale;

  const startupPal = buildStartupPaletteForMenu();
  const hasStartupArt = startupPal
    && state.startupTitlePixmaps
    && state.startupTitlePixmaps[0]
    && state.startupTitlePixmaps[1]
    && state.startupMenuPixmap;
  g.fillStyle = "#000000";
  g.fillRect(0, 0, x(320), y(200));
  if (hasStartupArt) {
    const drawSprite = (key, pixmap, sx, sy) => {
      if (!pixmap) {
        return;
      }
      const cacheKey = `${key}:${state.startupMenuIndex}`;
      let sprite = state.startupCanvasCache.get(cacheKey);
      if (!sprite) {
        sprite = canvasFromIndexedPixels(pixmap, startupPal, 0xff);
        state.startupCanvasCache.set(cacheKey, sprite);
      }
      if (!sprite) {
        return;
      }
      g.drawImage(sprite, x(sx), y(sy), x(sprite.width), y(sprite.height));
    };
    drawSprite("title", state.startupTitlePixmaps[0], 0x13, 0x00);
    drawSprite("subtitle", state.startupTitlePixmaps[1], 0x3b, 0x2f);
    drawSprite("menu", state.startupMenuPixmap, 0x31, 0x53);
    return;
  }

  for (let i = 0; i < 20; i += 1) {
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(i * 16), 0, scale);
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(i * 16), y(184), scale);
  }
  for (let i = 1; i < 11; i += 1) {
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, 0, y(i * 16), scale);
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(304), y(i * 16), scale);
  }

  drawU6MainText(g, "ULTIMA VI", x(112), y(30), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, "THE FALSE PROPHET", x(94), y(44), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);

  for (let i = 0; i < STARTUP_MENU.length; i += 1) {
    const item = STARTUP_MENU[i];
    const enabled = startupMenuItemEnabled(item);
    const rowY = 74 + (i * 20);
    const selected = i === state.startupMenuIndex;
    g.fillStyle = selected ? "#5f2e1d" : "#1f1a14";
    g.fillRect(x(62), y(rowY), x(196), y(16));
    g.strokeStyle = selected ? "#d7b981" : "#6a5131";
    g.strokeRect(x(62) + 0.5, y(rowY) + 0.5, x(196) - 1, y(16) - 1);
    if (selected) {
      drawU6MainText(g, ">>", x(68), y(rowY + 4), Math.max(1, scale), "#f2dfb6");
    }
    const textColor = enabled ? (selected ? "#f2dfb6" : "#d8be8a") : "#76644a";
    drawU6MainText(g, item.label, x(86), y(rowY + 4), Math.max(1, scale), textColor);
  }

  drawU6MainText(g, "Use ARROWS + ENTER", x(98), y(162), Math.max(1, scale), "#8e7a55");
  if (!isNetAuthenticated()) {
    drawU6MainText(g, "LOGIN REQUIRED", x(108), y(174), Math.max(1, scale), "#8e6a42");
  }
}

function buildStartupPaletteForMenu() {
  if (!state.basePalette || state.basePalette.length < 256) {
    return null;
  }
  const palette = state.basePalette.map((rgb) => [rgb[0] | 0, rgb[1] | 0, rgb[2] | 0]);
  const idx = state.startupMenuIndex | 0;
  for (let i = 0; i < 5; i += 1) {
    const src = STARTUP_MENU_PAL[(4 + i - idx)] || STARTUP_MENU_PAL[4];
    const di = STARTUP_MENU_PAL_IDX[i] | 0;
    palette[di] = [src[0] | 0, src[1] | 0, src[2] | 0];
  }
  return palette;
}

function renderStartupScreen() {
  const mainScale = Math.max(1, Math.floor(canvas.width / 320));
  renderStartupMenuLayer(ctx, mainScale);

  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled || !legacyBackdropCanvas) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  const w = legacyBackdropCanvas.width | 0;
  const h = legacyBackdropCanvas.height | 0;
  if (w <= 0 || h <= 0) {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (state.legacyBackdropBaseCanvas
    && state.legacyBackdropBaseCanvas.width === w
    && state.legacyBackdropBaseCanvas.height === h) {
    g.clearRect(0, 0, w, h);
    g.drawImage(state.legacyBackdropBaseCanvas, 0, 0);
  } else {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
  }
  const scale = Math.max(1, Math.floor(w / 320));
  renderStartupMenuLayer(g, scale);

  legacyViewportCanvas.width = 160;
  legacyViewportCanvas.height = 160;
  const lv = legacyViewportCanvas.getContext("2d");
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, 160, 160);
  lv.drawImage(legacyBackdropCanvas, 8 * scale, 8 * scale, 160 * scale, 160 * scale, 0, 0, 160, 160);
}

function drawCustomCursorOnContext(g, targetW, targetH, opts = null) {
  if (!state.mouseInCanvas || !state.cursorPixmaps || !state.cursorPixmaps.length) {
    return;
  }
  const cursorShape = state.cursorPixmaps[state.cursorIndex] || state.cursorPixmaps[0];
  if (!cursorShape || !state.basePalette || !g || targetW <= 0 || targetH <= 0) {
    return;
  }
  const cursorCanvas = canvasFromIndexedPixels(cursorShape, getRenderPalette() || state.basePalette, 0xff);
  if (!cursorCanvas) {
    return;
  }
  const logicalW = (opts && Number.isFinite(opts.logicalW) && opts.logicalW > 0)
    ? opts.logicalW
    : (state.sessionStarted ? (isLegacyFramePreviewOn() ? 320 : (VIEW_W * 16)) : 320);
  const scale = Math.max(1, Math.floor(targetW / Math.max(1, logicalW)));
  const scaleX = scale * CURSOR_ASPECT_X;
  const scaleY = scale * CURSOR_ASPECT_Y;
  const hotX = Math.min(cursorShape.width - 1, Math.max(0, cursorShape.hotX ?? Math.floor(cursorShape.width * 0.5)));
  const hotY = Math.min(cursorShape.height - 1, Math.max(0, cursorShape.hotY ?? Math.floor(cursorShape.height * 0.5)));
  const mouseX = (opts && Number.isFinite(opts.mouseX)) ? Math.floor(opts.mouseX) : Math.floor(state.mouseNormX * targetW);
  const mouseY = (opts && Number.isFinite(opts.mouseY)) ? Math.floor(opts.mouseY) : Math.floor(state.mouseNormY * targetH);
  const drawW = Math.max(1, Math.round(cursorShape.width * scaleX));
  const drawH = Math.max(1, Math.round(cursorShape.height * scaleY));
  let px = mouseX - Math.round(hotX * scaleX);
  let py = mouseY - Math.round(hotY * scaleY);
  px = Math.max(0, Math.min(targetW - drawW, px));
  py = Math.max(0, Math.min(targetH - drawH, py));
  g.imageSmoothingEnabled = false;
  g.drawImage(cursorCanvas, px, py, drawW, drawH);
}

function drawCustomCursorLayer() {
  if (isLegacyFramePreviewOn()) {
    if (!legacyBackdropCanvas) {
      return;
    }
    const bw = legacyBackdropCanvas.width | 0;
    const bh = legacyBackdropCanvas.height | 0;
    if (bw <= 0 || bh <= 0) {
      return;
    }
    const mx = Math.floor(state.mouseNormX * bw);
    const my = Math.floor(state.mouseNormY * bh);

    if (state.sessionStarted && legacyViewportCanvas) {
      const scale = Math.max(1, Math.floor(bw / 320));
      const mapX = LEGACY_UI_MAP_RECT.x * scale;
      const mapY = LEGACY_UI_MAP_RECT.y * scale;
      const mapW = LEGACY_UI_MAP_RECT.w * scale;
      const mapH = LEGACY_UI_MAP_RECT.h * scale;
      const overMap = mx >= mapX && mx < (mapX + mapW) && my >= mapY && my < (mapY + mapH);
      if (overMap) {
        const vg = legacyViewportCanvas.getContext("2d");
        const vx = (mx - mapX) / scale;
        const vy = (my - mapY) / scale;
        drawCustomCursorOnContext(
          vg,
          legacyViewportCanvas.width | 0,
          legacyViewportCanvas.height | 0,
          { mouseX: vx, mouseY: vy, logicalW: 160 }
        );
        return;
      }
    }
    const g = legacyBackdropCanvas.getContext("2d");
    drawCustomCursorOnContext(g, bw, bh, { mouseX: mx, mouseY: my, logicalW: 320 });
    return;
  }
  drawCustomCursorOnContext(ctx, canvas.width | 0, canvas.height | 0);
}

function composeLegacyViewportFromModernGrid() {
  if (!legacyViewportCanvas || !canvas) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    return;
  }

  if (!state.legacyComposeCanvas) {
    state.legacyComposeCanvas = document.createElement("canvas");
    state.legacyComposeCanvas.width = 176;
    state.legacyComposeCanvas.height = 176;
  }
  const compose = state.legacyComposeCanvas;
  const cctx = compose.getContext("2d");
  cctx.imageSmoothingEnabled = false;
  cctx.clearRect(0, 0, 176, 176);
  /* 704 -> 176 is exact /4, keeping tile edge parity intact before crop. */
  cctx.drawImage(canvas, 0, 0, 704, 704, 0, 0, 176, 176);

  if (state.tileSet) {
    const drawFrameTile = (tileId, x, y) => {
      const pal = paletteForTile(tileId);
      const key = paletteKeyForTile(tileId);
      const tc = state.tileSet.tileCanvas(tileId, pal, key);
      if (tc) {
        cctx.drawImage(tc, x, y);
      }
    };

    /* Legacy order from C_0A33_09CE/seg_2FC1: frame overlays drawn over map. */
    drawFrameTile(LEGACY_FRAME_TILES.cornerTL, 0, 0);
    drawFrameTile(LEGACY_FRAME_TILES.cornerTR, 160, 0);
    drawFrameTile(LEGACY_FRAME_TILES.cornerBL, 0, 160);
    drawFrameTile(LEGACY_FRAME_TILES.cornerBR, 160, 160);
    for (let i = 1; i < 10; i += 1) {
      const pos = i * 16;
      drawFrameTile(LEGACY_FRAME_TILES.top, pos, 0);
      drawFrameTile(LEGACY_FRAME_TILES.bottom, pos, 160);
      drawFrameTile(LEGACY_FRAME_TILES.left, 0, pos);
      drawFrameTile(LEGACY_FRAME_TILES.right, 160, pos);
    }
  }

  legacyViewportCanvas.width = 160;
  legacyViewportCanvas.height = 160;
  const lv = legacyViewportCanvas.getContext("2d");
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, 160, 160);
  /* Legacy map cutout sits at 8,8 with 160x160 size. */
  lv.drawImage(compose, 8, 8, 160, 160, 0, 0, 160, 160);
}

function createInitialSimState() {
  return {
    tick: 0,
    rngState: INITIAL_SEED >>> 0,
    worldFlags: 0,
    commandsApplied: 0,
    doorOpenStates: {},
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

function setFont(fontName) {
  const font = FONTS.includes(fontName) ? fontName : "sans";
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
  let saved = "sans";
  try {
    const fromStorage = localStorage.getItem(FONT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setFont(saved);
  if (fontSelect) {
    fontSelect.addEventListener("change", () => {
      setFont(fontSelect.value);
    });
  }
}

async function copyTextToClipboard(text) {
  const v = String(text ?? "");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch (_err) {
    // fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (_err) {
    return false;
  }
}

function makeCopyButton(getText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-icon-btn";
  btn.title = "Copy to clipboard";
  btn.textContent = "⧉";
  btn.addEventListener("click", async () => {
    const text = getText();
    const ok = await copyTextToClipboard(text);
    const prev = btn.textContent;
    btn.textContent = ok ? "✓" : "!";
    setTimeout(() => {
      btn.textContent = prev;
    }, 900);
  });
  return btn;
}

function initPanelCopyButtons() {
  const usefulValueIds = new Set([
    "statPos",
    "statClock",
    "statDate",
    "statTile",
    "statRenderParity",
    "statSource",
    "statHash",
    "statReplay",
    "statCenterTiles",
    "statNetSession"
  ]);
  const rows = document.querySelectorAll(".stat-row");
  for (const row of rows) {
    const label = row.querySelector("span");
    const value = row.querySelector("strong");
    if (!label || !value) {
      continue;
    }
    const valueId = value.id || "";
    const existingBtn = row.querySelector(".copy-icon-btn");
    if (!usefulValueIds.has(valueId)) {
      if (existingBtn) {
        existingBtn.remove();
      }
      continue;
    }
    if (existingBtn) {
      continue;
    }
    const btn = makeCopyButton(() => `${label.textContent || ""}: ${value.textContent || ""}`);
    row.appendChild(btn);
  }

  if (diagBox && diagBox.parentElement && !diagBox.parentElement.querySelector(".diag-copy")) {
    const wrap = document.createElement("div");
    wrap.className = "mt-1 flex justify-end diag-copy";
    const btn = makeCopyButton(() => diagBox.textContent || "");
    wrap.appendChild(btn);
    diagBox.parentElement.insertBefore(wrap, diagBox.nextSibling);
  }
}

function updateNetSessionStat() {
  if (!statNetSession) {
    return;
  }
  if (!state.net.token || !state.net.userId) {
    statNetSession.textContent = "offline";
    return;
  }
  const name = state.net.characterName || "(no-char)";
  statNetSession.textContent = `${state.net.username}/${name}`;
}

function setNetStatus(level, text) {
  const lvl = String(level || "idle");
  const msg = String(text || "");
  state.net.statusLevel = lvl;
  state.net.statusText = msg;
  if (topNetStatus) {
    topNetStatus.textContent = `${lvl} - ${msg}`;
  }
}

function isTypingContext(target) {
  if (!target) {
    return false;
  }
  const el = target instanceof Element ? target : null;
  if (!el) {
    return false;
  }
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return !!el.closest("input, textarea, select, [contenteditable=\"\"], [contenteditable=\"true\"]");
}

function updateCriticalRecoveryStat() {
  if (!statCriticalRecoveries) {
    return;
  }
  const suffix = state.net.lastMaintenanceTick >= 0 ? ` @${state.net.lastMaintenanceTick}` : "";
  statCriticalRecoveries.textContent = `${state.net.recoveryEventCount}${suffix}`;
}

function normalizeLoadedSimState(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  if (!candidate.world || typeof candidate.world !== "object") {
    return null;
  }
  return {
    tick: Number(candidate.tick) >>> 0,
    rngState: Number(candidate.rngState) >>> 0,
    worldFlags: Number(candidate.worldFlags) >>> 0,
    commandsApplied: Number(candidate.commandsApplied) >>> 0,
    doorOpenStates: { ...(candidate.doorOpenStates ?? {}) },
    world: {
      is_on_quest: Number(candidate.world.is_on_quest) >>> 0,
      next_sleep: Number(candidate.world.next_sleep) >>> 0,
      time_m: Number(candidate.world.time_m) >>> 0,
      time_h: Number(candidate.world.time_h) >>> 0,
      date_d: Number(candidate.world.date_d) >>> 0,
      date_m: Number(candidate.world.date_m) >>> 0,
      date_y: Number(candidate.world.date_y) >>> 0,
      wind_dir: Number(candidate.world.wind_dir) | 0,
      active: Number(candidate.world.active) >>> 0,
      map_x: Number(candidate.world.map_x) | 0,
      map_y: Number(candidate.world.map_y) | 0,
      map_z: Number(candidate.world.map_z) | 0,
      in_combat: Number(candidate.world.in_combat) >>> 0,
      sound_enabled: Number(candidate.world.sound_enabled) >>> 0
    }
  };
}

function encodeSimSnapshotBase64(sim) {
  const raw = JSON.stringify(cloneSimState(sim));
  return btoa(unescape(encodeURIComponent(raw)));
}

function decodeSimSnapshotBase64(snapshotBase64) {
  const raw = decodeURIComponent(escape(atob(String(snapshotBase64 || ""))));
  return normalizeLoadedSimState(JSON.parse(raw));
}

async function netRequest(route, init = {}, auth = true) {
  const base = String(state.net.apiBase || "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("Net API base URL is empty");
  }
  const headers = { ...(init.headers || {}) };
  if (auth && state.net.token) {
    headers.authorization = `Bearer ${state.net.token}`;
  }
  const res = await fetch(`${base}${route}`, { ...init, headers });
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body;
}

async function netEnsureCharacter() {
  const characterName = String(netCharacterNameInput?.value || "Avatar").trim() || "Avatar";
  const list = await netRequest("/api/characters", { method: "GET" }, true);
  const chars = Array.isArray(list?.characters) ? list.characters : [];
  let pick = chars.find((c) => String(c.name || "").toLowerCase() === characterName.toLowerCase());
  if (!pick) {
    pick = await netRequest("/api/characters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: characterName })
    }, true);
  }
  state.net.characterId = String(pick.character_id || "");
  state.net.characterName = characterName;
}

async function netLogin() {
  setNetStatus("connecting", "Authenticating...");
  state.net.apiBase = String(netApiBaseInput?.value || "").trim() || "http://127.0.0.1:8081";
  const username = String(netUsernameInput?.value || "").trim().toLowerCase();
  const password = String(netPasswordInput?.value || "");
  if (!username || !password) {
    throw new Error("Username and password are required");
  }
  const login = await netRequest("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, false);
  state.net.token = String(login?.token || "");
  state.net.userId = String(login?.user?.user_id || "");
  state.net.username = String(login?.user?.username || username);
  state.net.remotePlayers = [];
  state.net.lastPresenceHeartbeatTick = -1;
  state.net.lastPresencePollTick = -1;
  await netEnsureCharacter();
  await netPollPresence();
  updateNetSessionStat();
  setNetStatus("online", `${state.net.username}/${state.net.characterName}`);
  try {
    localStorage.setItem(NET_API_BASE_KEY, state.net.apiBase);
    localStorage.setItem(NET_USERNAME_KEY, state.net.username);
    localStorage.setItem(NET_CHARACTER_NAME_KEY, state.net.characterName);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

async function netRecoverPassword() {
  const base = String(netApiBaseInput?.value || "").trim() || "http://127.0.0.1:8081";
  const username = String(netUsernameInput?.value || "").trim().toLowerCase();
  if (!username) {
    throw new Error("Username is required");
  }
  state.net.apiBase = base;
  setNetStatus("connecting", "Recovering password...");
  const out = await netRequest(`/api/auth/recover-password?username=${encodeURIComponent(username)}`, { method: "GET" }, false);
  if (netPasswordInput) {
    netPasswordInput.value = String(out?.password_plaintext || "");
  }
  setNetStatus("online", `Recovered password for ${out?.user?.username || username}`);
  return out;
}

async function netRenameUsername() {
  if (!state.net.token) {
    await netLogin();
  }
  const newUsername = String(netUsernameInput?.value || "").trim().toLowerCase();
  const password = String(netPasswordInput?.value || "");
  if (!newUsername || newUsername.length < 2) {
    throw new Error("New username is required");
  }
  if (!password) {
    throw new Error("Password is required");
  }
  setNetStatus("sync", `Renaming to ${newUsername}...`);
  const out = await netRequest("/api/auth/rename-username", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      new_username: newUsername,
      password
    })
  }, true);
  state.net.username = String(out?.user?.username || newUsername);
  updateNetSessionStat();
  try {
    localStorage.setItem(NET_USERNAME_KEY, state.net.username);
  } catch (_err) {
    // ignore storage failures
  }
  setNetStatus("online", `Renamed ${out?.old_username || "user"} -> ${state.net.username}`);
  return out;
}

async function netSaveSnapshot() {
  setNetStatus("sync", "Saving remote snapshot...");
  if (!state.net.token) {
    await netLogin();
  } else if (!state.net.characterId) {
    await netEnsureCharacter();
  }
  const snapshotBase64 = encodeSimSnapshotBase64(state.sim);
  const out = await netRequest(`/api/characters/${encodeURIComponent(state.net.characterId)}/snapshot`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema_version: 1,
      sim_core_version: "client-web-js",
      saved_tick: state.sim.tick >>> 0,
      snapshot_base64: snapshotBase64
    })
  }, true);
  state.net.lastSavedTick = Number(out?.snapshot_meta?.saved_tick || 0) >>> 0;
  setNetStatus("online", `Saved tick ${state.net.lastSavedTick}`);
  return out;
}

async function netLoadSnapshot() {
  setNetStatus("sync", "Loading remote snapshot...");
  if (!state.net.token) {
    await netLogin();
  } else if (!state.net.characterId) {
    await netEnsureCharacter();
  }
  const out = await netRequest(`/api/characters/${encodeURIComponent(state.net.characterId)}/snapshot`, { method: "GET" }, true);
  if (!out?.snapshot_base64) {
    throw new Error("No snapshot is saved for this character yet");
  }
  const loaded = decodeSimSnapshotBase64(out.snapshot_base64);
  if (!loaded) {
    throw new Error("Snapshot payload is invalid");
  }
  state.sim = loaded;
  state.queue = [];
  state.commandLog = [];
  state.accMs = 0;
  state.lastMoveQueueAtMs = -1;
  state.avatarLastMoveTick = -1;
  state.interactionProbeTile = null;
  setNetStatus("online", `Loaded tick ${Number(out?.snapshot_meta?.saved_tick || 0)}`);
  return out;
}

function collectWorldItemsForMaintenance() {
  if (!state.objectLayer || !state.objectLayer.byCoord) {
    return [];
  }
  const worldItems = [];
  for (const list of state.objectLayer.byCoord.values()) {
    for (const obj of list) {
      const typeHex = (obj.type & 0x3ff).toString(16).padStart(3, "0");
      worldItems.push({
        item_id: `item_type_0x${typeHex}`,
        reachable: true,
        at: { x: obj.x | 0, y: obj.y | 0, z: obj.z | 0 }
      });
    }
  }
  return worldItems;
}

async function netRunCriticalMaintenance(opts = {}) {
  const { silent = false } = opts;
  if (state.net.maintenanceInFlight) {
    return [];
  }
  state.net.maintenanceInFlight = true;
  setNetStatus("sync", "Running critical maintenance...");
  try {
    if (!state.net.token) {
      await netLogin();
    }
    const out = await netRequest("/api/world/critical-items/maintenance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tick: state.sim.tick >>> 0,
        world_items: collectWorldItemsForMaintenance()
      })
    }, true);
    const events = Array.isArray(out?.events) ? out.events : [];
    state.net.recoveryEventCount += events.length;
    state.net.lastMaintenanceTick = state.sim.tick >>> 0;
    updateCriticalRecoveryStat();
    if (!silent) {
      diagBox.className = "diag ok";
      diagBox.textContent = events.length
        ? `Critical maintenance emitted ${events.length} recovery event(s).`
        : "Critical maintenance check complete (no recoveries needed).";
    }
    setNetStatus("online", events.length
      ? `Maintenance recovered ${events.length} item(s)`
      : "Maintenance check complete");
    return events;
  } finally {
    state.net.maintenanceInFlight = false;
  }
}

async function netSendPresenceHeartbeat() {
  if (!isNetAuthenticated() || !state.sessionStarted) {
    return;
  }
  await netRequest("/api/world/presence/heartbeat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      session_id: state.net.sessionId,
      character_name: state.net.characterName || "Avatar",
      map_x: state.sim.world.map_x | 0,
      map_y: state.sim.world.map_y | 0,
      map_z: state.sim.world.map_z | 0,
      facing_dx: state.avatarFacingDx | 0,
      facing_dy: state.avatarFacingDy | 0,
      tick: state.sim.tick >>> 0,
      mode: state.movementMode
    })
  }, true);
}

async function netPollPresence() {
  if (!isNetAuthenticated()) {
    state.net.remotePlayers = [];
    return;
  }
  if (state.net.presencePollInFlight) {
    return;
  }
  state.net.presencePollInFlight = true;
  try {
    const out = await netRequest("/api/world/presence", { method: "GET" }, true);
    const players = Array.isArray(out?.players) ? out.players : [];
    state.net.remotePlayers = players.filter((p) => {
      const sameSession = String(p.session_id || "") === String(state.net.sessionId || "");
      return !sameSession;
    });
  } finally {
    state.net.presencePollInFlight = false;
  }
}

function initNetPanel() {
  let savedBase = "http://127.0.0.1:8081";
  let savedUser = "avatar";
  let savedChar = "Avatar";
  let savedMaintenance = "off";
  try {
    savedBase = localStorage.getItem(NET_API_BASE_KEY) || savedBase;
    savedUser = localStorage.getItem(NET_USERNAME_KEY) || savedUser;
    savedChar = localStorage.getItem(NET_CHARACTER_NAME_KEY) || savedChar;
    savedMaintenance = localStorage.getItem(NET_MAINTENANCE_KEY) || savedMaintenance;
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  if (netApiBaseInput) {
    netApiBaseInput.value = savedBase;
  }
  if (netUsernameInput) {
    netUsernameInput.value = savedUser;
  }
  if (netCharacterNameInput) {
    netCharacterNameInput.value = savedChar;
  }
  state.net.apiBase = savedBase;
  state.net.username = savedUser;
  state.net.characterName = savedChar;
  setNetStatus("idle", "Not logged in.");
  state.net.maintenanceAuto = savedMaintenance === "on";
  if (netMaintenanceToggle) {
    netMaintenanceToggle.value = state.net.maintenanceAuto ? "on" : "off";
    netMaintenanceToggle.addEventListener("change", () => {
      state.net.maintenanceAuto = netMaintenanceToggle.value === "on";
      try {
        localStorage.setItem(NET_MAINTENANCE_KEY, state.net.maintenanceAuto ? "on" : "off");
      } catch (_err) {
        // ignore storage failures in restrictive browser contexts
      }
    });
  }
  updateNetSessionStat();
  updateCriticalRecoveryStat();

  if (netLoginButton) {
    netLoginButton.addEventListener("click", async () => {
      try {
        await netLogin();
        diagBox.className = "diag ok";
        diagBox.textContent = `Net login ok: ${state.net.username}/${state.net.characterName}`;
      } catch (err) {
        setNetStatus("error", `Login failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Net login failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netRecoverButton) {
    netRecoverButton.addEventListener("click", async () => {
      try {
        const out = await netRecoverPassword();
        diagBox.className = "diag ok";
        diagBox.textContent = `Recovered password for ${out?.user?.username || "user"}.`;
      } catch (err) {
        setNetStatus("error", `Recovery failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Password recovery failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netSaveButton) {
    netSaveButton.addEventListener("click", async () => {
      try {
        await netSaveSnapshot();
        updateNetSessionStat();
        diagBox.className = "diag ok";
        diagBox.textContent = `Remote snapshot saved at tick ${state.sim.tick >>> 0}.`;
      } catch (err) {
        setNetStatus("error", `Save failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Remote save failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netLoadButton) {
    netLoadButton.addEventListener("click", async () => {
      try {
        const out = await netLoadSnapshot();
        updateNetSessionStat();
        diagBox.className = "diag ok";
        diagBox.textContent = `Remote snapshot loaded at tick ${Number(out?.snapshot_meta?.saved_tick || 0)}.`;
      } catch (err) {
        setNetStatus("error", `Load failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Remote load failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netRenameButton) {
    netRenameButton.addEventListener("click", async () => {
      try {
        const out = await netRenameUsername();
        diagBox.className = "diag ok";
        diagBox.textContent = `Renamed ${out?.old_username || "user"} to ${state.net.username}.`;
      } catch (err) {
        setNetStatus("error", `Rename failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Rename failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netMaintenanceButton) {
    netMaintenanceButton.addEventListener("click", async () => {
      try {
        await netRunCriticalMaintenance({ silent: false });
      } catch (err) {
        setNetStatus("error", `Maintenance failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Critical maintenance failed: ${String(err.message || err)}`;
      }
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

function setMovementMode(mode) {
  const next = mode === "avatar" ? "avatar" : "ghost";
  state.movementMode = next;
  if (movementModeToggle) {
    movementModeToggle.value = next;
  }
  if (statAvatarState) {
    statAvatarState.textContent = next === "avatar" ? "avatar" : "ghost";
  }
  try {
    localStorage.setItem(MOVEMENT_MODE_KEY, next);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initMovementMode() {
  let saved = "avatar";
  try {
    const fromStorage = localStorage.getItem(MOVEMENT_MODE_KEY);
    if (fromStorage === "avatar" || fromStorage === "ghost") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setMovementMode(saved);
  if (movementModeToggle) {
    movementModeToggle.addEventListener("change", () => {
      setMovementMode(movementModeToggle.value);
    });
  }
}

function setRenderMode(mode) {
  const next = RENDER_MODES.includes(mode) ? mode : "current";
  state.renderMode = next;
  document.documentElement.setAttribute("data-render-mode", next);
  if (renderModeToggle) {
    renderModeToggle.value = next;
  }
  try {
    localStorage.setItem(RENDER_MODE_KEY, next);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initRenderMode() {
  let saved = "current";
  try {
    const fromStorage = localStorage.getItem(RENDER_MODE_KEY);
    if (fromStorage && RENDER_MODES.includes(fromStorage)) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setRenderMode(saved);
  if (renderModeToggle) {
    renderModeToggle.addEventListener("change", () => {
      setRenderMode(renderModeToggle.value);
    });
  }
}

function setLegacyFramePreview(enabled) {
  const on = !!enabled;
  document.documentElement.setAttribute("data-legacy-frame-preview", on ? "on" : "off");
  if (capturePreviewToggle) {
    capturePreviewToggle.value = on ? "on" : "off";
  }
  applyLegacyFrameLayout();
  try {
    localStorage.setItem(LEGACY_FRAME_PREVIEW_KEY, on ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function setLegacyScaleMode(mode) {
  const next = isLegacyScaleMode(mode) ? mode : "fit";
  state.legacyScaleMode = next;
  if (legacyScaleModeToggle) {
    legacyScaleModeToggle.value = next;
  }
  try {
    localStorage.setItem(LEGACY_SCALE_MODE_KEY, next);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  applyLegacyFrameLayout();
}

function cycleLegacyScaleMode(step) {
  const current = isLegacyScaleMode(state.legacyScaleMode) ? state.legacyScaleMode : "fit";
  const idx = LEGACY_SCALE_MODES.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const nextIdx = (base + step + LEGACY_SCALE_MODES.length) % LEGACY_SCALE_MODES.length;
  setLegacyScaleMode(LEGACY_SCALE_MODES[nextIdx]);
}

function initLegacyScaleMode() {
  let saved = "4";
  try {
    const fromStorage = localStorage.getItem(LEGACY_SCALE_MODE_KEY);
    if (isLegacyScaleMode(fromStorage)) {
      saved = fromStorage;
    } else if (fromStorage === "native") {
      saved = "4";
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLegacyScaleMode(saved);
  if (legacyScaleModeToggle) {
    legacyScaleModeToggle.addEventListener("change", () => {
      setLegacyScaleMode(legacyScaleModeToggle.value);
    });
  }
}

function initLegacyFramePreview() {
  let saved = "on";
  try {
    const fromStorage = localStorage.getItem(LEGACY_FRAME_PREVIEW_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLegacyFramePreview(saved === "on");
  if (capturePreviewToggle) {
    capturePreviewToggle.addEventListener("change", () => {
      setLegacyFramePreview(capturePreviewToggle.value === "on");
    });
  }
}

function isCloseableDoorObject(obj) {
  return !!obj && OBJECT_TYPES_CLOSEABLE_DOOR.has(obj.type);
}

function doorStateKey(obj) {
  return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff}`;
}

function doorToggleMask(obj) {
  return obj && obj.type === 0x14e ? 1 : 4;
}

function isDoorToggled(sim, obj) {
  if (!isCloseableDoorObject(obj)) {
    return false;
  }
  return !!(sim.doorOpenStates && sim.doorOpenStates[doorStateKey(obj)]);
}

function toggleDoorState(sim, obj) {
  if (!isCloseableDoorObject(obj)) {
    return false;
  }
  if (!sim.doorOpenStates) {
    sim.doorOpenStates = {};
  }
  const key = doorStateKey(obj);
  if (sim.doorOpenStates[key]) {
    delete sim.doorOpenStates[key];
    return false;
  }
  sim.doorOpenStates[key] = 1;
  return true;
}

function resolvedDoorFrame(sim, obj) {
  const frame = obj.frame | 0;
  if (!isCloseableDoorObject(obj)) {
    return frame;
  }
  if (!isDoorToggled(sim, obj)) {
    return frame;
  }
  return frame ^ doorToggleMask(obj);
}

function isDoorFrameOpen(obj, frame) {
  if (!isCloseableDoorObject(obj)) {
    return false;
  }
  if (obj.type === 0x14e) {
    return (frame & 1) !== 0;
  }
  return frame >= 0 && frame < 4;
}

function resolveDoorTileId(sim, obj) {
  const base = obj.baseTile | 0;
  return (base + resolvedDoorFrame(sim, obj)) & 0xffff;
}

function resolveDoorTileIdForVisibility(sim, obj) {
  return resolveDoorTileId(sim, obj);
}

function isBlockedAt(sim, wx, wy, wz) {
  if (!state.mapCtx) {
    return false;
  }
  const t = state.mapCtx.tileAt(wx, wy, wz);
  if (state.tileFlags && ((state.tileFlags[t & 0x07ff] ?? 0) & 0x04)) {
    return true;
  }
  if (state.terrainType && ((state.terrainType[t & 0x07ff] ?? 0) & 0x04)) {
    return true;
  }
  if (state.objectLayer && state.tileFlags) {
    const wrap10 = (v) => v & 0x3ff;
    const tx = wrap10(wx);
    const ty = wrap10(wy);
    const checkObjectBlockAt = (o, ox, oy) => {
      const tileId = resolveDoorTileId(sim, o);
      const tf = state.tileFlags[tileId & 0x07ff] ?? 0;
      const sx = wrap10(ox);
      const sy = wrap10(oy);
      if ((tf & 0x04) !== 0 && sx === tx && sy === ty) {
        return true;
      }
      if ((tf & 0x80) !== 0 && tx === wrap10(sx - 1) && ty === sy) {
        const spill = (tileId - 1) & 0xffff;
        const sf = state.tileFlags[spill & 0x07ff] ?? 0;
        if ((sf & 0x04) !== 0) {
          return true;
        }
      }
      if ((tf & 0x40) !== 0 && tx === sx && ty === wrap10(sy - 1)) {
        const spill = (tileId - 1) & 0xffff;
        const sf = state.tileFlags[spill & 0x07ff] ?? 0;
        if ((sf & 0x04) !== 0) {
          return true;
        }
      }
      if ((tf & 0xc0) === 0xc0 && tx === wrap10(sx - 1) && ty === wrap10(sy - 1)) {
        const spill = (tileId - 3) & 0xffff;
        const sf = state.tileFlags[spill & 0x07ff] ?? 0;
        if ((sf & 0x04) !== 0) {
          return true;
        }
      }
      return false;
    };

    const sources = [
      [wx, wy],         // main tile source
      [wx + 1, wy],     // left spill source
      [wx, wy + 1],     // up spill source
      [wx + 1, wy + 1]  // up-left spill source
    ];
    for (const [ox, oy] of sources) {
      const overlays = state.objectLayer.objectsAt(ox, oy, wz);
      for (const o of overlays) {
        if (!o.renderable) {
          continue;
        }
        if (checkObjectBlockAt(o, ox, oy)) {
          return true;
        }
      }
    }
  }
  if (state.entityLayer && Array.isArray(state.entityLayer.entries)) {
    for (const e of state.entityLayer.entries) {
      if (e.z !== wz) {
        continue;
      }
      if (e.x !== wx || e.y !== wy) {
        continue;
      }
      if (e.id === AVATAR_ENTITY_ID) {
        continue;
      }
      return true;
    }
  }
  return false;
}

function tryToggleDoorInFacingDirection(sim, dx, dy) {
  if (!state.objectLayer) {
    return false;
  }
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  const tz = sim.world.map_z | 0;
  const overlays = state.objectLayer.objectsAt(tx, ty, tz);
  for (const o of overlays) {
    if (!isCloseableDoorObject(o)) {
      continue;
    }
    const beforeFrame = resolvedDoorFrame(sim, o);
    const beforeOpen = isDoorFrameOpen(o, beforeFrame);
    toggleDoorState(sim, o);
    const afterFrame = resolvedDoorFrame(sim, o);
    const afterOpen = isDoorFrameOpen(o, afterFrame);
    diagBox.className = "diag ok";
    diagBox.textContent = afterOpen && !beforeOpen
      ? `Opened door at ${tx},${ty},${tz}`
      : (!afterOpen && beforeOpen
        ? `Closed door at ${tx},${ty},${tz}`
        : `Toggled door at ${tx},${ty},${tz}`);
    return true;
  }
  return false;
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

function setStartupMenuIndex(nextIndex) {
  if (!STARTUP_MENU.length) {
    state.startupMenuIndex = 0;
    return;
  }
  const count = STARTUP_MENU.length;
  let idx = nextIndex | 0;
  if (idx < 0) {
    idx = count - 1;
  } else if (idx >= count) {
    idx = 0;
  }
  if (state.startupMenuIndex !== idx) {
    state.startupCanvasCache.clear();
  }
  state.startupMenuIndex = idx;
}

function isNetAuthenticated() {
  return !!(state.net && state.net.token && state.net.userId);
}

function startupMenuItemEnabled(item) {
  if (!item) {
    return false;
  }
  if (!item.enabled) {
    return false;
  }
  if (item.id === "journey") {
    return isNetAuthenticated();
  }
  return true;
}

function activateStartupMenuSelection() {
  if (!STARTUP_MENU.length) {
    return;
  }
  const selected = STARTUP_MENU[state.startupMenuIndex] || STARTUP_MENU[0];
  if (!selected || !startupMenuItemEnabled(selected)) {
    if (selected && selected.id === "journey" && !isNetAuthenticated()) {
      setNetStatus("idle", "Login required before Journey Onward.");
      diagBox.className = "diag warn";
      diagBox.textContent = "Login required before Journey Onward.";
      return;
    }
    diagBox.className = "diag warn";
    diagBox.textContent = `"${selected ? selected.label : "This option"}" is not available in this build.`;
    return;
  }
  if (selected.id === "journey") {
    startSessionFromTitle();
  }
}

function placeCameraAtPresetId(presetId) {
  const p = CAPTURE_PRESETS.find((v) => v.id === presetId) ?? CAPTURE_PRESETS[0];
  if (!p) {
    return;
  }
  state.queue.length = 0;
  state.sim.world.map_x = p.x | 0;
  state.sim.world.map_y = p.y | 0;
  state.sim.world.map_z = p.z | 0;
  if (locationSelect) {
    locationSelect.value = p.id;
  }
}

function startSessionFromTitle() {
  if (state.sessionStarted) {
    return;
  }
  if (!isNetAuthenticated()) {
    setNetStatus("idle", "Login required before Journey Onward.");
    diagBox.className = "diag warn";
    diagBox.textContent = "Login required before Journey Onward.";
    return;
  }
  if (!state.runtimeReady) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Runtime assets are still loading.";
    return;
  }
  placeCameraAtPresetId("lb_throne");
  state.sessionStarted = true;
  diagBox.className = "diag ok";
  diagBox.textContent = "Journey Onward: loaded into Lord British's throne room.";
}

function returnToTitleMenu() {
  if (!state.sessionStarted) {
    return;
  }
  state.queue.length = 0;
  state.sessionStarted = false;
  setStartupMenuIndex(0);
  diagBox.className = "diag ok";
  diagBox.textContent = "Returned to title menu.";
}

function cycleCursor(delta) {
  if (!state.cursorPixmaps || !state.cursorPixmaps.length) {
    return;
  }
  const n = state.cursorPixmaps.length;
  let idx = (state.cursorIndex + (delta | 0)) % n;
  if (idx < 0) {
    idx += n;
  }
  state.cursorIndex = idx;
  diagBox.className = "diag ok";
  diagBox.textContent = `Cursor ${idx + 1}/${n}`;
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
  const composeCapture = () => {
    const margin = 14;
    const gap = 12;
    const frameBorder = 14;
    const panelW = 352;
    const worldW = canvas.width;
    const worldH = canvas.height;
    const frameW = worldW + (frameBorder * 2);
    const frameH = worldH + (frameBorder * 2);
    const outW = (margin * 2) + frameW + gap + panelW + 8;
    const outH = (margin * 2) + Math.max(frameH, 742);

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;

    const frameX = margin;
    const frameY = margin;
    const panelX = frameX + frameW + gap;
    const panelY = margin;

    g.fillStyle = "#070707";
    g.fillRect(0, 0, outW, outH);

    /* World frame: old-school beveled panel */
    g.fillStyle = "#c7b17f";
    g.fillRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8);
    g.fillStyle = "#7a6946";
    g.fillRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4);
    g.fillStyle = "#3f3522";
    g.fillRect(frameX, frameY, frameW, frameH);
    g.fillStyle = "#101010";
    g.fillRect(frameX + frameBorder, frameY + frameBorder, worldW, worldH);
    g.drawImage(canvas, frameX + frameBorder, frameY + frameBorder, worldW, worldH);

    /* Right-side info panel with U6-like dark blue ledger look */
    const panelH = outH - (margin * 2);
    g.fillStyle = "#c7b17f";
    g.fillRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8);
    g.fillStyle = "#7a6946";
    g.fillRect(panelX - 2, panelY - 2, panelW + 4, panelH + 4);
    g.fillStyle = "#111a2a";
    g.fillRect(panelX, panelY, panelW, panelH);

    const headerH = 54;
    g.fillStyle = "#1a2740";
    g.fillRect(panelX + 2, panelY + 2, panelW - 4, headerH);
    g.fillStyle = "#2e4469";
    g.fillRect(panelX + 2, panelY + headerH + 4, panelW - 4, 1);

    const textX = panelX + 14;
    let y = panelY + 22;
    g.fillStyle = "#f0d69d";
    g.font = "700 13px Silkscreen, monospace";
    g.fillText("VIRTUE MACHINE", textX, y);
    y += 16;
    g.fillStyle = "#bed0ee";
    g.font = "11px Inter, sans-serif";
    g.fillText("Ultima VI parity capture", textX, y);
    y += 15;
    g.fillStyle = "#8ea8cf";
    g.fillText(`mode: ${state.renderMode}`, textX, y);
    y = panelY + headerH + 24;

    const drawRow = (label, value) => {
      g.fillStyle = "#7f99bd";
      g.font = "11px Inter, sans-serif";
      g.fillText(label, textX, y);
      y += 13;
      g.fillStyle = "#e8f1ff";
      g.font = "700 11px Inter, sans-serif";
      g.fillText(String(value ?? "-"), textX, y);
      y += 15;
    };

    drawRow("Map Position", statPos ? statPos.textContent : "-");
    drawRow("Clock", statClock ? statClock.textContent : "-");
    drawRow("Date", statDate ? statDate.textContent : "-");
    drawRow("Tile", statTile ? statTile.textContent : "-");
    drawRow("Render Parity", statRenderParity ? statRenderParity.textContent : "-");
    drawRow("Object Overlay", statObjects ? statObjects.textContent : "-");
    drawRow("Entity Overlay", statEntities ? statEntities.textContent : "-");
    drawRow("Data Source", statSource ? statSource.textContent : "-");
    drawRow("State Hash", statHash ? statHash.textContent : "-");

    if (diagBox && diagBox.textContent) {
      y += 6;
      g.fillStyle = "#2e4469";
      g.fillRect(panelX + 10, y - 3, panelW - 20, 1);
      y += 12;
      g.fillStyle = "#7f99bd";
      g.font = "11px Inter, sans-serif";
      g.fillText("Diagnostic", textX, y);
      y += 13;
      g.fillStyle = "#d8e4f5";
      g.font = "11px Inter, sans-serif";
      const raw = diagBox.textContent.trim();
      const line = raw.length > 72 ? `${raw.slice(0, 69)}...` : raw;
      g.fillText(line, textX, y);
    }

    return out;
  };

  const p = activeCapturePreset();
  const tag = p ? p.id : "custom";
  const filename = `virtuemachine-${tag}-${state.sim.world.map_x}-${state.sim.world.map_y}-${state.sim.world.map_z}.png`;
  const link = document.createElement("a");
  const composed = composeCapture();
  link.href = composed.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  diagBox.className = "diag ok";
  diagBox.textContent = `Captured ${filename}`;
}

function captureWorldHudPng() {
  drawTileGrid();
  composeLegacyViewportFromModernGrid();
  renderLegacyHudStubOnBackdrop();

  const p = activeCapturePreset();
  const tag = p ? p.id : "custom";
  const filename = `virtuemachine-worldhud-${tag}-${state.sim.world.map_x}-${state.sim.world.map_y}-${state.sim.world.map_z}.png`;
  const out = document.createElement("canvas");

  if (legacyBackdropCanvas && legacyBackdropCanvas.width > 0 && legacyBackdropCanvas.height > 0) {
    out.width = 320;
    out.height = 200;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(
      legacyBackdropCanvas,
      0,
      0,
      legacyBackdropCanvas.width,
      legacyBackdropCanvas.height,
      0,
      0,
      320,
      200
    );

    const dx = LEGACY_UI_MAP_RECT.x;
    const dy = LEGACY_UI_MAP_RECT.y;
    const dw = LEGACY_UI_MAP_RECT.w;
    const dh = LEGACY_UI_MAP_RECT.h;
    if (legacyViewportCanvas && legacyViewportCanvas.width > 0 && legacyViewportCanvas.height > 0) {
      g.drawImage(
        legacyViewportCanvas,
        0,
        0,
        legacyViewportCanvas.width,
        legacyViewportCanvas.height,
        dx,
        dy,
        dw,
        dh
      );
    }
  } else {
    out.width = 320;
    out.height = 200;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 320, 200);
  }

  const link = document.createElement("a");
  link.href = out.toDataURL("image/png");
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
    doorOpenStates: { ...(sim.doorOpenStates ?? {}) },
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
    const nx = clampI32(sim.world.map_x + cmd.arg0, -4096, 4095);
    const ny = clampI32(sim.world.map_y + cmd.arg1, -4096, 4095);
    if (state.movementMode === "avatar") {
      if (!isBlockedAt(sim, nx, ny, sim.world.map_z)) {
        sim.world.map_x = nx;
        sim.world.map_y = ny;
        state.avatarLastMoveTick = sim.tick >>> 0;
      }
    } else {
      sim.world.map_x = nx;
      sim.world.map_y = ny;
    }
  } else if (cmd.type === 2) {
    if (state.movementMode === "avatar") {
      tryToggleDoorInFacingDirection(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
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
  const doorKeys = Object.keys(sim.doorOpenStates ?? {}).sort();
  h = hashMixU32(h, doorKeys.length);
  for (const k of doorKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32(h, k.charCodeAt(i));
    }
    h = hashMixU32(h, sim.doorOpenStates[k] ? 1 : 0);
  }
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
  dx |= 0;
  dy |= 0;
  const nowMs = performance.now();
  const sameAsLast = (dx === state.lastMoveInputDx) && (dy === state.lastMoveInputDy);
  if (sameAsLast && state.lastMoveQueueAtMs >= 0 && (nowMs - state.lastMoveQueueAtMs) < MOVE_INPUT_MIN_INTERVAL_MS) {
    return;
  }
  state.lastMoveQueueAtMs = nowMs;
  state.lastMoveInputDx = dx;
  state.lastMoveInputDy = dy;
  state.avatarFacingDx = dx;
  state.avatarFacingDy = dy;
  const targetTick = (state.sim.tick + 1) >>> 0;
  const bytes = packCommand(targetTick, 1, dx, dy);
  const cmd = unpackCommand(bytes);

  // Keep exactly one pending move command so repeated key events cannot stack.
  for (let i = state.queue.length - 1; i >= 0; i -= 1) {
    if (state.queue[i].type === 1 && state.queue[i].tick === targetTick) {
      if (state.queue[i].arg0 === dx && state.queue[i].arg1 === dy) {
        return;
      }
      state.queue[i] = cmd;
      for (let j = state.commandLog.length - 1; j >= 0; j -= 1) {
        const prev = state.commandLog[j];
        if (prev.type === 1 && prev.tick === targetTick) {
          state.commandLog.splice(j, 1);
          break;
        }
      }
      state.commandLog.push({ ...cmd });
      return;
    }
  }

  for (let i = state.queue.length - 1; i >= 0; i -= 1) {
    if (state.queue[i].type === 1) {
      state.queue.splice(i, 1);
    }
  }

  state.queue.push(cmd);
  state.commandLog.push({ ...cmd });
}

function queueInteractDoor() {
  if (state.movementMode !== "avatar") {
    return;
  }
  const bytes = packCommand(state.sim.tick + 1, 2, state.avatarFacingDx | 0, state.avatarFacingDy | 0);
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
          const tileId = resolveDoorTileIdForVisibility(state.sim, o);
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

function stableCornerVariant(rawTile, wx, wy, wz, viewCtx) {
  const terrainLow = terrainOf(rawTile) & 0x0f;
  if (terrainLow !== (0x04 | 0x02)) {
    return rawTile;
  }
  if (viewCtx) {
    const fullyVisible = (
      viewCtx.visibleAtWorld(wx, wy)
      && viewCtx.visibleAtWorld(wx, wy - 1)
      && viewCtx.visibleAtWorld(wx + 1, wy)
      && viewCtx.visibleAtWorld(wx, wy + 1)
      && viewCtx.visibleAtWorld(wx - 1, wy)
    );
    if (!fullyVisible) {
      return rawTile;
    }
  }
  const key = `${wz}:${wx}:${wy}:${rawTile & 0xffff}`;
  const cached = state.cornerVariantCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const resolved = applyLegacyCornerVariant(rawTile, wx, wy, wz, viewCtx) & 0xffff;
  state.cornerVariantCache.set(key, resolved);
  return resolved;
}

function buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx) {
  const rawTiles = new Uint16Array(VIEW_W * VIEW_H);
  const displayTiles = new Uint16Array(VIEW_W * VIEW_H);
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      let rawTile = 0;
      let displayTile = 0;
      if (state.mapCtx) {
        rawTile = state.mapCtx.tileAt(wx, wy, wz) & 0xffff;
        displayTile = rawTile;
        if (shouldBlackoutTile(rawTile, wx, wy, viewCtx)) {
          rawTile = 0x0ff;
          displayTile = 0x0ff;
        } else {
          displayTile = stableCornerVariant(displayTile, wx, wy, wz, viewCtx);
        }
      } else {
        rawTile = (wx * 7 + wy * 13) & 0xff;
        displayTile = rawTile;
      }
      const idx = cellIndex(gx, gy);
      rawTiles[idx] = rawTile & 0xffff;
      displayTiles[idx] = displayTile & 0xffff;
    }
  }
  return { rawTiles, displayTiles };
}

function applyNuvieBoundaryReshape(displayTiles, startX, startY) {
  const debug = {
    reshapedTiles: 0,
    cornerSubs: 0
  };
  const inView = (gx, gy) => gx >= 0 && gy >= 0 && gx < VIEW_W && gy < VIEW_H;
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  const isBlack = (gx, gy) => !inView(gx, gy) || (displayTiles[cellIndex(gx, gy)] & 0xffff) === 0x0ff;

  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const idx = cellIndex(gx, gy);
      const tile = displayTiles[idx] & 0xffff;
      if (tile === 0x0ff) {
        continue;
      }
      if (tile < 140 || tile > 187) {
        continue;
      }

      const blackN = isBlack(gx, gy - 1);
      const blackE = isBlack(gx + 1, gy);
      const blackS = isBlack(gx, gy + 1);
      const blackW = isBlack(gx - 1, gy);
      if (!(blackN || blackE || blackS || blackW)) {
        continue;
      }

      /* Temporarily disabled while we rebuild parity from fixtures.
         Keep diagnostics path active but do not mutate tiles here. */
    }
  }
  return debug;
}

function buildBaseTileBuffersNuvie(startX, startY, wz, viewCtx) {
  const base = buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx);
  let blackTiles = 0;
  for (let i = 0; i < base.displayTiles.length; i += 1) {
    if ((base.displayTiles[i] & 0xffff) === 0x0ff) {
      blackTiles += 1;
    }
  }
  const reshapeDebug = applyNuvieBoundaryReshape(base.displayTiles, startX, startY);
  base.debug = {
    blackTiles,
    ...reshapeDebug
  };
  return base;
}

function buildBaseTileBuffers(startX, startY, wz, viewCtx) {
  if (state.renderMode === "nuvie") {
    return buildBaseTileBuffersNuvie(startX, startY, wz, viewCtx);
  }
  const base = buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx);
  base.debug = null;
  return base;
}

function shouldSuppressOverlayNuvie(entry, gx, gy, displayTiles) {
  void entry;
  void gx;
  void gy;
  void displayTiles;
  return false;
}

function avatarFacingFrameOffset() {
  if (state.avatarFacingDy < 0) return 0;
  if (state.avatarFacingDx > 0) return 1;
  if (state.avatarFacingDy > 0) return 2;
  return 3;
}

function avatarRenderTileId() {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  const walkMoving = state.avatarLastMoveTick >= 0 && ((state.sim.tick - state.avatarLastMoveTick) & 0xff) < 4;
  const dirGroup = avatarFacingFrameOffset();
  let frame = avatar.frame | 0;
  /* Legacy actor classes (OBJ_178..183 and OBJ_199..19A) use 4 frames per direction:
     dir*4 + {0,1,2,3}, with 1 as stable standing frame. */
  if (
    (avatar.type >= 0x178 && avatar.type <= 0x183)
    || (avatar.type >= 0x199 && avatar.type <= 0x19a)
  ) {
    const step = walkMoving ? (((state.sim.tick >> 1) & 1) ? 0 : 2) : 1;
    frame = (dirGroup << 2) + step;
  } else {
    /* Fallback for simpler actor frame families: two-frame directional groups. */
    const step = walkMoving ? ((state.sim.tick >> 1) & 1) : 0;
    frame = (dirGroup << 1) + step;
  }
  return (avatar.baseTile + frame) & 0xffff;
}

function avatarBaseTileId() {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  return avatar.baseTile & 0xffff;
}

function directionGroupFromDxDy(dx, dy) {
  if ((dy | 0) < 0) return 0;
  if ((dx | 0) > 0) return 1;
  if ((dy | 0) > 0) return 2;
  return 3;
}

function remotePlayerTileId(player) {
  const base = avatarBaseTileId();
  if (base == null) {
    return null;
  }
  const dirGroup = directionGroupFromDxDy(player.facing_dx | 0, player.facing_dy | 0);
  const frame = (dirGroup << 2) + 1;
  return (base + frame) & 0xffff;
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

function renderCharacterStubPanel() {
  if (!charStubCanvas) {
    return;
  }
  const g = charStubCanvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, charStubCanvas.width, charStubCanvas.height);
  g.fillStyle = "#090909";
  g.fillRect(0, 0, charStubCanvas.width, charStubCanvas.height);

  const slots = [
    { x: 8, y: 8, w: 76, h: 96 },
    { x: 90, y: 8, w: 76, h: 96 },
    { x: 172, y: 8, w: 76, h: 96 },
    { x: 254, y: 8, w: 76, h: 96 }
  ];
  for (const s of slots) {
    g.fillStyle = "#111827";
    g.fillRect(s.x, s.y, s.w, s.h);
    g.strokeStyle = "#334155";
    g.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
  }

  if (!state.tileSet || !state.entityLayer || !Array.isArray(state.entityLayer.entries)) {
    g.fillStyle = "#94a3b8";
    g.font = "11px var(--vm-ui-font), monospace";
    g.fillText("Awaiting actor sprite data...", 12, 22);
    return;
  }

  const avatarTile = avatarRenderTileId();
  const px = state.sim.world.map_x | 0;
  const py = state.sim.world.map_y | 0;
  const pz = state.sim.world.map_z | 0;
  const tick = animationTick();
  const nearest = state.entityLayer.entries
    .filter((e) => e.z === pz && e.id !== AVATAR_ENTITY_ID)
    .map((e) => ({
      ...e,
      dist: Math.abs((e.x | 0) - px) + Math.abs((e.y | 0) - py)
    }))
    .sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.id - b.id;
    })
    .slice(0, 3);

  const picks = [{ label: "AVATAR", tileId: avatarTile }];
  for (const e of nearest) {
    const t = resolveAnimatedObjectTileAtTick(
      { ...e, tileId: (e.baseTile + (e.frame | 0)) & 0xffff },
      tick
    );
    picks.push({ label: `NPC ${e.id}`, tileId: t });
  }
  while (picks.length < 4) {
    picks.push({ label: "EMPTY", tileId: null });
  }

  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    const pick = picks[i];
    g.fillStyle = "#9ca3af";
    g.font = "10px var(--vm-ui-font), monospace";
    g.fillText(pick.label, slot.x + 6, slot.y + 12);
    if (pick.tileId == null) {
      continue;
    }
    const pal = paletteForTile(pick.tileId);
    const key = paletteKeyForTile(pick.tileId);
    const tc = state.tileSet.tileCanvas(pick.tileId, pal, key);
    if (!tc) {
      continue;
    }
    const scale = 3;
    const dw = 16 * scale;
    const dh = 16 * scale;
    const dx = slot.x + Math.floor((slot.w - dw) / 2);
    const dy = slot.y + 20;
    g.drawImage(tc, 0, 0, 16, 16, dx, dy, dw, dh);
    g.fillStyle = "#64748b";
    g.font = "9px var(--vm-ui-font), monospace";
    g.fillText(`0x${(pick.tileId & 0xffff).toString(16)}`, slot.x + 6, slot.y + slot.h - 8);
  }
}

function buildOverlayCells(startX, startY, wz, viewCtx) {
  return buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx,
    objectLayer: state.tileSet ? state.objectLayer : null,
    tileFlags: state.tileFlags,
    resolveAnimatedObjectTile,
    hasWallTerrain
  });
}

function topInteractiveOverlayAt(overlayCells, startX, startY, wx, wy) {
  return topInteractiveOverlayAtModel(overlayCells, VIEW_W, VIEW_H, startX, startY, wx, wy);
}

function measureActorOcclusionParity(overlayCells, startX, startY, viewCtx, entities) {
  return measureActorOcclusionParityModel(overlayCells, VIEW_W, VIEW_H, startX, startY, viewCtx, entities);
}

function drawTileGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0f13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!state.sessionStarted) {
    renderStartupScreen();
    statTile.textContent = "startup";
    return;
  }

  const startX = state.sim.world.map_x - (VIEW_W >> 1);
  const startY = state.sim.world.map_y - (VIEW_H >> 1);
  const renderPalette = getRenderPalette();
  const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
  const { rawTiles: baseRawTiles, displayTiles: baseDisplayTiles, debug: baseDebug } = buildBaseTileBuffers(startX, startY, state.sim.world.map_z, viewCtx);
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
  let nuvieOverlaySuppressed = 0;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const cell = cellIndex(gx, gy);
      const rawTile = baseRawTiles[cell] & 0xffff;
      const t = baseDisplayTiles[cell] & 0xffff;
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
          if (state.renderMode === "nuvie" && shouldSuppressOverlayNuvie(t, gx, gy, baseDisplayTiles)) {
            nuvieOverlaySuppressed += 1;
            continue;
          }
          if (!t.occluder) {
            drawOverlayEntry(t, px, py);
          }
        }
      }
    }
  }
  const entities = (state.tileSet && state.entityLayer)
    ? state.entityLayer.entitiesInView(startX, startY, state.sim.world.map_z, VIEW_W, VIEW_H)
    : [];
  if (state.tileSet && state.entityLayer) {
    for (const e of entities) {
      if (viewCtx && !viewCtx.visibleAtWorld(e.x, e.y)) {
        continue;
      }
      if (state.movementMode === "avatar" && e.id === AVATAR_ENTITY_ID) {
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
  }
  if (state.tileSet && state.movementMode === "avatar") {
    const avatarTile = avatarRenderTileId();
    if (avatarTile != null) {
      drawEntityTile(avatarTile, VIEW_W >> 1, VIEW_H >> 1);
      entityCount += 1;
    }
  }
  if (state.sessionStarted && Array.isArray(state.net.remotePlayers)) {
    for (const p of state.net.remotePlayers) {
      const pxw = Number(p.map_x) | 0;
      const pyw = Number(p.map_y) | 0;
      const pzw = Number(p.map_z) | 0;
      if (pzw !== (state.sim.world.map_z | 0)) {
        continue;
      }
      if (viewCtx && !viewCtx.visibleAtWorld(pxw, pyw)) {
        continue;
      }
      const gx = pxw - startX;
      const gy = pyw - startY;
      if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
        continue;
      }
      const tileId = remotePlayerTileId(p);
      if (tileId != null && state.tileSet) {
        drawEntityTile(tileId, gx, gy);
      } else {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        ctx.fillStyle = "rgba(80, 240, 255, 0.85)";
        ctx.fillRect(px + 18, py + 18, TILE_SIZE - 36, TILE_SIZE - 36);
      }
      const label = String(p.username || "?").slice(0, 8);
      const lx = (gx * TILE_SIZE) + 4;
      const ly = (gy * TILE_SIZE) + 12;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(lx - 2, ly - 10, (label.length * 7) + 4, 12);
      ctx.fillStyle = "#9cf6ff";
      ctx.font = "10px monospace";
      ctx.fillText(label, lx, ly - 1);
      entityCount += 1;
    }
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
  state.renderParityMismatches = overlayBuild.parity.unsortedSourceCount + actorOcclusionMismatch;

  if (!state.tileSet) {
    state.interactionProbeTile = null;
    state.renderParityMismatches = 0;
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
  state.renderModeDebug = state.renderMode === "nuvie"
    ? {
      blackTiles: baseDebug ? baseDebug.blackTiles : 0,
      reshapedTiles: baseDebug ? baseDebug.reshapedTiles : 0,
      cornerSubs: baseDebug ? baseDebug.cornerSubs : 0,
      overlaySuppressed: nuvieOverlaySuppressed
    }
    : null;

  const cx = (VIEW_W >> 1) * TILE_SIZE;
  const cy = (VIEW_H >> 1) * TILE_SIZE;
  if (state.movementMode === "ghost" || !state.tileSet) {
    ctx.strokeStyle = "#f1f3f5";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 2, cy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }

  renderCharacterStubPanel();
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
      statRenderParity.textContent = `warn (${state.renderParityMismatches}) [${state.renderMode}]`;
    } else if (state.interactionProbeTile != null) {
      statRenderParity.textContent = `ok (probe 0x${state.interactionProbeTile.toString(16)}) [${state.renderMode}]`;
    } else {
      statRenderParity.textContent = `ok [${state.renderMode}]`;
    }
  }
  if (statAvatarState) {
    const facing = state.avatarFacingDx < 0 ? "W"
      : state.avatarFacingDx > 0 ? "E"
        : state.avatarFacingDy < 0 ? "N" : "S";
    statAvatarState.textContent = state.movementMode === "avatar"
      ? `avatar (${facing})`
      : "ghost";
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
    if (state.renderMode === "nuvie" && state.renderModeDebug) {
      const d = state.renderModeDebug;
      statCenterBand.textContent = `${state.centerPaletteBand} | b:${d.blackTiles} r:${d.reshapedTiles} c:${d.cornerSubs} o:${d.overlaySuppressed}`;
    } else {
      statCenterBand.textContent = state.centerPaletteBand;
    }
  }
  if (statNetPlayers) {
    const remote = Array.isArray(state.net.remotePlayers) ? state.net.remotePlayers.length : 0;
    statNetPlayers.textContent = String(1 + remote);
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
  state.renderModeDebug = null;
  state.renderParityMismatches = 0;
  state.interactionProbeTile = null;
  state.avatarLastMoveTick = -1;
  state.lastMoveQueueAtMs = -1;
  state.lastMoveInputDx = 0;
  state.lastMoveInputDy = 1;
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
  const useCustomCursor = !!(state.cursorPixmaps && state.cursorPixmaps.length > 0);
  canvas.style.cursor = useCustomCursor ? "none" : "default";
  if (legacyBackdropCanvas) {
    legacyBackdropCanvas.style.cursor = useCustomCursor ? "none" : "default";
  }
  if (legacyViewportCanvas) {
    legacyViewportCanvas.style.cursor = useCustomCursor ? "none" : "default";
    legacyViewportCanvas.style.visibility = state.sessionStarted ? "visible" : "hidden";
    legacyViewportCanvas.style.pointerEvents = "none";
  }

  while (state.sessionStarted && state.accMs >= TICK_MS) {
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
    if (
      isNetAuthenticated()
      && state.sessionStarted
      && (state.sim.tick - state.net.lastPresenceHeartbeatTick) >= NET_PRESENCE_HEARTBEAT_TICKS
    ) {
      state.net.lastPresenceHeartbeatTick = state.sim.tick >>> 0;
      netSendPresenceHeartbeat().catch((err) => {
        setNetStatus("error", `Presence heartbeat failed: ${String(err.message || err)}`);
      });
    }
    if (
      isNetAuthenticated()
      && (state.sim.tick - state.net.lastPresencePollTick) >= NET_PRESENCE_POLL_TICKS
    ) {
      state.net.lastPresencePollTick = state.sim.tick >>> 0;
      netPollPresence().catch((err) => {
        setNetStatus("error", `Presence poll failed: ${String(err.message || err)}`);
      });
    }
    if (
      state.net.maintenanceAuto
      && state.net.token
      && !state.net.maintenanceInFlight
      && (state.sim.tick % 120) === 0
      && state.sim.tick !== state.net.lastMaintenanceTick
    ) {
      netRunCriticalMaintenance({ silent: true }).catch((err) => {
        setNetStatus("error", `Maintenance failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Critical maintenance failed: ${String(err.message || err)}`;
      });
    }
  }

  drawTileGrid();
  if (state.sessionStarted) {
    composeLegacyViewportFromModernGrid();
    renderLegacyHudStubOnBackdrop();
  }
  drawCustomCursorLayer();
  updateStats();
  requestAnimationFrame(tickLoop);
}

async function loadRuntimeAssets() {
  const required = ["map", "chunks"];
  const missing = [];

  try {
    state.cornerVariantCache.clear();
    for (const name of required) {
      const res = await fetch(`../assets/runtime/${name}`);
      if (!res.ok) {
        missing.push(name);
      }
    }
    if (missing.length) {
      throw new Error(`missing ${missing.join(", ")}`);
    }

    const [mapRes, chunksRes, palRes, flagRes, idxRes, maskRes, mapTileRes, objTileRes, baseTileRes, animRes, objListRes, paperRes, fontRes, portraitBRes, portraitARes, titlesRes, mainmenuRes, cursorRes] = await Promise.all([
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
      fetch("../assets/runtime/savegame/objlist"),
      fetch("../assets/runtime/paper.bmp"),
      fetch("../assets/runtime/u6.ch"),
      fetch("../assets/runtime/portrait.b"),
      fetch("../assets/runtime/portrait.a"),
      fetch("../assets/runtime/titles.shp"),
      fetch("../assets/runtime/mainmenu.shp"),
      fetch("../assets/runtime/u6mcga.ptr")
    ]);
    const [mapBuf, chunkBuf, palBuf, flagBuf, idxBuf, maskBuf, mapTileBuf, objTileBuf, baseTileBuf, animBuf, objListBuf, paperBuf, fontBuf, portraitBBuf, portraitABuf, titlesBuf, mainmenuBuf, cursorBuf] = await Promise.all([
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
      objListRes.arrayBuffer(),
      paperRes.arrayBuffer(),
      fontRes.arrayBuffer(),
      portraitBRes.arrayBuffer(),
      portraitARes.arrayBuffer(),
      titlesRes.arrayBuffer(),
      mainmenuRes.arrayBuffer(),
      cursorRes.arrayBuffer()
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
    if (paperRes.ok && paperBuf.byteLength >= 4) {
      state.legacyPaperPixmap = decodeLegacyPixmap(new Uint8Array(paperBuf));
    } else {
      state.legacyPaperPixmap = null;
    }
    if (fontRes.ok && fontBuf.byteLength >= 2048) {
      state.u6MainFont = new Uint8Array(fontBuf.slice(0, 2048));
    } else {
      state.u6MainFont = null;
    }
    if (state.basePalette) {
      let pix = null;
      if (portraitBRes.ok && portraitBBuf.byteLength > 64) {
        pix = decodePortraitFromArchive(new Uint8Array(portraitBBuf), LEGACY_AVATAR_PORTRAIT_INDEX);
      }
      if (!pix && portraitARes.ok && portraitABuf.byteLength > 64) {
        pix = decodePortraitFromArchive(new Uint8Array(portraitABuf), LEGACY_AVATAR_PORTRAIT_INDEX);
      }
      state.avatarPortraitCanvas = canvasFromIndexedPixels(pix, state.basePalette);
    } else {
      state.avatarPortraitCanvas = null;
    }
    if (titlesRes.ok && titlesBuf.byteLength > 8 && mainmenuRes.ok && mainmenuBuf.byteLength > 8) {
      const titles = decodeU6ShpArchive(new Uint8Array(titlesBuf));
      const menu = decodeU6ShpArchive(new Uint8Array(mainmenuBuf));
      if (titles.length >= 2 && titles[0] && titles[1] && menu.length >= 1 && menu[0]) {
        state.startupTitlePixmaps = [titles[0], titles[1]];
        state.startupMenuPixmap = menu[0];
      } else {
        state.startupTitlePixmaps = null;
        state.startupMenuPixmap = null;
      }
    } else {
      state.startupTitlePixmaps = null;
      state.startupMenuPixmap = null;
    }
    state.startupCanvasCache.clear();
    if (cursorRes.ok && cursorBuf.byteLength > 12) {
      state.cursorPixmaps = decodeU6CursorPtr(new Uint8Array(cursorBuf));
      state.cursorIndex = 0;
    } else {
      state.cursorPixmaps = null;
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
    applyLegacyFrameLayout();
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
    state.cornerVariantCache.clear();
    state.mapCtx = null;
    state.tileSet = null;
    state.objectLayer = null;
    state.entityLayer = null;
    state.animData = null;
    state.palette = null;
    state.basePalette = null;
    state.avatarPortraitCanvas = null;
    state.startupTitlePixmaps = null;
    state.startupMenuPixmap = null;
    state.startupCanvasCache.clear();
    state.cursorPixmaps = null;
    state.u6MainFont = null;
    state.legacyPaperPixmap = null;
    state.tileFlags = null;
    state.terrainType = null;
    applyLegacyFrameLayout();
    statSource.textContent = "synthetic fallback";
    diagBox.className = "diag warn";
    diagBox.textContent = `Fallback active: ${String(err.message || err)}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`;
  }
}

window.addEventListener("keydown", (ev) => {
  if (isTypingContext(ev.target)) {
    return;
  }
  const k = ev.key.toLowerCase();
  if (!state.sessionStarted) {
    if (k === "arrowup") {
      setStartupMenuIndex(state.startupMenuIndex - 1);
      ev.preventDefault();
    } else if (k === "arrowdown") {
      setStartupMenuIndex(state.startupMenuIndex + 1);
      ev.preventDefault();
    } else if (k === "i") {
      setStartupMenuIndex(0);
      activateStartupMenuSelection();
      ev.preventDefault();
    } else if (k === "c") {
      setStartupMenuIndex(1);
      activateStartupMenuSelection();
      ev.preventDefault();
    } else if (k === "t") {
      setStartupMenuIndex(2);
      activateStartupMenuSelection();
      ev.preventDefault();
    } else if (k === "a") {
      setStartupMenuIndex(3);
      activateStartupMenuSelection();
      ev.preventDefault();
    } else if (k === "j") {
      setStartupMenuIndex(4);
      activateStartupMenuSelection();
      ev.preventDefault();
    } else if (k === "enter" || k === " ") {
      activateStartupMenuSelection();
      ev.preventDefault();
    }
    return;
  }
  if (k === "p" && ev.shiftKey) {
    captureWorldHudPng();
    ev.preventDefault();
    return;
  }
  if (k === "q") {
    returnToTitleMenu();
    ev.preventDefault();
    return;
  }
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
  else if (k === "m") setMovementMode(state.movementMode === "avatar" ? "ghost" : "avatar");
  else if (k === "e") queueInteractDoor();
  else if (k === "i") netLogin().then(() => {
    diagBox.className = "diag ok";
    diagBox.textContent = `Net login ok: ${state.net.username}/${state.net.characterName}`;
  }).catch((err) => {
    setNetStatus("error", `Login failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Net login failed: ${String(err.message || err)}`;
  });
  else if (k === "y") netSaveSnapshot().then(() => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `Remote snapshot saved at tick ${state.sim.tick >>> 0}.`;
  }).catch((err) => {
    setNetStatus("error", `Save failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Remote save failed: ${String(err.message || err)}`;
  });
  else if (k === "u") netLoadSnapshot().then((out) => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `Remote snapshot loaded at tick ${Number(out?.snapshot_meta?.saved_tick || 0)}.`;
  }).catch((err) => {
    setNetStatus("error", `Load failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Remote load failed: ${String(err.message || err)}`;
  });
  else if (k === "n") netRunCriticalMaintenance({ silent: false }).catch((err) => {
    setNetStatus("error", `Maintenance failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Critical maintenance failed: ${String(err.message || err)}`;
  });
  else if (ev.key === ",") cycleCursor(-1);
  else if (ev.key === ".") cycleCursor(1);
  else if (ev.key === "[") cycleLegacyScaleMode(-1);
  else if (ev.key === "]") cycleLegacyScaleMode(1);
  else return;
  ev.preventDefault();
});

function startupMenuIndexAtLogicalPos(lx, ly) {
  if (lx < STARTUP_MENU_HITBOX.x0 || lx > STARTUP_MENU_HITBOX.x1) {
    return -1;
  }
  for (let i = 0; i < STARTUP_MENU_HITBOX.rows.length; i += 1) {
    const row = STARTUP_MENU_HITBOX.rows[i];
    if (ly > row[0] && ly < row[1]) {
      return i;
    }
  }
  return -1;
}

function startupMenuIndexAtEvent(ev, surface) {
  const s = surface || canvas;
  const rect = s.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return -1;
  }
  const surfaceW = s.width || 0;
  const surfaceH = s.height || 0;
  if (surfaceW <= 0 || surfaceH <= 0) {
    return -1;
  }
  const px = ((ev.clientX - rect.left) * surfaceW) / rect.width;
  const py = ((ev.clientY - rect.top) * surfaceH) / rect.height;
  const menuScale = Math.max(1, Math.floor(surfaceW / 320));
  const lx = Math.floor(px / menuScale);
  const ly = Math.floor(py / menuScale);
  return startupMenuIndexAtLogicalPos(lx, ly);
}

function activeCursorSurface() {
  if (isLegacyFramePreviewOn()) {
    if (legacyBackdropCanvas) {
      return legacyBackdropCanvas;
    }
  }
  return canvas;
}

function updateCanvasMouseFromEvent(ev, surface) {
  const s = activeCursorSurface() || surface || canvas;
  const rect = s.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  state.mouseNormX = Math.max(0, Math.min(1, nx));
  state.mouseNormY = Math.max(0, Math.min(1, ny));
  state.mouseInCanvas = true;
}

canvas.addEventListener("mousemove", (ev) => {
  updateCanvasMouseFromEvent(ev, canvas);
  if (state.sessionStarted) {
    return;
  }
  const idx = startupMenuIndexAtEvent(ev, canvas);
  if (idx >= 0) {
    setStartupMenuIndex(idx);
  }
});

canvas.addEventListener("click", (ev) => {
  updateCanvasMouseFromEvent(ev, canvas);
  if (state.sessionStarted) {
    return;
  }
  const idx = startupMenuIndexAtEvent(ev, canvas);
  if (idx < 0) {
    return;
  }
  setStartupMenuIndex(idx);
  activateStartupMenuSelection();
});

canvas.addEventListener("mouseenter", (ev) => {
  updateCanvasMouseFromEvent(ev, canvas);
});

canvas.addEventListener("mouseleave", () => {
  state.mouseInCanvas = false;
});

if (legacyBackdropCanvas) {
  legacyBackdropCanvas.addEventListener("mousemove", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
    if (state.sessionStarted) {
      return;
    }
    const idx = startupMenuIndexAtEvent(ev, legacyBackdropCanvas);
    if (idx >= 0) {
      setStartupMenuIndex(idx);
    }
  });

  legacyBackdropCanvas.addEventListener("click", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
    if (state.sessionStarted) {
      return;
    }
    const idx = startupMenuIndexAtEvent(ev, legacyBackdropCanvas);
    if (idx < 0) {
      return;
    }
    setStartupMenuIndex(idx);
    activateStartupMenuSelection();
  });

  legacyBackdropCanvas.addEventListener("mouseenter", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
  });

  legacyBackdropCanvas.addEventListener("mouseleave", () => {
    state.mouseInCanvas = false;
  });
}

if (legacyViewportCanvas) {
  legacyViewportCanvas.addEventListener("mousemove", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mouseenter", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mouseleave", () => {
    state.mouseInCanvas = false;
  });
}

window.addEventListener("resize", () => {
  applyLegacyFrameLayout();
});

loadRuntimeAssets().finally(() => {
  state.runtimeReady = true;
  if (state.mapCtx) {
    diagBox.className = "diag ok";
    diagBox.textContent = "Startup menu ready: select Journey Onward to enter the throne room.";
  } else {
    diagBox.className = "diag warn";
    diagBox.textContent = "Assets missing: startup menu running in fallback mode.";
  }
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});

initTheme();
initFont();
initGrid();
initOverlayDebug();
initAnimationMode();
initPaletteFxMode();
initMovementMode();
initRenderMode();
initLegacyScaleMode();
initLegacyFramePreview();
initCapturePresets();
initNetPanel();
initPanelCopyButtons();
setStartupMenuIndex(0);
if (jumpButton) {
  jumpButton.addEventListener("click", jumpToPreset);
}
if (captureButton) {
  captureButton.addEventListener("click", captureViewportPng);
}
if (captureWorldHudButton) {
  captureWorldHudButton.addEventListener("click", captureWorldHudPng);
}

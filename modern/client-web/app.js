import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel
} from "./render_composition.js";
import { compareLegacyObjectOrderStable } from "./legacy_object_order.js";

const TICK_MS = 100;
const TILE_SIZE = 64;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;
const COMMAND_LOG_MAX = 50000;
const MOVE_INPUT_MIN_INTERVAL_MS = 120;
const NET_PRESENCE_HEARTBEAT_TICKS = 4;
const NET_PRESENCE_POLL_TICKS = 10;
const NET_CLOCK_POLL_TICKS = 2;
const NET_BACKGROUND_FAIL_WINDOW_MS = 12000;
const NET_BACKGROUND_FAIL_MAX = 6;
const RUNTIME_OBJECT_PATH = "../assets/runtime/savegame";
const PRISTINE_OBJECT_PATH = "../assets/pristine/savegame";
const PRISTINE_BASELINE_VERSION_PATH = "../assets/pristine/.baseline_version";
const PRISTINE_BASELINE_POLL_TICKS = 20;
const TICKS_PER_MINUTE = 4;
const WORLD_PROP_RESET_MINUTES = 5;
const WORLD_PROP_RESET_TICKS = WORLD_PROP_RESET_MINUTES * 60 * TICKS_PER_MINUTE;
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
const OBJ_STATUS_INVISIBLE = 0x02;
const ENTITY_TYPE_ACTOR_MIN = 0x153;
const ENTITY_TYPE_ACTOR_MAX = 0x1af;
const AVATAR_ENTITY_ID = 1;
const LEGACY_SLEEP_SHAPE_TYPE = 0x092;
const OBJECT_TYPES_FLOOR_DECOR = new Set([0x12e, 0x12f, 0x130]);
const OBJECT_TYPES_DOOR = new Set([0x10f, 0x129, 0x12a, 0x12b, 0x12c, 0x12d, 0x14e]);
const OBJECT_TYPES_CLOSEABLE_DOOR = new Set([0x129, 0x12a, 0x12b, 0x12c, 0x14e]);
const OBJECT_TYPES_CHAIR = new Set([0x0fc]);
const OBJECT_TYPES_BED = new Set([0x0a3]);
const OBJECT_TYPES_TOP_DECOR = new Set([0x05f, 0x060, 0x080, 0x081, 0x084, 0x07a, 0x0d1, 0x0ea]);
const OBJECT_TYPES_SOLID_ENV = new Set([
  0x0a3, 0x0a4, 0x0b0, 0x0b1, 0x0c6, 0x0d8, 0x0d9,
  0x0e4, 0x0e6, 0x0ed, 0x0ef, 0x0fa, 0x117, 0x137,
  0x147
]);
const LEGACY_LENS_BRITANNIA = { type: 0x18a, x: 0x39e, y: 0x358, z: 0, rightTile: 0x1ba, leftTile: 0x1bb };
const LEGACY_LENS_GARGOYLE = { type: 0x18c, x: 0x3a2, y: 0x358, z: 0, rightTile: 0x1b8, leftTile: 0x1b9 };
function isRenderableWorldObjectType(type) {
  const t = type & 0x03ff;
  if (t >= ENTITY_TYPE_ACTOR_MIN && t <= ENTITY_TYPE_ACTOR_MAX) {
    return false;
  }
  /* Legacy ShowObject short-circuits this base tile family. */
  if (t === 0x14f) {
    return false;
  }
  return true;
}

function isImplicitSolidObjectTile(objType, tileId) {
  if (OBJECT_TYPES_DOOR.has(objType & 0x03ff)) {
    return false;
  }
  if (!state.tileFlags) {
    return false;
  }
  const tf = state.tileFlags[tileId & 0x07ff] ?? 0;
  if ((tf & 0x20) !== 0) {
    return true;
  }
  /* Legacy data has many large furniture props without explicit nos-step flags.
     Use multi-tile footprint as a collision fallback, but never for foreground/top decor. */
  if ((tf & 0xc0) !== 0) {
    if ((tf & 0x10) !== 0) {
      return false;
    }
    if (OBJECT_TYPES_TOP_DECOR.has(objType & 0x03ff)) {
      return false;
    }
    return true;
  }
  return false;
}

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
const topNetIndicator = document.getElementById("topNetIndicator");
const topInputMode = document.getElementById("topInputMode");
const topCopyStatus = document.getElementById("topCopyStatus");
const netQuickStatus = document.getElementById("netQuickStatus");
const netAccountOpenButton = document.getElementById("netAccountOpenButton");
const netAccountModal = document.getElementById("netAccountModal");
const netAccountModalBackdrop = document.getElementById("netAccountModalBackdrop");
const netAccountCloseButton = document.getElementById("netAccountCloseButton");
const diagBox = document.getElementById("diagBox");
const replayDownload = document.getElementById("replayDownload");
const themeSelect = document.getElementById("themeSelect");
const wikiLink = document.getElementById("wikiLink");
const fontSelect = document.getElementById("fontSelect");
const gridToggle = document.getElementById("gridToggle");
const debugOverlayToggle = document.getElementById("debugOverlayToggle");
const animationToggle = document.getElementById("animationToggle");
const paletteFxToggle = document.getElementById("paletteFxToggle");
const movementModeToggle = document.getElementById("movementModeToggle");
const capturePreviewToggle = document.getElementById("capturePreviewToggle");
const legacyScaleModeToggle = document.getElementById("legacyScaleModeToggle");
const charStubCanvas = document.getElementById("charStubCanvas");
const locationSelect = document.getElementById("locationSelect");
const jumpButton = document.getElementById("jumpButton");
const captureButton = document.getElementById("captureButton");
const captureWorldHudButton = document.getElementById("captureWorldHudButton");
const parityRadiusInput = document.getElementById("parityRadiusInput");
const paritySnapshotButton = document.getElementById("paritySnapshotButton");
const netApiBaseInput = document.getElementById("netApiBaseInput");
const netAccountSelect = document.getElementById("netAccountSelect");
const netUsernameInput = document.getElementById("netUsernameInput");
const netPasswordInput = document.getElementById("netPasswordInput");
const netPasswordToggleButton = document.getElementById("netPasswordToggleButton");
const netNewPasswordInput = document.getElementById("netNewPasswordInput");
const netChangePasswordButton = document.getElementById("netChangePasswordButton");
const netCharacterNameInput = document.getElementById("netCharacterNameInput");
const netEmailInput = document.getElementById("netEmailInput");
const netEmailCodeInput = document.getElementById("netEmailCodeInput");
const netLoginButton = document.getElementById("netLoginButton");
const netRecoverButton = document.getElementById("netRecoverButton");
const netSetEmailButton = document.getElementById("netSetEmailButton");
const netSendVerifyButton = document.getElementById("netSendVerifyButton");
const netVerifyEmailButton = document.getElementById("netVerifyEmailButton");
const netSaveButton = document.getElementById("netSaveButton");
const netLoadButton = document.getElementById("netLoadButton");
const netMaintenanceToggle = document.getElementById("netMaintenanceToggle");
const netMaintenanceButton = document.getElementById("netMaintenanceButton");

const THEME_KEY = "vm_theme";
const FONT_KEY = "vm_font";
const GRID_KEY = "vm_grid";
const DEBUG_OVERLAY_KEY = "vm_overlay_debug";
const ANIMATION_KEY = "vm_animation";
const PALETTE_FX_KEY = "vm_palette_fx";
const MOVEMENT_MODE_KEY = "vm_movement_mode";
const LEGACY_FRAME_PREVIEW_KEY = "vm_legacy_frame_preview";
const LEGACY_SCALE_MODE_KEY = "vm_legacy_scale_mode";
const NET_API_BASE_KEY = "vm_net_api_base";
const NET_USERNAME_KEY = "vm_net_username";
const NET_PASSWORD_KEY = "vm_net_password";
const NET_PASSWORD_VISIBLE_KEY = "vm_net_password_visible";
const NET_CHARACTER_NAME_KEY = "vm_net_character_name";
const NET_EMAIL_KEY = "vm_net_email";
const NET_MAINTENANCE_KEY = "vm_net_maintenance";
const NET_PROFILES_KEY = "vm_net_profiles";
const NET_PROFILE_SELECTED_KEY = "vm_net_profile_selected";
const NET_ACTIVITY_PULSE_MS = 280;
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
const LEGACY_TARGET_VERB = Object.freeze({
  ATTACK: "attack",
  CAST: "cast",
  TALK: "talk",
  LOOK: "look",
  GET: "get",
  DROP: "drop",
  MOVE: "move",
  USE: "use"
});
const LEGACY_TARGET_VERB_LABEL = Object.freeze({
  [LEGACY_TARGET_VERB.ATTACK]: "Attack",
  [LEGACY_TARGET_VERB.CAST]: "Cast",
  [LEGACY_TARGET_VERB.TALK]: "Talk",
  [LEGACY_TARGET_VERB.LOOK]: "Look",
  [LEGACY_TARGET_VERB.GET]: "Get",
  [LEGACY_TARGET_VERB.DROP]: "Drop",
  [LEGACY_TARGET_VERB.MOVE]: "Move",
  [LEGACY_TARGET_VERB.USE]: "Use"
});
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
  movementMode: "ghost",
  useCursorActive: false,
  targetVerb: "",
  useCursorX: 0,
  useCursorY: 0,
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
  tileFlags2: null,
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
  legacyScaleMode: "4",
  legacyComposeCanvas: null,
  legacyBackdropBaseCanvas: null,
  avatarPortraitCanvas: null,
  u6MainFont: null,
  runtimeReady: false,
  pristineBaselineVersion: "",
  pristineBaselinePollInFlight: false,
  pristineBaselineLastPollTick: -1,
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
    email: "",
    emailVerified: false,
    sessionId: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    characterId: "",
    characterName: "",
    remotePlayers: [],
    lastPresenceHeartbeatTick: -1,
    lastPresencePollTick: -1,
    lastClockPollTick: -1,
    presencePollInFlight: false,
    clockPollInFlight: false,
    backgroundSyncPaused: false,
    backgroundFailCount: 0,
    firstBackgroundFailAtMs: 0,
    lastSavedTick: 0,
    maintenanceAuto: false,
    maintenanceInFlight: false,
    lastMaintenanceTick: -1,
    recoveryEventCount: 0,
    resumeFromSnapshot: false,
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
    this.entries = [];
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

  compareLegacyRenderOrder(a, b) {
    const ao = Number(a?.legacyOrder);
    const bo = Number(b?.legacyOrder);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) {
      return ao - bo;
    }
    return compareLegacyObjectOrderStable(a, b);
  }

  parseObjBlk(bytes, areaId = 0) {
    if (!bytes || bytes.length < 2) {
      return [];
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let count = dv.getUint16(0, true);
    const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
    if (count > maxCount) {
      count = maxCount;
    }

    const decoded = [];
    for (let i = 0; i < count; i += 1) {
      const off = 2 + (i * 8);
      const status = bytes[off + 0];
      const { x, y, z } = this.decodeCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
      const shapeType = dv.getUint16(off + 4, true);
      const type = shapeType & 0x3ff;
      const frame = shapeType >>> 10;
      const base = this.baseTiles[type] ?? 0;
      const tileId = (base + frame) & 0xffff;
      const coordUse = status & OBJ_COORD_USE_MASK;
      const assocIndex = (bytes[off + 1] | (bytes[off + 2] << 8)) & 0xffff;
      decoded.push({
        index: i,
        coordUse,
        assocIndex,
        x,
        y,
        z,
        status,
        coordUse,
        type,
        baseTile: base,
        frame,
        tileId,
        order: i,
        sourceArea: areaId & 0x3f,
        sourceIndex: i,
        renderable: isRenderableWorldObjectType(type)
      });
    }
    for (const row of decoded) {
      const ai = row.assocIndex | 0;
      if (ai >= 0 && ai < decoded.length) {
        row.assocObj = decoded[ai];
      }
    }
    const childCounts = new Uint16Array(count);
    const child0010Counts = new Uint16Array(count);
    for (const row of decoded) {
      if ((row.coordUse | 0) === OBJ_COORD_USE_LOCXYZ) {
        continue;
      }
      const ai = row.assocIndex | 0;
      if (ai < 0 || ai >= count) {
        continue;
      }
      childCounts[ai] = (childCounts[ai] + 1) & 0xffff;
      if ((row.status & 0x10) !== 0) {
        child0010Counts[ai] = (child0010Counts[ai] + 1) & 0xffff;
      }
    }
    const ordered = decoded.slice().sort((a, b) => {
      const cmp = compareLegacyObjectOrderStable(a, b);
      if (cmp !== 0) {
        return cmp;
      }
      return (a.index | 0) - (b.index | 0);
    });
    const legacyOrderByIndex = new Int32Array(count);
    legacyOrderByIndex.fill(-1);
    for (let i = 0; i < ordered.length; i += 1) {
      const idx = ordered[i].index | 0;
      if (idx >= 0 && idx < count) {
        legacyOrderByIndex[idx] = i;
      }
    }
    const entries = [];
    for (const row of decoded) {
      if ((row.coordUse | 0) !== OBJ_COORD_USE_LOCXYZ) {
        continue;
      }
      if (row.status & OBJ_STATUS_INVISIBLE) {
        continue;
      }
      entries.push({
        ...row,
        legacyOrder: legacyOrderByIndex[row.index] | 0,
        assocChildCount: Number(childCounts[row.index] || 0),
        assocChild0010Count: Number(child0010Counts[row.index] || 0)
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
      this.entries.push(e);
      this.totalLoaded += 1;
    }
  }

  objectAnchorKey(obj) {
    return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff},${obj.type & 0x3ff}`;
  }

  isObjectRemovedByKey(obj) {
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    if (!removedCount) {
      return false;
    }
    const removed = state?.sim?.removedObjectKeys;
    if (!removed || typeof removed !== "object") {
      return false;
    }
    return !!removed[this.objectAnchorKey(obj)];
  }

  hasMirrorReflector(obj) {
    const key = this.coordKey(obj.x | 0, ((obj.y | 0) + 1) & 0x3ff, obj.z | 0);
    const below = this.byCoord.get(key) ?? [];
    for (const candidate of below) {
      if (!candidate || !candidate.renderable) {
        continue;
      }
      if ((candidate.order | 0) === (obj.order | 0) && (candidate.type | 0) === (obj.type | 0)) {
        continue;
      }
      if (this.isObjectRemovedByKey(candidate)) {
        continue;
      }
      return true;
    }
    return false;
  }

  applyLegacyRuntimeFixes(obj) {
    if (!obj) {
      return obj;
    }
    if ((obj.type & 0x03ff) !== 0x07b || (obj.frame | 0) >= 2) {
      return obj;
    }
    const nextFrame = this.hasMirrorReflector(obj) ? 1 : 0;
    if ((obj.frame | 0) === nextFrame) {
      return obj;
    }
    return {
      ...obj,
      frame: nextFrame,
      tileId: ((obj.baseTile | 0) + nextFrame) & 0xffff
    };
  }

  async loadOutdoor(fetcher) {
    this.byCoord.clear();
    this.entries = [];
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
        const areaId = ((ay & 0x7) << 3) | (ax & 0x7);
        this.addEntries(this.parseObjBlk(buf, areaId));
        this.filesLoaded += 1;
      }
    }
    this.entries.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    for (const list of this.byCoord.values()) {
      list.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    }
  }

  objectsAt(x, y, z) {
    const list = this.byCoord.get(this.coordKey(x, y, z)) ?? [];
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    if (!removedCount) {
      return list.map((o) => this.applyLegacyRuntimeFixes(o));
    }
    const removed = state?.sim?.removedObjectKeys;
    if (!removed || typeof removed !== "object") {
      return list.map((o) => this.applyLegacyRuntimeFixes(o));
    }
    return list.filter((o) => {
      const key = `${o.x & 0x3ff},${o.y & 0x3ff},${o.z & 0x0f},${o.order & 0xffff},${o.type & 0x3ff}`;
      return !removed[key];
    }).map((o) => this.applyLegacyRuntimeFixes(o));
  }

  objectsInWindowLegacyOrder(startX, startY, viewW, viewH, z) {
    const endX = (startX + viewW) | 0;
    const endY = (startY + viewH) | 0;
    const targetZ = z | 0;
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    const removed = (removedCount && state?.sim?.removedObjectKeys && typeof state.sim.removedObjectKeys === "object")
      ? state.sim.removedObjectKeys
      : null;
    const out = [];
    for (const o of this.entries) {
      if ((o.z | 0) !== targetZ) {
        continue;
      }
      const ox = o.x | 0;
      const oy = o.y | 0;
      if (ox < startX || ox >= endX || oy < startY || oy >= endY) {
        continue;
      }
      if (removed) {
        const key = `${o.x & 0x3ff},${o.y & 0x3ff},${o.z & 0x0f},${o.order & 0xffff},${o.type & 0x3ff}`;
        if (removed[key]) {
          continue;
        }
      }
      out.push(this.applyLegacyRuntimeFixes(o));
    }
    return out;
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
    removedObjectKeys: {},
    removedObjectAtTick: {},
    removedObjectCount: 0,
    inventory: {},
    avatarPose: "stand",
    avatarPoseAnchor: null,
    world: { ...INITIAL_WORLD }
  };
}

function setTheme(themeName) {
  const theme = THEMES.includes(themeName) ? themeName : "obsidian";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (wikiLink) {
    wikiLink.href = `/docs/wiki/?theme=${encodeURIComponent(theme)}`;
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
  setFont(saved);
  if (fontSelect) {
    fontSelect.addEventListener("change", () => {
      setFont(fontSelect.value);
    });
  }
}

async function copyTextToClipboard(text) {
  const v = String(text ?? "");
  let lastErr = "";
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch (err) {
    lastErr = String(err && err.message ? err.message : err);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      return true;
    }
    if (!lastErr) {
      lastErr = "execCommand(copy) returned false";
    }
    if (diagBox) {
      diagBox.dataset.copyError = lastErr || "copy blocked";
    }
    return false;
  } catch (err) {
    if (!lastErr) {
      lastErr = String(err && err.message ? err.message : err);
    }
    if (diagBox) {
      diagBox.dataset.copyError = lastErr || "copy blocked";
    }
    return false;
  }
}

function setCopyStatus(ok, detail = "") {
  if (topCopyStatus) {
    topCopyStatus.textContent = ok ? "ok" : (detail ? `failed (${detail})` : "failed");
  }
}

function copyTextToClipboardSync(text) {
  const v = String(text ?? "");
  let lastErr = "";
  try {
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      return { ok: true, reason: "" };
    }
    lastErr = "execCommand(copy) returned false";
  } catch (err) {
    lastErr = String(err && err.message ? err.message : err);
  }
  if (diagBox) {
    diagBox.dataset.copyError = lastErr || "copy blocked";
  }
  return { ok: false, reason: lastErr || "copy blocked" };
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

function updateNetAuthButton() {
  if (!netLoginButton) {
    return;
  }
  const authed = isNetAuthenticated();
  netLoginButton.textContent = authed ? "Logout (Shift+I)" : "Net Login (Shift+I)";
  netLoginButton.classList.remove("control-btn--login", "control-btn--logout");
  netLoginButton.classList.add(authed ? "control-btn--logout" : "control-btn--login");
}

function setNetStatus(level, text) {
  const lvl = String(level || "idle");
  const msg = String(text || "");
  state.net.statusLevel = lvl;
  state.net.statusText = msg;
  if (topNetStatus) {
    topNetStatus.textContent = `${lvl} - ${msg}`;
  }
  if (topNetIndicator) {
    let indicatorState = "offline";
    if (isNetAuthenticated()) {
      if (lvl === "error") {
        indicatorState = "error";
      } else if (lvl === "sync") {
        indicatorState = "sync";
      } else if (lvl === "connecting") {
        indicatorState = "connecting";
      } else if (lvl === "offline") {
        indicatorState = "offline";
      } else {
        indicatorState = "online";
      }
    } else if (lvl === "connecting") {
      indicatorState = "connecting";
    } else if (lvl === "error") {
      indicatorState = "error";
    }
    topNetIndicator.dataset.state = indicatorState;
  }
  if (netQuickStatus) {
    netQuickStatus.textContent = isNetAuthenticated() ? "Account: Signed in" : "Account: Signed out";
  }
  updateNetAuthButton();
}

let netActivityPulseTimer = 0;
function pulseNetIndicator() {
  if (!topNetIndicator) {
    return;
  }
  topNetIndicator.classList.add("is-active");
  if (netActivityPulseTimer) {
    clearTimeout(netActivityPulseTimer);
  }
  netActivityPulseTimer = setTimeout(() => {
    topNetIndicator.classList.remove("is-active");
    netActivityPulseTimer = 0;
  }, NET_ACTIVITY_PULSE_MS);
}

function profileKey(profile) {
  const apiBase = String(profile?.apiBase || "").trim().toLowerCase();
  const username = String(profile?.username || "").trim().toLowerCase();
  return `${apiBase}|${username}`;
}

function sanitizeProfile(profile) {
  const apiBase = String(profile?.apiBase || "").trim();
  const username = String(profile?.username || "").trim().toLowerCase();
  if (!apiBase || !username) {
    return null;
  }
  return {
    apiBase,
    username,
    password: String(profile?.password || ""),
    characterName: String(profile?.characterName || "Avatar").trim() || "Avatar",
    email: String(profile?.email || "").trim().toLowerCase()
  };
}

function loadNetProfiles() {
  try {
    const raw = localStorage.getItem(NET_PROFILES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const row of arr) {
      const p = sanitizeProfile(row);
      if (p) out.push(p);
    }
    return out;
  } catch (_err) {
    return [];
  }
}

function saveNetProfiles(profiles) {
  try {
    localStorage.setItem(NET_PROFILES_KEY, JSON.stringify(profiles));
  } catch (_err) {
    // ignore storage failures
  }
}

function setSelectedProfileKey(key) {
  try {
    localStorage.setItem(NET_PROFILE_SELECTED_KEY, String(key || ""));
  } catch (_err) {
    // ignore storage failures
  }
}

function getSelectedProfileKey() {
  try {
    return String(localStorage.getItem(NET_PROFILE_SELECTED_KEY) || "");
  } catch (_err) {
    return "";
  }
}

function populateNetAccountSelect() {
  if (!netAccountSelect) {
    return [];
  }
  const profiles = loadNetProfiles();
  const selected = getSelectedProfileKey();
  netAccountSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = profiles.length ? "Select saved account..." : "No saved accounts yet";
  netAccountSelect.appendChild(placeholder);
  for (const p of profiles) {
    const opt = document.createElement("option");
    opt.value = profileKey(p);
    opt.textContent = `${p.username} @ ${p.apiBase}`;
    if (opt.value === selected) {
      opt.selected = true;
    }
    netAccountSelect.appendChild(opt);
  }
  return profiles;
}

function applyNetProfile(profile) {
  const p = sanitizeProfile(profile);
  if (!p) {
    return false;
  }
  if (netApiBaseInput) netApiBaseInput.value = p.apiBase;
  if (netUsernameInput) netUsernameInput.value = p.username;
  if (netPasswordInput) netPasswordInput.value = p.password;
  if (netCharacterNameInput) netCharacterNameInput.value = p.characterName;
  if (netEmailInput) netEmailInput.value = p.email;
  setSelectedProfileKey(profileKey(p));
  return true;
}

function upsertNetProfileFromInputs() {
  const p = sanitizeProfile({
    apiBase: netApiBaseInput?.value,
    username: netUsernameInput?.value,
    password: netPasswordInput?.value,
    characterName: netCharacterNameInput?.value,
    email: netEmailInput?.value
  });
  if (!p) {
    return;
  }
  const key = profileKey(p);
  const profiles = loadNetProfiles().filter((row) => profileKey(row) !== key);
  profiles.unshift(p);
  while (profiles.length > 12) {
    profiles.pop();
  }
  saveNetProfiles(profiles);
  setSelectedProfileKey(key);
  populateNetAccountSelect();
  if (netAccountSelect) {
    netAccountSelect.value = key;
  }
}

function hasMultipleSavedAccounts() {
  return loadNetProfiles().length > 1;
}

function resetBackgroundNetFailures() {
  state.net.backgroundFailCount = 0;
  state.net.firstBackgroundFailAtMs = 0;
  state.net.backgroundSyncPaused = false;
}

function recordBackgroundNetFailure(err, context) {
  const nowMs = Date.now();
  if (!state.net.firstBackgroundFailAtMs || (nowMs - state.net.firstBackgroundFailAtMs) > NET_BACKGROUND_FAIL_WINDOW_MS) {
    state.net.firstBackgroundFailAtMs = nowMs;
    state.net.backgroundFailCount = 0;
  }
  state.net.backgroundFailCount += 1;
  if (state.net.backgroundFailCount >= NET_BACKGROUND_FAIL_MAX) {
    state.net.backgroundSyncPaused = true;
    setNetStatus("offline", "Server unreachable. Auto-sync paused; use Net Login to retry.");
    return;
  }
  const suffix = err ? `: ${String(err.message || err)}` : "";
  setNetStatus("error", `${context} failed${suffix}`);
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
  const normalizedInventory = {};
  for (const [k, v] of Object.entries(candidate.inventory ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedInventory[key] = Number(v) >>> 0;
  }
  const normalizedRemoved = {};
  for (const [k, v] of Object.entries(candidate.removedObjectKeys ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemoved[key] = Number(v) ? 1 : 0;
  }
  const normalizedRemovedAtTick = {};
  for (const [k, v] of Object.entries(candidate.removedObjectAtTick ?? {})) {
    const key = String(k || "").trim();
    if (!key) {
      continue;
    }
    normalizedRemovedAtTick[key] = Number(v) >>> 0;
  }
  const snapshotTick = Number(candidate.tick) >>> 0;
  for (const key of Object.keys(normalizedRemoved)) {
    if (!Object.prototype.hasOwnProperty.call(normalizedRemovedAtTick, key)) {
      normalizedRemovedAtTick[key] = snapshotTick;
    }
  }
  const removedObjectCount = Number(candidate.removedObjectCount) >>> 0;
  const normalizedRemovedCount = removedObjectCount > 0
    ? removedObjectCount
    : Object.keys(normalizedRemoved).length;
  return {
    tick: Number(candidate.tick) >>> 0,
    rngState: Number(candidate.rngState) >>> 0,
    worldFlags: Number(candidate.worldFlags) >>> 0,
    commandsApplied: Number(candidate.commandsApplied) >>> 0,
    doorOpenStates: { ...(candidate.doorOpenStates ?? {}) },
    removedObjectKeys: normalizedRemoved,
    removedObjectAtTick: normalizedRemovedAtTick,
    removedObjectCount: normalizedRemovedCount >>> 0,
    inventory: normalizedInventory,
    avatarPose: (candidate.avatarPose === "sit" || candidate.avatarPose === "sleep")
      ? candidate.avatarPose
      : "stand",
    avatarPoseAnchor: candidate.avatarPoseAnchor && typeof candidate.avatarPoseAnchor === "object"
      ? {
        x: Number(candidate.avatarPoseAnchor.x) | 0,
        y: Number(candidate.avatarPoseAnchor.y) | 0,
        z: Number(candidate.avatarPoseAnchor.z) | 0,
        order: Number(candidate.avatarPoseAnchor.order) | 0,
        type: Number(candidate.avatarPoseAnchor.type) | 0
      }
      : null,
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
    if (res.status === 401) {
      state.net.token = "";
      state.net.userId = "";
      state.net.characterId = "";
      state.net.remotePlayers = [];
      state.net.backgroundSyncPaused = false;
      state.net.backgroundFailCount = 0;
      state.net.firstBackgroundFailAtMs = 0;
      updateNetSessionStat();
      setNetStatus("idle", "Session expired. Please log in.");
    }
    const msg = body?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  pulseNetIndicator();
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
  state.net.backgroundSyncPaused = false;
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
  state.net.email = String(login?.user?.email || "");
  state.net.emailVerified = !!login?.user?.email_verified;
  state.net.remotePlayers = [];
  state.net.lastPresenceHeartbeatTick = -1;
  state.net.lastPresencePollTick = -1;
  state.net.lastClockPollTick = -1;
  await netEnsureCharacter();
  let resumedFromSnapshot = false;
  try {
    const out = await netRequest("/api/world/snapshot", { method: "GET" }, true);
    if (out?.snapshot_base64) {
      const loaded = decodeSimSnapshotBase64(out.snapshot_base64);
      if (loaded) {
        state.sim = loaded;
        state.queue = [];
        state.commandLog = [];
        state.accMs = 0;
        state.lastMoveQueueAtMs = -1;
        state.avatarLastMoveTick = -1;
        state.interactionProbeTile = null;
        resumedFromSnapshot = true;
      }
    }
  } catch (_err) {
    // No prior snapshot for this character is a valid first-login state.
  }
  await netPollWorldClock();
  await netPollPresence();
  state.net.resumeFromSnapshot = resumedFromSnapshot;
  resetBackgroundNetFailures();
  updateNetSessionStat();
  setNetStatus("online", resumedFromSnapshot
    ? `${state.net.username}/${state.net.characterName} (resumed)`
    : `${state.net.username}/${state.net.characterName}`);
  if (netEmailInput && state.net.email) {
    netEmailInput.value = state.net.email;
  }
  try {
    localStorage.setItem(NET_API_BASE_KEY, state.net.apiBase);
    localStorage.setItem(NET_USERNAME_KEY, state.net.username);
    localStorage.setItem(NET_CHARACTER_NAME_KEY, state.net.characterName);
    localStorage.setItem(NET_EMAIL_KEY, state.net.email || "");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  upsertNetProfileFromInputs();
}

async function netSetEmail() {
  if (!state.net.token) {
    await netLogin();
  }
  const email = String(netEmailInput?.value || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Recovery email is required");
  }
  setNetStatus("sync", "Saving recovery email...");
  const out = await netRequest("/api/auth/set-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  }, true);
  state.net.email = String(out?.user?.email || email);
  state.net.emailVerified = !!out?.user?.email_verified;
  try {
    localStorage.setItem(NET_EMAIL_KEY, state.net.email);
  } catch (_err) {
    // ignore storage failures
  }
  upsertNetProfileFromInputs();
  setNetStatus("online", state.net.emailVerified ? "Email verified" : "Email set (verification required)");
  return out;
}

async function netSendEmailVerification() {
  if (!state.net.token) {
    await netLogin();
  }
  setNetStatus("sync", "Sending verification email...");
  const out = await netRequest("/api/auth/send-email-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  }, true);
  setNetStatus("online", "Verification code sent to recovery email");
  return out;
}

async function netVerifyEmail() {
  if (!state.net.token) {
    await netLogin();
  }
  const code = String(netEmailCodeInput?.value || "").trim();
  if (!code) {
    throw new Error("Verification code is required");
  }
  setNetStatus("sync", "Verifying recovery email...");
  const out = await netRequest("/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  }, true);
  state.net.email = String(out?.user?.email || state.net.email || "");
  state.net.emailVerified = !!out?.user?.email_verified;
  if (netEmailInput && state.net.email) {
    netEmailInput.value = state.net.email;
  }
  setNetStatus("online", "Recovery email verified");
  return out;
}

async function netRecoverPassword() {
  const base = String(netApiBaseInput?.value || "").trim() || "http://127.0.0.1:8081";
  const username = String(netUsernameInput?.value || "").trim().toLowerCase();
  const email = String(netEmailInput?.value || "").trim().toLowerCase();
  if (!username) {
    throw new Error("Username is required");
  }
  if (!email) {
    throw new Error("Recovery email is required");
  }
  state.net.apiBase = base;
  setNetStatus("connecting", "Sending password recovery email...");
  const out = await netRequest(`/api/auth/recover-password?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`, { method: "GET" }, false);
  setNetStatus("online", `Recovery email sent for ${out?.user?.username || username}`);
  return out;
}

async function netChangePassword() {
  if (!state.net.token) {
    await netLogin();
  }
  const oldPassword = String(netPasswordInput?.value || "");
  const newPassword = String(netNewPasswordInput?.value || "");
  if (!oldPassword) {
    throw new Error("Current password is required");
  }
  if (!newPassword) {
    throw new Error("New password is required");
  }
  if (newPassword === oldPassword) {
    throw new Error("New password must be different");
  }
  setNetStatus("sync", "Updating account password...");
  const out = await netRequest("/api/auth/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword
    })
  }, true);
  if (netPasswordInput) {
    netPasswordInput.value = newPassword;
  }
  if (netNewPasswordInput) {
    netNewPasswordInput.value = "";
  }
  try {
    localStorage.setItem(NET_PASSWORD_KEY, newPassword);
  } catch (_err) {
    // ignore storage failures
  }
  upsertNetProfileFromInputs();
  setNetStatus("online", "Password updated");
  return out;
}

function netLogout() {
  void netLogoutAndPersist();
}

async function netLogoutAndPersist() {
  let saveErr = null;
  let leaveErr = null;
  if (state.net.token && state.net.userId) {
    try {
      await netSaveSnapshot();
    } catch (err) {
      saveErr = err;
    }
    try {
      await netLeavePresence();
    } catch (err) {
      leaveErr = err;
    }
  }
  state.net.token = "";
  state.net.userId = "";
  state.net.characterId = "";
  state.net.remotePlayers = [];
  state.net.lastPresenceHeartbeatTick = -1;
  state.net.lastPresencePollTick = -1;
  state.net.lastClockPollTick = -1;
  state.net.resumeFromSnapshot = false;
  state.net.backgroundSyncPaused = false;
  state.net.backgroundFailCount = 0;
  state.net.firstBackgroundFailAtMs = 0;
  if (state.sessionStarted) {
    returnToTitleMenu();
  } else {
    setStartupMenuIndex(0);
  }
  updateNetSessionStat();
  setNetStatus("idle", "Not logged in.");
  if (saveErr || leaveErr) {
    diagBox.className = "diag warn";
    const parts = [];
    if (saveErr) {
      parts.push(`position save failed: ${String(saveErr.message || saveErr)}`);
    }
    if (leaveErr) {
      parts.push(`presence cleanup failed: ${String(leaveErr.message || leaveErr)}`);
    }
    diagBox.textContent = `Logged out with warnings (${parts.join("; ")}).`;
  } else {
    diagBox.className = "diag ok";
    diagBox.textContent = "Logged out. Position saved and presence cleared.";
  }
  updateNetAuthButton();
}

async function netSaveSnapshot() {
  setNetStatus("sync", "Saving world snapshot...");
  if (!state.net.token) {
    await netLogin();
  }
  const snapshotBase64 = encodeSimSnapshotBase64(state.sim);
  const out = await netRequest("/api/world/snapshot", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema_version: 1,
      sim_core_version: "client-web-js",
      saved_tick: state.sim.tick >>> 0,
      snapshot_base64: snapshotBase64
    })
  }, true);
  resetBackgroundNetFailures();
  state.net.lastSavedTick = Number(out?.snapshot_meta?.saved_tick || 0) >>> 0;
  setNetStatus("online", `Saved tick ${state.net.lastSavedTick}`);
  return out;
}

async function netLoadSnapshot() {
  setNetStatus("sync", "Loading world snapshot...");
  if (!state.net.token) {
    await netLogin();
  }
  const out = await netRequest("/api/world/snapshot", { method: "GET" }, true);
  if (!out?.snapshot_base64) {
    throw new Error("No world snapshot is saved yet");
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
  resetBackgroundNetFailures();
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
    resetBackgroundNetFailures();
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
  resetBackgroundNetFailures();
}

async function netLeavePresence() {
  if (!isNetAuthenticated()) {
    return;
  }
  await netRequest("/api/world/presence/leave", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      session_id: state.net.sessionId
    })
  }, true);
  resetBackgroundNetFailures();
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
    const filtered = players.filter((p) => {
      const sameSession = String(p.session_id || "") === String(state.net.sessionId || "");
      const sameUser = String(p.user_id || "") === String(state.net.userId || "");
      const sameUsername = String(p.username || "").toLowerCase() === String(state.net.username || "").toLowerCase();
      return !sameSession && !sameUser && !sameUsername;
    });
    const newestByIdentity = new Map();
    for (const p of filtered) {
      const key = String(p.user_id || p.username || p.session_id || "");
      const prev = newestByIdentity.get(key);
      if (!prev || Number(p.updated_at_ms || 0) >= Number(prev.updated_at_ms || 0)) {
        newestByIdentity.set(key, p);
      }
    }
    state.net.remotePlayers = [...newestByIdentity.values()];
    resetBackgroundNetFailures();
  } finally {
    state.net.presencePollInFlight = false;
  }
}

function applyAuthoritativeWorldClock(clock) {
  if (!clock || typeof clock !== "object") {
    return;
  }
  const w = state.sim.world;
  state.sim.tick = Number(clock.tick) >>> 0;
  w.time_m = Number(clock.time_m) >>> 0;
  w.time_h = Number(clock.time_h) >>> 0;
  w.date_d = Number(clock.date_d) >>> 0;
  w.date_m = Number(clock.date_m) >>> 0;
  w.date_y = Number(clock.date_y) >>> 0;
}

async function netPollWorldClock() {
  if (!isNetAuthenticated()) {
    return;
  }
  if (state.net.clockPollInFlight) {
    return;
  }
  state.net.clockPollInFlight = true;
  try {
    const out = await netRequest("/api/world/clock", { method: "GET" }, true);
    applyAuthoritativeWorldClock(out);
    resetBackgroundNetFailures();
  } finally {
    state.net.clockPollInFlight = false;
  }
}

async function netFetchWorldObjectsAtCell(x, y, z) {
  if (!isNetAuthenticated()) {
    return null;
  }
  const out = await netRequest(
    `/api/world/objects?x=${encodeURIComponent(x | 0)}&y=${encodeURIComponent(y | 0)}&z=${encodeURIComponent(z | 0)}&radius=0&limit=128&projection=footprint&include_footprint=1`,
    { method: "GET" },
    true
  );
  return out && typeof out === "object" ? out : null;
}

function setAccountModalOpen(open) {
  if (!netAccountModal) {
    return;
  }
  const visible = !!open;
  netAccountModal.classList.toggle("hidden", !visible);
  netAccountModal.setAttribute("aria-hidden", visible ? "false" : "true");
}

function initNetPanel() {
  let savedBase = "http://127.0.0.1:8081";
  let savedUser = "avatar";
  let savedPass = "quest123";
  let savedEmail = "";
  let savedPassVisible = "off";
  let savedChar = "Avatar";
  let savedMaintenance = "off";
  try {
    savedBase = localStorage.getItem(NET_API_BASE_KEY) || savedBase;
    savedUser = localStorage.getItem(NET_USERNAME_KEY) || savedUser;
    savedPass = localStorage.getItem(NET_PASSWORD_KEY) || savedPass;
    savedEmail = localStorage.getItem(NET_EMAIL_KEY) || savedEmail;
    savedPassVisible = localStorage.getItem(NET_PASSWORD_VISIBLE_KEY) || savedPassVisible;
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
  if (netPasswordInput) {
    netPasswordInput.value = savedPass;
    netPasswordInput.type = savedPassVisible === "on" ? "text" : "password";
  }
  if (netPasswordToggleButton) {
    const isVisible = savedPassVisible === "on";
    netPasswordToggleButton.textContent = isVisible ? "Hide" : "Show";
    netPasswordToggleButton.title = isVisible ? "Hide password" : "Show password";
  }
  if (netEmailInput) {
    netEmailInput.value = savedEmail;
  }
  if (netCharacterNameInput) {
    netCharacterNameInput.value = savedChar;
  }
  populateNetAccountSelect();
  if (netAccountSelect && netAccountSelect.value) {
    const key = netAccountSelect.value;
    const profile = loadNetProfiles().find((row) => profileKey(row) === key);
    if (profile) {
      applyNetProfile(profile);
    }
  }
  state.net.apiBase = savedBase;
  state.net.username = savedUser;
  state.net.email = savedEmail;
  state.net.characterName = savedChar;
  setNetStatus("idle", "Not logged in.");

  if (netApiBaseInput) {
    netApiBaseInput.addEventListener("input", () => {
      try {
        localStorage.setItem(NET_API_BASE_KEY, String(netApiBaseInput.value || ""));
      } catch (_err) {
        // ignore storage failures
      }
    });
  }
  if (netAccountSelect) {
    netAccountSelect.addEventListener("change", () => {
      const key = String(netAccountSelect.value || "");
      if (!key) {
        return;
      }
      const profile = loadNetProfiles().find((row) => profileKey(row) === key);
      if (profile) {
        applyNetProfile(profile);
      }
    });
  }
  if (netUsernameInput) {
    netUsernameInput.addEventListener("input", () => {
      try {
        localStorage.setItem(NET_USERNAME_KEY, String(netUsernameInput.value || ""));
      } catch (_err) {
        // ignore storage failures
      }
    });
  }
  if (netPasswordInput) {
    netPasswordInput.addEventListener("input", () => {
      try {
        localStorage.setItem(NET_PASSWORD_KEY, String(netPasswordInput.value || ""));
      } catch (_err) {
        // ignore storage failures
      }
    });
  }
  if (netCharacterNameInput) {
    netCharacterNameInput.addEventListener("input", () => {
      try {
        localStorage.setItem(NET_CHARACTER_NAME_KEY, String(netCharacterNameInput.value || ""));
      } catch (_err) {
        // ignore storage failures
      }
    });
  }
  if (netEmailInput) {
    netEmailInput.addEventListener("input", () => {
      try {
        localStorage.setItem(NET_EMAIL_KEY, String(netEmailInput.value || ""));
      } catch (_err) {
        // ignore storage failures
      }
    });
  }
  if (netPasswordToggleButton && netPasswordInput) {
    netPasswordToggleButton.addEventListener("click", () => {
      const show = netPasswordInput.type === "password";
      netPasswordInput.type = show ? "text" : "password";
      netPasswordToggleButton.textContent = show ? "Hide" : "Show";
      netPasswordToggleButton.title = show ? "Hide password" : "Show password";
      try {
        localStorage.setItem(NET_PASSWORD_VISIBLE_KEY, show ? "on" : "off");
      } catch (_err) {
        // ignore storage failures
      }
    });
  }

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
  updateNetAuthButton();
  if (netAccountOpenButton) {
    netAccountOpenButton.addEventListener("click", () => {
      populateNetAccountSelect();
      setAccountModalOpen(true);
    });
  }
  if (netAccountCloseButton) {
    netAccountCloseButton.addEventListener("click", () => setAccountModalOpen(false));
  }
  if (netAccountModalBackdrop) {
    netAccountModalBackdrop.addEventListener("click", () => setAccountModalOpen(false));
  }

  if (netLoginButton) {
    netLoginButton.addEventListener("click", async () => {
      if (isNetAuthenticated()) {
        netLogout();
        return;
      }
      try {
        await netLogin();
        setAccountModalOpen(false);
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
        diagBox.textContent = `Recovery email sent for ${out?.user?.username || "user"}.`;
      } catch (err) {
        setNetStatus("error", `Recovery failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Password recovery failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netSetEmailButton) {
    netSetEmailButton.addEventListener("click", async () => {
      try {
        const out = await netSetEmail();
        diagBox.className = "diag ok";
        const verified = !!out?.user?.email_verified;
        diagBox.textContent = verified
          ? `Recovery email set and verified (${out?.user?.email || ""}).`
          : `Recovery email set (${out?.user?.email || ""}). Verification required.`;
      } catch (err) {
        setNetStatus("error", `Set email failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Set email failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netSendVerifyButton) {
    netSendVerifyButton.addEventListener("click", async () => {
      try {
        await netSendEmailVerification();
        diagBox.className = "diag ok";
        diagBox.textContent = "Verification code sent to recovery email.";
      } catch (err) {
        setNetStatus("error", `Send code failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Send code failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netVerifyEmailButton) {
    netVerifyEmailButton.addEventListener("click", async () => {
      try {
        await netVerifyEmail();
        diagBox.className = "diag ok";
        diagBox.textContent = "Recovery email verified.";
      } catch (err) {
        setNetStatus("error", `Verify email failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Verify email failed: ${String(err.message || err)}`;
      }
    });
  }
  if (netChangePasswordButton) {
    netChangePasswordButton.addEventListener("click", async () => {
      try {
        await netChangePassword();
        diagBox.className = "diag ok";
        diagBox.textContent = "Account password updated.";
      } catch (err) {
        setNetStatus("error", `Change password failed: ${String(err.message || err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Change password failed: ${String(err.message || err)}`;
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
  if (next !== "avatar") {
    state.useCursorActive = false;
    state.targetVerb = "";
  }
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

function isChairObject(obj) {
  return !!obj && OBJECT_TYPES_CHAIR.has(obj.type);
}

function isBedObject(obj) {
  return !!obj && OBJECT_TYPES_BED.has(obj.type);
}

function isSolidEnvObject(obj) {
  return !!obj && OBJECT_TYPES_SOLID_ENV.has(obj.type);
}

function objectAnchorKey(obj) {
  return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff},${obj.type & 0x3ff}`;
}

function isObjectRemoved(sim, obj) {
  if (!sim || !obj) {
    return false;
  }
  return !!(sim.removedObjectKeys && sim.removedObjectKeys[objectAnchorKey(obj)]);
}

function markObjectRemoved(sim, obj) {
  if (!sim || !obj) {
    return;
  }
  if (!sim.removedObjectKeys) {
    sim.removedObjectKeys = {};
  }
  if (!sim.removedObjectAtTick) {
    sim.removedObjectAtTick = {};
  }
  const key = objectAnchorKey(obj);
  if (!sim.removedObjectKeys[key]) {
    sim.removedObjectKeys[key] = 1;
    sim.removedObjectAtTick[key] = Number(sim.tick) >>> 0;
    sim.removedObjectCount = (Number(sim.removedObjectCount) + 1) >>> 0;
  }
}

function inventoryKeyForObject(obj) {
  const typeHex = (obj.type & 0x3ff).toString(16).padStart(3, "0");
  const frameHex = (obj.frame & 0x3f).toString(16).padStart(2, "0");
  return `obj_${typeHex}_${frameHex}`;
}

function addObjectToInventory(sim, obj) {
  if (!sim.inventory) {
    sim.inventory = {};
  }
  const key = inventoryKeyForObject(obj);
  const prev = Number(sim.inventory[key]) >>> 0;
  sim.inventory[key] = (prev + 1) >>> 0;
}

function isLikelyPickupObjectType(type) {
  const t = type & 0x03ff;
  if (OBJECT_TYPES_DOOR.has(t)) return false;
  if (OBJECT_TYPES_CHAIR.has(t)) return false;
  if (OBJECT_TYPES_BED.has(t)) return false;
  if (OBJECT_TYPES_SOLID_ENV.has(t)) return false;
  if (OBJECT_TYPES_TOP_DECOR.has(t)) return false;
  return true;
}

function topWorldObjectAtCell(sim, tx, ty, tz, opts = {}) {
  if (!state.objectLayer) {
    return null;
  }
  const pickupOnly = !!opts.pickupOnly;
  const list = state.objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const o = list[i];
    if (!o.renderable || isObjectRemoved(sim, o)) {
      continue;
    }
    if (pickupOnly && !isLikelyPickupObjectType(o.type)) {
      continue;
    }
    return o;
  }
  return null;
}

function nearestTalkTargetAtCell(sim, tx, ty, tz) {
  if (!state.entityLayer || !Array.isArray(state.entityLayer.entries)) {
    return null;
  }
  for (const e of state.entityLayer.entries) {
    if ((e.z | 0) !== (tz | 0)) continue;
    if ((e.x | 0) !== (tx | 0)) continue;
    if ((e.y | 0) !== (ty | 0)) continue;
    if ((e.id | 0) === AVATAR_ENTITY_ID) continue;
    return e;
  }
  return null;
}

function tryLookAtCell(sim, tx, ty) {
  if (!state.mapCtx) {
    return false;
  }
  const tz = sim.world.map_z | 0;
  const dx = Math.abs((sim.world.map_x | 0) - (tx | 0));
  const dy = Math.abs((sim.world.map_y | 0) - (ty | 0));
  if (Math.max(dx, dy) > 7) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Look: ${tx},${ty} is out of range.`;
    return false;
  }
  const obj = topWorldObjectAtCell(sim, tx, ty, tz);
  if (obj) {
    diagBox.className = "diag ok";
    diagBox.textContent = `Look: object type 0x${(obj.type & 0x3ff).toString(16)} frame ${obj.frame | 0} at ${tx},${ty},${tz}.`;
    return true;
  }
  const actor = nearestTalkTargetAtCell(sim, tx, ty, tz);
  if (actor) {
    diagBox.className = "diag ok";
    diagBox.textContent = `Look: actor 0x${(actor.type & 0x3ff).toString(16)} at ${tx},${ty},${tz}.`;
    return true;
  }
  const tile = state.mapCtx.tileAt(tx | 0, ty | 0, tz | 0) & 0xffff;
  diagBox.className = "diag ok";
  diagBox.textContent = `Look: tile 0x${tile.toString(16)} at ${tx},${ty},${tz}.`;
  return true;
}

function tryTalkAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  const dx = Math.abs((sim.world.map_x | 0) - (tx | 0));
  const dy = Math.abs((sim.world.map_y | 0) - (ty | 0));
  if (Math.max(dx, dy) > 1) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Talk: target must be adjacent (${tx},${ty}).`;
    return false;
  }
  const actor = nearestTalkTargetAtCell(sim, tx, ty, tz);
  if (!actor) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Talk: nobody there at ${tx},${ty},${tz}.`;
    return false;
  }
  diagBox.className = "diag ok";
  diagBox.textContent = `Talk: actor 0x${(actor.type & 0x3ff).toString(16)} at ${tx},${ty},${tz} (dialogue system pending).`;
  return true;
}

function tryGetAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  const dx = Math.abs((sim.world.map_x | 0) - (tx | 0));
  const dy = Math.abs((sim.world.map_y | 0) - (ty | 0));
  if (Math.max(dx, dy) > 1) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Get: target must be adjacent (${tx},${ty}).`;
    return false;
  }
  const obj = topWorldObjectAtCell(sim, tx, ty, tz, { pickupOnly: true });
  if (!obj) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Get: nothing portable at ${tx},${ty},${tz}.`;
    return false;
  }
  addObjectToInventory(sim, obj);
  markObjectRemoved(sim, obj);
  const invKey = inventoryKeyForObject(obj);
  const count = Number(sim.inventory[invKey]) >>> 0;
  diagBox.className = "diag ok";
  diagBox.textContent = `Get: picked 0x${(obj.type & 0x3ff).toString(16)} at ${tx},${ty},${tz} (inv ${invKey}=${count}).`;
  return true;
}

function findObjectByAnchor(anchor) {
  if (!anchor || !state.objectLayer) {
    return null;
  }
  const overlays = state.objectLayer.objectsAt(anchor.x | 0, anchor.y | 0, anchor.z | 0);
  for (const o of overlays) {
    if ((o.order | 0) === (anchor.order | 0) && (o.type | 0) === (anchor.type | 0)) {
      return o;
    }
  }
  return null;
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

function resolveLegacyFootprintTile(sim, obj) {
  return resolveDoorTileId(sim, obj);
}

function resolveDoorTileIdForVisibility(sim, obj) {
  return resolveDoorTileId(sim, obj);
}

function objectFootprintTiles(sim, o, ox, oy) {
  const wrap10 = (v) => v & 0x3ff;
  const sx = wrap10(ox);
  const sy = wrap10(oy);
  const tileId = resolveDoorTileId(sim, o) & 0xffff;
  const tf = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
  const out = [{ x: sx, y: sy, tileId }];
  if (tf & 0x80) {
    out.push({ x: wrap10(sx - 1), y: sy, tileId: (tileId - 1) & 0xffff });
  }
  if (tf & 0x40) {
    const upTile = (tf & 0x80) ? (tileId - 2) : (tileId - 1);
    out.push({ x: sx, y: wrap10(sy - 1), tileId: upTile & 0xffff });
  }
  if ((tf & 0xc0) === 0xc0) {
    out.push({ x: wrap10(sx - 1), y: wrap10(sy - 1), tileId: (tileId - 3) & 0xffff });
  }
  return out;
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
      const cells = objectFootprintTiles(sim, o, ox, oy);
      const isDoor = isCloseableDoorObject(o);
      const doorOpen = isDoor ? isDoorFrameOpen(o, resolvedDoorFrame(sim, o)) : false;
      for (const c of cells) {
        if (c.x !== tx || c.y !== ty) {
          continue;
        }
        if (isDoor) {
          if (!doorOpen) {
            return true;
          }
          const ctf = state.tileFlags ? (state.tileFlags[c.tileId & 0x07ff] ?? 0) : 0;
          if ((ctf & 0x04) !== 0 || (ctf & 0x20) !== 0) {
            return true;
          }
          continue;
        }
        if (isSolidEnvObject(o)) {
          return true;
        }
        if (isImplicitSolidObjectTile(o.type, c.tileId)) {
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

function clearAvatarPose(sim) {
  sim.avatarPose = "stand";
  sim.avatarPoseAnchor = null;
}

function furnitureAtCell(sim, tx, ty) {
  if (!state.objectLayer) {
    return null;
  }
  const tz = sim.world.map_z | 0;
  const overlays = [];
  const seen = new Set();
  const addCandidatesAt = (sx, sy) => {
    for (const o of state.objectLayer.objectsAt(sx, sy, tz)) {
      if (!isChairObject(o) && !isBedObject(o)) {
        continue;
      }
      const cells = furnitureOccupancyCells(o);
      if (!cells.some((c) => (c.x | 0) === (tx | 0) && (c.y | 0) === (ty | 0))) {
        continue;
      }
      const key = `${o.order | 0}:${o.type | 0}:${o.x | 0}:${o.y | 0}:${o.z | 0}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      overlays.push(o);
    }
  };
  addCandidatesAt(tx, ty);
  addCandidatesAt((tx + 1) | 0, ty | 0);
  addCandidatesAt(tx | 0, (ty + 1) | 0);
  addCandidatesAt((tx + 1) | 0, (ty + 1) | 0);

  const chairs = [];
  const beds = [];
  for (const o of overlays) {
    if (isChairObject(o)) {
      chairs.push(o);
    } else if (isBedObject(o)) {
      beds.push(o);
    }
  }
  if (chairs.length > 0) {
    return chairs[0];
  }
  if (beds.length === 1) {
    return beds[0];
  }
  if (beds.length > 1) {
    const fromX = sim.world.map_x | 0;
    const fromY = sim.world.map_y | 0;
    beds.sort((a, b) => {
      const as = bedInteractionScore(a, fromX, fromY);
      const bs = bedInteractionScore(b, fromX, fromY);
      if (as.valid !== bs.valid) {
        return as.valid ? -1 : 1;
      }
      if (as.dist !== bs.dist) {
        return as.dist - bs.dist;
      }
      return (a.order | 0) - (b.order | 0);
    });
    return beds[0];
  }
  return null;
}

function tryInteractFurnitureObject(sim, o) {
  if (!o) {
    if (sim.avatarPose !== "stand") {
      clearAvatarPose(sim);
      diagBox.className = "diag ok";
      diagBox.textContent = "Stood up.";
      return true;
    }
    return false;
  }

  const nextPose = isBedObject(o) ? "sleep" : "sit";
  const currentKey = sim.avatarPoseAnchor
    ? `${sim.avatarPoseAnchor.x & 0x3ff},${sim.avatarPoseAnchor.y & 0x3ff},${sim.avatarPoseAnchor.z & 0x0f},${sim.avatarPoseAnchor.order & 0xffff},${sim.avatarPoseAnchor.type & 0x3ff}`
    : "";
  const targetKey = objectAnchorKey(o);
  if (sim.avatarPose === nextPose && currentKey === targetKey) {
    clearAvatarPose(sim);
    diagBox.className = "diag ok";
    diagBox.textContent = "Stood up.";
    return true;
  }

  const fromX = sim.world.map_x | 0;
  const fromY = sim.world.map_y | 0;
  sim.avatarPose = nextPose;
  sim.avatarPoseAnchor = {
    x: o.x | 0,
    y: o.y | 0,
    z: o.z | 0,
    order: o.order | 0,
    type: o.type | 0
  };
  if (nextPose === "sleep" && isBedObject(o)) {
    const sleepCell = preferredSleepCellForBed(o, fromX, fromY);
    sim.world.map_x = sleepCell.x | 0;
    sim.world.map_y = sleepCell.y | 0;
    sim.world.map_z = sleepCell.z | 0;
  } else {
    // Align avatar position to interacted furniture tile so sit/sleep is spatially coherent.
    sim.world.map_x = o.x | 0;
    sim.world.map_y = o.y | 0;
    sim.world.map_z = o.z | 0;
  }
  diagBox.className = "diag ok";
  diagBox.textContent = nextPose === "sleep"
    ? `Sleeping at ${o.x},${o.y},${o.z}`
    : `Sitting at ${o.x},${o.y},${o.z}`;
  return true;
}

function tryInteractFurnitureInFacingDirection(sim, dx, dy) {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryToggleDoorAtCell(sim, tx, ty, tz) {
  if (!state.objectLayer) {
    return false;
  }
  const overlays = state.objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
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

function tryInteractAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  if (tryToggleDoorAtCell(sim, tx, ty, tz)) {
    return true;
  }
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryInteractFacing(sim, dx, dy) {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  if (tryInteractAtCell(sim, tx, ty)) {
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
  if (!state.net.resumeFromSnapshot) {
    placeCameraAtPresetId("avatar_start");
  }
  state.sessionStarted = true;
  const resumed = !!state.net.resumeFromSnapshot;
  state.net.resumeFromSnapshot = false;
  diagBox.className = "diag ok";
  diagBox.textContent = resumed
    ? "Journey Onward: resumed at last saved position."
    : "Journey Onward: loaded at the legacy avatar start position.";
}

function returnToTitleMenu() {
  if (!state.sessionStarted) {
    return;
  }
  state.queue.length = 0;
  state.useCursorActive = false;
  state.targetVerb = "";
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
    g.fillText("mode: legacy", textX, y);
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

function clampParityRadius(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 12;
  }
  return Math.max(1, Math.min(32, Math.floor(n)));
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function captureParitySnapshotJson() {
  if (!state.sessionStarted || !state.mapCtx) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Parity snapshot unavailable: session not started.";
    return;
  }
  const radius = clampParityRadius(parityRadiusInput ? parityRadiusInput.value : 12);
  const cx = state.sim.world.map_x | 0;
  const cy = state.sim.world.map_y | 0;
  const cz = state.sim.world.map_z | 0;
  const viewW = (radius * 2) + 1;
  const viewH = (radius * 2) + 1;
  const startX = cx - radius;
  const startY = cy - radius;
  const viewCtx = buildLegacyViewContext(startX, startY, cz);
  const overlayBuild = buildOverlayCellsModel({
    viewW,
    viewH,
    startX,
    startY,
    wz: cz,
    viewCtx,
    objectLayer: state.tileSet ? state.objectLayer : null,
    tileFlags: state.tileFlags,
    resolveAnimatedObjectTile,
    resolveFootprintTile: (obj) => resolveLegacyFootprintTile(state.sim, obj),
    hasWallTerrain,
    injectLegacyOverlays: injectLegacyOverlaySpecials,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
  });
  const overlayCells = overlayBuild.overlayCells || [];
  const cells = [];
  for (let gy = 0; gy < viewH; gy += 1) {
    for (let gx = 0; gx < viewW; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      const rawTile = state.mapCtx.tileAt(wx, wy, cz) & 0xffff;
      const animTile = resolveAnimatedTile(rawTile) & 0xffff;
      const tileFlag = state.tileFlags ? (state.tileFlags[rawTile & 0x07ff] ?? 0) : 0;
      const terrain = state.terrainType ? (state.terrainType[rawTile & 0x07ff] ?? 0) : 0;
      const overlays = (overlayCells[(gy * viewW) + gx] || []).map((o, idx) => ({
        idx,
        tileHex: hex(o.tileId),
        floor: o.floor ? 1 : 0,
        occluder: o.occluder ? 1 : 0,
        sourceX: o.sourceX | 0,
        sourceY: o.sourceY | 0,
        sourceType: String(o.sourceType || "main"),
        sourceObjTypeHex: hex(o.sourceObjType ?? 0)
      }));
      const objects = state.objectLayer
        ? state.objectLayer.objectsAt(wx, wy, cz).map((o, idx) => {
          const tileId = resolveDoorTileId(state.sim, o) & 0xffff;
          const tf = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
          return {
            idx,
            typeHex: hex(o.type),
            frame: o.frame | 0,
            tileHex: hex(tileId),
            tileFlagsHex: hex(tf),
            order: o.order | 0
          };
        })
        : [];
      cells.push({
        x: wx,
        y: wy,
        z: cz,
        map: {
          rawHex: hex(rawTile),
          animHex: hex(animTile),
          tileFlagsHex: hex(tileFlag),
          terrainHex: hex(terrain)
        },
        visibility: {
          visible: viewCtx ? (viewCtx.visibleAtWorld(wx, wy) ? 1 : 0) : 1,
          open: viewCtx ? (viewCtx.openAtWorld(wx, wy) ? 1 : 0) : 0
        },
        overlay: overlays,
        objects
      });
    }
  }
  const payload = {
    kind: "VirtueMachineRoomParitySnapshot",
    capturedAt: new Date().toISOString(),
    tick: state.sim.tick >>> 0,
    center: { x: cx, y: cy, z: cz },
    radius,
    bounds: {
      x0: startX,
      y0: startY,
      x1: startX + viewW - 1,
      y1: startY + viewH - 1,
      z: cz
    },
    parity: {
      overlayCount: overlayBuild.overlayCount | 0,
      hiddenSuppressedCount: overlayBuild.parity?.hiddenSuppressedCount | 0,
      spillOutOfBoundsCount: overlayBuild.parity?.spillOutOfBoundsCount | 0,
      unsortedSourceCount: overlayBuild.parity?.unsortedSourceCount | 0
    },
    cells
  };
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2));
  if (copied) {
    setCopyStatus(true);
    diagBox.className = "diag ok";
    diagBox.textContent = `Copied parity snapshot to clipboard (center=${cx},${cy},${cz} radius=${radius}).`;
  } else {
    setCopyStatus(false, "parity snapshot copy failed");
    diagBox.className = "diag warn";
    diagBox.textContent = "Failed to copy parity snapshot to clipboard.";
  }
}

function cloneSimState(sim) {
  return {
    tick: sim.tick >>> 0,
    rngState: sim.rngState >>> 0,
    worldFlags: sim.worldFlags >>> 0,
    commandsApplied: sim.commandsApplied >>> 0,
    doorOpenStates: { ...(sim.doorOpenStates ?? {}) },
    removedObjectKeys: { ...(sim.removedObjectKeys ?? {}) },
    removedObjectAtTick: { ...(sim.removedObjectAtTick ?? {}) },
    removedObjectCount: Number(sim.removedObjectCount) >>> 0,
    inventory: { ...(sim.inventory ?? {}) },
    avatarPose: String(sim.avatarPose || "stand"),
    avatarPoseAnchor: sim.avatarPoseAnchor ? { ...sim.avatarPoseAnchor } : null,
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

function expireRemovedWorldProps(sim, tickNow) {
  const removed = sim.removedObjectKeys;
  if (!removed || typeof removed !== "object") {
    sim.removedObjectCount = 0;
    return;
  }
  const atTick = sim.removedObjectAtTick || {};
  let remaining = 0;
  for (const key of Object.keys(removed)) {
    if (!removed[key]) {
      delete removed[key];
      delete atTick[key];
      continue;
    }
    const removedTick = Number(atTick[key]) >>> 0;
    const age = (tickNow - removedTick) >>> 0;
    if (age >= WORLD_PROP_RESET_TICKS) {
      delete removed[key];
      delete atTick[key];
      continue;
    }
    remaining += 1;
  }
  sim.removedObjectAtTick = atTick;
  sim.removedObjectCount = remaining >>> 0;
}

function applyCommand(sim, cmd) {
  if (cmd.type === 1) {
    if (sim.avatarPose !== "stand") {
      clearAvatarPose(sim);
    }
    const nx = clampI32(sim.world.map_x + cmd.arg0, -4096, 4095);
    const ny = clampI32(sim.world.map_y + cmd.arg1, -4096, 4095);
    if (state.movementMode === "avatar") {
      if (!isBlockedAt(sim, nx, ny, sim.world.map_z)) {
        sim.world.map_x = nx;
        sim.world.map_y = ny;
        state.avatarLastMoveTick = sim.tick >>> 0;
      } else {
        // QoL: walking into a chair/bed acts like interaction and triggers sit/sleep.
        tryInteractFurnitureObject(sim, furnitureAtCell(sim, nx, ny));
      }
    } else {
      sim.world.map_x = nx;
      sim.world.map_y = ny;
    }
  } else if (cmd.type === 2) {
    if (state.movementMode === "avatar") {
      tryInteractFacing(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === 3) {
    if (state.movementMode === "avatar") {
      const tx = cmd.arg0 | 0;
      const ty = cmd.arg1 | 0;
      const dx = Math.sign(tx - (sim.world.map_x | 0));
      const dy = Math.sign(ty - (sim.world.map_y | 0));
      if (dx !== 0 || dy !== 0) {
        state.avatarFacingDx = dx;
        state.avatarFacingDy = dy;
      }
      tryInteractAtCell(sim, tx, ty);
    }
  } else if (cmd.type === 4) {
    if (state.movementMode === "avatar") {
      tryLookAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === 5) {
    if (state.movementMode === "avatar") {
      tryTalkAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === 6) {
    if (state.movementMode === "avatar") {
      tryGetAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
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
  expireRemovedWorldProps(sim, nextTick);
  if (!isNetAuthenticated() && (nextTick % TICKS_PER_MINUTE) === 0) {
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
  const avatarPose = sim.avatarPose === "sleep" ? 2 : (sim.avatarPose === "sit" ? 1 : 0);
  h = hashMixU32(h, avatarPose);
  if (sim.avatarPoseAnchor) {
    h = hashMixU32(h, 1);
    h = hashMixU32(h, asU32Signed(sim.avatarPoseAnchor.x));
    h = hashMixU32(h, asU32Signed(sim.avatarPoseAnchor.y));
    h = hashMixU32(h, asU32Signed(sim.avatarPoseAnchor.z));
    h = hashMixU32(h, asU32Signed(sim.avatarPoseAnchor.order));
    h = hashMixU32(h, asU32Signed(sim.avatarPoseAnchor.type));
  } else {
    h = hashMixU32(h, 0);
  }
  const doorKeys = Object.keys(sim.doorOpenStates ?? {}).sort();
  h = hashMixU32(h, doorKeys.length);
  for (const k of doorKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32(h, k.charCodeAt(i));
    }
    h = hashMixU32(h, sim.doorOpenStates[k] ? 1 : 0);
  }
  const removedKeys = Object.keys(sim.removedObjectKeys ?? {}).sort();
  h = hashMixU32(h, removedKeys.length);
  for (const k of removedKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32(h, k.charCodeAt(i));
    }
    h = hashMixU32(h, sim.removedObjectKeys[k] ? 1 : 0);
  }
  const removedAtTick = sim.removedObjectAtTick ?? {};
  h = hashMixU32(h, removedKeys.length);
  for (const k of removedKeys) {
    h = hashMixU32(h, Number(removedAtTick[k]) >>> 0);
  }
  h = hashMixU32(h, Number(sim.removedObjectCount) >>> 0);
  const inventoryKeys = Object.keys(sim.inventory ?? {}).sort();
  h = hashMixU32(h, inventoryKeys.length);
  for (const k of inventoryKeys) {
    for (let i = 0; i < k.length; i += 1) {
      h = hashMixU32(h, k.charCodeAt(i));
    }
    h = hashMixU32(h, Number(sim.inventory[k]) >>> 0);
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

function appendCommandLog(cmd) {
  state.commandLog.push({ ...cmd });
  const extra = state.commandLog.length - COMMAND_LOG_MAX;
  if (extra > 0) {
    state.commandLog.splice(0, extra);
  }
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
      appendCommandLog(cmd);
      return;
    }
  }

  for (let i = state.queue.length - 1; i >= 0; i -= 1) {
    if (state.queue[i].type === 1) {
      state.queue.splice(i, 1);
    }
  }

  state.queue.push(cmd);
  appendCommandLog(cmd);
}

function queueInteractDoor() {
  if (state.movementMode !== "avatar") {
    return;
  }
  const bytes = packCommand(state.sim.tick + 1, 2, state.avatarFacingDx | 0, state.avatarFacingDy | 0);
  const cmd = unpackCommand(bytes);
  state.queue.push(cmd);
  appendCommandLog(cmd);
}

function queueInteractAtCell(wx, wy) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const tx = wx | 0;
  const ty = wy | 0;
  const bytes = packCommand(state.sim.tick + 1, 3, tx, ty);
  const cmd = unpackCommand(bytes);
  state.queue.push(cmd);
  appendCommandLog(cmd);
}

function queueLegacyTargetVerb(verb, wx, wy) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const v = String(verb || "").toLowerCase();
  let type = 0;
  if (v === LEGACY_TARGET_VERB.LOOK) type = 4;
  else if (v === LEGACY_TARGET_VERB.TALK) type = 5;
  else if (v === LEGACY_TARGET_VERB.GET) type = 6;
  if (!type) {
    return;
  }
  const tx = wx | 0;
  const ty = wy | 0;
  const bytes = packCommand(state.sim.tick + 1, type, tx, ty);
  const cmd = unpackCommand(bytes);
  state.queue.push(cmd);
  appendCommandLog(cmd);
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

function isTileBackground(tileId) {
  if (!state.tileFlags2) {
    return false;
  }
  return (state.tileFlags2[tileId & 0x07ff] & 0x20) !== 0;
}

function buildLegacyViewContext(startX, startY, wz) {
  if (!state.mapCtx) {
    return null;
  }

  const PAD = 4;
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
  const areaLight = Array.from({ length: H }, () => new Uint8Array(W));
  const LEGACY_LIGHT_FALLOFF = [
    [0, 1, 2, 3, 4, 5, 6, 7],
    [1, 1, 2, 3, 4, 5, 6, 7],
    [2, 2, 3, 4, 5, 6, 6, 7],
    [3, 3, 4, 4, 5, 6, 7, 8],
    [4, 4, 5, 5, 6, 7, 7, 8],
    [5, 5, 6, 6, 7, 7, 8, 9],
    [6, 6, 6, 7, 7, 8, 8, 9],
    [7, 7, 7, 8, 8, 9, 9, 10]
  ];

  const tileFlagsFor = (tileId) => {
    if (!state.tileFlags) {
      return 0;
    }
    return state.tileFlags[tileId & 0x7ff] ?? 0;
  };
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const clampToLegacyLightRange = (n) => {
    const v = n | 0;
    if (v < 0) return 0;
    if (v > 4) return 4;
    return v;
  };
  const ambientLightLevel = () => {
    const world = state?.sim?.world || {};
    const hour = Number(world.time_h) >>> 0;
    const minute = Number(world.time_m) >>> 0;
    const dateD = Number(world.date_d) >>> 0;
    const dateM = Number(world.date_m) >>> 0;
    const isEclipse = (dateD === 1) && ((dateM % 3) === 0);
    if (isEclipse || !(hour >= 5 && hour <= 19) || (wz > 0 && wz < 5)) {
      return 0;
    }
    if (hour === 5) {
      return clampToLegacyLightRange(Math.floor(minute / 10) + 1);
    }
    if (hour === 19) {
      return clampToLegacyLightRange(Math.floor((59 - minute) / 10) + 1);
    }
    return 7;
  };
  const legacyLightDistance = (dx, dy) => {
    const ax = Math.min(7, Math.abs(dx | 0));
    const ay = Math.min(7, Math.abs(dy | 0));
    return LEGACY_LIGHT_FALLOFF[ax][ay] | 0;
  };
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
      if (isTileBackground(tileId)) {
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
    const sourceLight = tileFlagsFor(tileId) & 0x03;
    if (sourceLight > 0 && inBounds(gx, gy)) {
      const prior = flags[gy][gx] & 0x03;
      if (prior < sourceLight) {
        flags[gy][gx] = (flags[gy][gx] & ~0x03) | sourceLight;
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

  const ambient = ambientLightLevel();
  for (let gy = 0; gy < H; gy += 1) {
    for (let gx = 0; gx < W; gx += 1) {
      if ((flags[gy][gx] & FLAG_VISIBLE) === 0) {
        continue;
      }
      const base = clampToLegacyLightRange(4 - legacyLightDistance(gx - C_X, gy - C_Y) + ambient);
      areaLight[gy][gx] = (areaLight[gy][gx] + base) & 0xff;
    }
  }
  if (ambient < 7) {
    for (let sy = 0; sy < H; sy += 1) {
      for (let sx = 0; sx < W; sx += 1) {
        if ((flags[sy][sx] & FLAG_VISIBLE) === 0) {
          continue;
        }
        const source = flags[sy][sx] & 0x03;
        if (source <= 0) {
          continue;
        }
        for (let gy = Math.max(0, sy - 3); gy <= Math.min(H - 1, sy + 3); gy += 1) {
          for (let gx = Math.max(0, sx - 3); gx <= Math.min(W - 1, sx + 3); gx += 1) {
            if ((flags[gy][gx] & FLAG_VISIBLE) === 0) {
              continue;
            }
            const add = clampToLegacyLightRange(source - legacyLightDistance(gx - sx, gy - sy));
            if (add > 0) {
              areaLight[gy][gx] = (areaLight[gy][gx] + add) & 0xff;
            }
          }
        }
      }
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
  const areaLightAtWorld = (wx, wy) => {
    const gx = wx - startX + PAD;
    const gy = wy - startY + PAD;
    if (!inBounds(gx, gy)) {
      return 0;
    }
    return areaLight[gy][gx] | 0;
  };

  return { visibleAtWorld, wallAtWorld, openAtWorld, areaLightAtWorld };
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
  return applyLegacyCornerVariant(rawTile, wx, wy, wz, viewCtx) & 0xffff;
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

  if (state.objectLayer && state.tileFlags2) {
    const visibleAtWorld = viewCtx && typeof viewCtx.visibleAtWorld === "function"
      ? viewCtx.visibleAtWorld.bind(viewCtx)
      : null;
    const applyBg = (wx, wy, tileId, sourceX, sourceY) => {
      const gx = (wx | 0) - startX;
      const gy = (wy | 0) - startY;
      if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
        return;
      }
      if (visibleAtWorld && !visibleAtWorld(sourceX | 0, sourceY | 0)) {
        return;
      }
      if (!isTileBackground(tileId)) {
        return;
      }
      const idx = cellIndex(gx, gy);
      rawTiles[idx] = tileId & 0xffff;
      displayTiles[idx] = tileId & 0xffff;
    };

    const processObject = (o) => {
      if (!o || !o.renderable) {
        return;
      }
      const wx = o.x | 0;
      const wy = o.y | 0;
      if (visibleAtWorld && !visibleAtWorld(wx, wy)) {
        return;
      }
      const animObjTile = resolveAnimatedObjectTile(o);
      if (animObjTile < 0) {
        return;
      }
      const footprintTile = resolveLegacyFootprintTile(state.sim, o) & 0xffff;
      applyBg(wx, wy, animObjTile, wx, wy);
      const tf = state.tileFlags ? (state.tileFlags[footprintTile & 0x07ff] ?? 0) : 0;
      if (tf & 0x80) {
        applyBg(wx - 1, wy, footprintTile - 1, wx, wy);
        if (tf & 0x40) {
          applyBg(wx, wy - 1, footprintTile - 2, wx, wy);
          applyBg(wx - 1, wy - 1, footprintTile - 3, wx, wy);
        }
      } else if (tf & 0x40) {
        applyBg(wx, wy - 1, footprintTile - 1, wx, wy);
      }
    };

    if (typeof state.objectLayer.objectsInWindowLegacyOrder === "function") {
      const stream = state.objectLayer.objectsInWindowLegacyOrder(startX, startY, VIEW_W + 1, VIEW_H + 1, wz);
      for (const o of stream) {
        processObject(o);
      }
    } else {
      for (let gy = 0; gy < VIEW_H; gy += 1) {
        for (let gx = 0; gx < VIEW_W; gx += 1) {
          const wx = startX + gx;
          const wy = startY + gy;
          const overlays = state.objectLayer.objectsAt(wx, wy, wz);
          for (const o of overlays) {
            processObject(o);
          }
        }
      }
    }
  }

  return { rawTiles, displayTiles };
}

function buildBaseTileBuffers(startX, startY, wz, viewCtx) {
  const base = buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx);
  base.debug = null;
  return base;
}

function avatarFacingFrameOffset() {
  if (state.avatarFacingDy < 0) return 0;
  if (state.avatarFacingDx > 0) return 1;
  if (state.avatarFacingDy > 0) return 2;
  return 3;
}

function sleepFrameOffsetForBed(bedObj) {
  if (!bedObj) {
    return 0;
  }
  return sleepFrameOffsetForBedAtCell(bedObj, bedObj.x | 0, bedObj.y | 0);
}

function tileFlagsForTile(tileId) {
  if (!state.tileFlags) {
    return 0;
  }
  return state.tileFlags[tileId & 0x07ff] ?? 0;
}

function furnitureOccupancyCells(obj) {
  if (!obj) {
    return [];
  }
  const cells = [{ x: obj.x | 0, y: obj.y | 0 }];
  const tileId = ((obj.baseTile | 0) + (obj.frame | 0)) & 0xffff;
  const tf = tileFlagsForTile(tileId);
  if (tf & 0x80) {
    cells.push({ x: (obj.x | 0) - 1, y: obj.y | 0 });
  }
  if (tf & 0x40) {
    cells.push({ x: obj.x | 0, y: (obj.y | 0) - 1 });
  }
  if ((tf & 0xc0) === 0xc0) {
    cells.push({ x: (obj.x | 0) - 1, y: (obj.y | 0) - 1 });
  }
  return cells;
}

function sleepBedCellFrameOffset(bedObj, wx, wy) {
  if (!bedObj) {
    return 0;
  }
  const bx = bedObj.x | 0;
  const by = bedObj.y | 0;
  const tileId = ((bedObj.baseTile | 0) + (bedObj.frame | 0)) & 0xffff;
  const tf = tileFlagsForTile(tileId);
  const hasDoubleH = (tf & 0x80) !== 0;
  const hasDoubleV = (tf & 0x40) !== 0;

  if (wx === bx && wy === by) {
    return 0;
  }
  if (hasDoubleH && wx === (bx - 1) && wy === by) {
    return 1;
  }
  if (hasDoubleV && wx === bx && wy === (by - 1)) {
    return hasDoubleH ? 2 : 1;
  }
  if (hasDoubleH && hasDoubleV && wx === (bx - 1) && wy === (by - 1)) {
    return 3;
  }
  return 0;
}

function preferredSleepCellForBed(bedObj, fromX, fromY) {
  const cells = furnitureOccupancyCells(bedObj);
  if (!cells.length) {
    return { x: bedObj.x | 0, y: bedObj.y | 0, z: bedObj.z | 0 };
  }
  let best = cells[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    const normalized = (((bedObj.frame | 0) - sleepBedCellFrameOffset(bedObj, cell.x, cell.y)) & 0x07);
    const legacySleepValid = normalized === 0 || normalized === 6;
    const dist = Math.abs((fromX | 0) - cell.x) + Math.abs((fromY | 0) - cell.y);
    const score = (legacySleepValid ? 0 : 1000) + dist;
    if (score < bestScore) {
      best = cell;
      bestScore = score;
    }
  }
  return { x: best.x | 0, y: best.y | 0, z: bedObj.z | 0 };
}

function sleepFrameOffsetForBedAtCell(bedObj, wx, wy) {
  if (!bedObj) {
    return 0;
  }
  /* Legacy AI_SLEEP path in seg_1E0F checks `(GetFrame(bed) - D_0658)`:
     only normalized 0 and 6 are valid sleep orientations, with 6 using frame 1. */
  const cellOffset = sleepBedCellFrameOffset(bedObj, wx | 0, wy | 0);
  const normalized = (((bedObj.frame | 0) - cellOffset) & 0x07);
  return normalized === 6 ? 1 : 0;
}

function bedInteractionScore(bedObj, fromX, fromY) {
  const cells = furnitureOccupancyCells(bedObj);
  if (!cells.length) {
    return { valid: false, dist: 0 };
  }
  let valid = false;
  let validDist = Number.POSITIVE_INFINITY;
  let anyDist = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    const dist = Math.abs((fromX | 0) - (cell.x | 0)) + Math.abs((fromY | 0) - (cell.y | 0));
    if (dist < anyDist) {
      anyDist = dist;
    }
    const normalized = (((bedObj.frame | 0) - sleepBedCellFrameOffset(bedObj, cell.x | 0, cell.y | 0)) & 0x07);
    if (normalized === 0 || normalized === 6) {
      valid = true;
      if (dist < validDist) {
        validDist = dist;
      }
    }
  }
  return { valid, dist: valid ? validDist : anyDist };
}

function sleepBaseTileForEntity(entity) {
  if (!state.entityLayer || !state.entityLayer.baseTiles) {
    return entity.baseTile | 0;
  }
  const legacySleepBase = state.entityLayer.baseTiles[LEGACY_SLEEP_SHAPE_TYPE] ?? 0;
  return legacySleepBase > 0 ? (legacySleepBase | 0) : (entity.baseTile | 0);
}

function avatarRenderTileId() {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  if (state.sim.avatarPose === "sleep") {
    const sleepBase = sleepBaseTileForEntity(avatar);
    const bed = findObjectByAnchor(state.sim.avatarPoseAnchor);
    if (bed && isBedObject(bed)) {
      return (
        sleepBase
        + sleepFrameOffsetForBedAtCell(
          bed,
          state.sim.world.map_x | 0,
          state.sim.world.map_y | 0
        )
      ) & 0xffff;
    }
    return (sleepBase + 0) & 0xffff;
  }
  const walkMoving = state.avatarLastMoveTick >= 0 && ((state.sim.tick - state.avatarLastMoveTick) & 0xff) < 4;
  const dirGroup = avatarFacingFrameOffset();
  if (state.sim.avatarPose === "sit") {
    const chair = findObjectByAnchor(state.sim.avatarPoseAnchor);
    if (chair && isChairObject(chair)) {
      const chairFrame = (chair.frame | 0) & 0x03;
      return (avatar.baseTile + 3 + (chairFrame << 2)) & 0xffff;
    }
    return (avatar.baseTile + (dirGroup << 2) + 0) & 0xffff;
  }
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

function entityPoseAt(entity) {
  if (!state.objectLayer) {
    return "stand";
  }
  const overlays = state.objectLayer.objectsAt(entity.x | 0, entity.y | 0, entity.z | 0);
  for (const o of overlays) {
    if (isBedObject(o)) {
      return "sleep";
    }
    if (isChairObject(o)) {
      return "sit";
    }
  }
  return "stand";
}

function entityChairAt(entity) {
  if (!state.objectLayer) {
    return null;
  }
  const overlays = state.objectLayer.objectsAt(entity.x | 0, entity.y | 0, entity.z | 0);
  for (const o of overlays) {
    if (isChairObject(o)) {
      return o;
    }
  }
  return null;
}

function entityBedAt(entity) {
  if (!state.objectLayer) {
    return null;
  }
  const overlays = state.objectLayer.objectsAt(entity.x | 0, entity.y | 0, entity.z | 0);
  for (const o of overlays) {
    if (isBedObject(o)) {
      return o;
    }
  }
  return null;
}

function entityRenderTileId(e) {
  const pose = entityPoseAt(e);
  if (pose === "sleep") {
    const sleepBase = sleepBaseTileForEntity(e);
    const bed = entityBedAt(e);
    return (sleepBase + sleepFrameOffsetForBedAtCell(bed, e.x | 0, e.y | 0)) & 0xffff;
  }
  if (pose === "sit") {
    const chair = entityChairAt(e);
    if (chair) {
      const chairFrame = (chair.frame | 0) & 0x03;
      return (e.baseTile + 3 + (chairFrame << 2)) & 0xffff;
    }
    return (e.baseTile + 3) & 0xffff;
  }
  return resolveAnimatedObjectTile(e);
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

function legacyLensSpecForObject(obj) {
  const t = obj ? (obj.type & 0x03ff) : -1;
  if (t === LEGACY_LENS_BRITANNIA.type) {
    return LEGACY_LENS_BRITANNIA;
  }
  if (t === LEGACY_LENS_GARGOYLE.type) {
    return LEGACY_LENS_GARGOYLE;
  }
  return null;
}

function legacyAreaLightAtWorld(viewCtx, wx, wy, _wz) {
  if (!viewCtx || typeof viewCtx.areaLightAtWorld !== "function") {
    return 0;
  }
  return viewCtx.areaLightAtWorld(wx, wy) | 0;
}

function injectLegacyOverlaySpecials(ctx) {
  const {
    startX,
    startY,
    viewW,
    viewH,
    wz,
    viewCtx,
    stream,
    insertWorldTile
  } = ctx;
  let injected = 0;
  const list = Array.isArray(stream) ? stream : [];
  for (const o of list) {
    if (!o || !o.renderable) {
      continue;
    }
    const wx = o.x | 0;
    const wy = o.y | 0;
    if (viewCtx && !viewCtx.visibleAtWorld(wx, wy)) {
      continue;
    }
    const lens = legacyLensSpecForObject(o);
    if (
      lens
      && (wx | 0) === (lens.x | 0)
      && (wy | 0) === (lens.y | 0)
      && ((o.z | 0) === (lens.z | 0))
      && ((wz | 0) === (lens.z | 0))
    ) {
      const gx = wx - startX;
      if (gx !== 0) {
        insertWorldTile(wx + 1, wy, lens.rightTile, 1, {
          x: wx,
          y: wy,
          type: "legacy-lens-right",
          objType: o.type
        }, `0x${lens.rightTile.toString(16)}`);
        injected += 1;
      }
      if (gx < (viewW - 1)) {
        insertWorldTile(wx - 1, wy, lens.leftTile, 1, {
          x: wx,
          y: wy,
          type: "legacy-lens-left",
          objType: o.type
        }, `0x${lens.leftTile.toString(16)}`);
        injected += 1;
      }
    }
  }

  for (let gy = 0; gy < viewH; gy += 1) {
    for (let gx = 0; gx < viewW; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      const light = legacyAreaLightAtWorld(viewCtx, wx, wy, wz) | 0;
      if (light > 0 && light < 4) {
        const tileId = (0x1bc + light) & 0xffff;
        insertWorldTile(wx, wy, tileId, 3, {
          x: wx,
          y: wy,
          type: "legacy-obscurity",
          objType: 0
        }, `0x${tileId.toString(16)}`);
        injected += 1;
      }
    }
  }

  return injected;
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
    resolveFootprintTile: (obj) => resolveLegacyFootprintTile(state.sim, obj),
    hasWallTerrain,
    injectLegacyOverlays: injectLegacyOverlaySpecials,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
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
  if (state.useCursorActive) {
    clampUseCursorToView();
  }
  const renderPalette = getRenderPalette();
  const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
  const { rawTiles: baseRawTiles, displayTiles: baseDisplayTiles } = buildBaseTileBuffers(startX, startY, state.sim.world.map_z, viewCtx);
  const overlayBuild = buildOverlayCells(startX, startY, state.sim.world.map_z, viewCtx);
  const overlayCells = overlayBuild.overlayCells;
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  const shouldDrawOverlayEntry = (gx, gy, entry) => {
    if (!viewCtx) {
      return true;
    }
    const wx = startX + gx;
    const wy = startY + gy;
    if (viewCtx.visibleAtWorld(wx, wy)) {
      return true;
    }
    if (!entry) {
      return false;
    }
    return viewCtx.visibleAtWorld(entry.sourceX | 0, entry.sourceY | 0);
  };
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
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (!t.floor && shouldDrawOverlayEntry(gx, gy, t)) {
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
      const animEntityTile = entityRenderTileId(e);
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
  if (state.sessionStarted && isNetAuthenticated() && Array.isArray(state.net.remotePlayers)) {
    for (const p of state.net.remotePlayers) {
      const pxw = Number(p.map_x) | 0;
      const pyw = Number(p.map_y) | 0;
      const pzw = Number(p.map_z) | 0;
      if (pzw !== (state.sim.world.map_z | 0)) {
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
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (t.floor && shouldDrawOverlayEntry(gx, gy, t)) {
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
  if (state.movementMode === "ghost" || !state.tileSet) {
    ctx.strokeStyle = "#f1f3f5";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 2, cy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }
  if (state.useCursorActive && state.movementMode === "avatar") {
    const ugx = (state.useCursorX | 0) - startX;
    const ugy = (state.useCursorY | 0) - startY;
    if (ugx >= 0 && ugy >= 0 && ugx < VIEW_W && ugy < VIEW_H) {
      const upx = ugx * TILE_SIZE;
      const upy = ugy * TILE_SIZE;
      ctx.strokeStyle = "#f6d365";
      ctx.lineWidth = 2;
      ctx.strokeRect(upx + 2, upy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
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
  if (topInputMode) {
    if (!state.sessionStarted) {
      topInputMode.textContent = "Title Menu";
    } else if (state.useCursorActive) {
      const label = LEGACY_TARGET_VERB_LABEL[state.targetVerb] || "Target";
      topInputMode.textContent = `${label} Target`;
    } else {
      topInputMode.textContent = state.movementMode === "avatar" ? "World" : "Ghost";
    }
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
  if (statAvatarState) {
    const facing = state.avatarFacingDx < 0 ? "W"
      : state.avatarFacingDx > 0 ? "E"
        : state.avatarFacingDy < 0 ? "N" : "S";
    const pose = state.sim.avatarPose === "sleep"
      ? "sleep"
      : (state.sim.avatarPose === "sit" ? "sit" : "stand");
    statAvatarState.textContent = state.movementMode === "avatar"
      ? `avatar (${facing}, ${pose})`
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
    statCenterBand.textContent = state.centerPaletteBand;
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
  state.renderParityMismatches = 0;
  state.interactionProbeTile = null;
  state.useCursorActive = false;
  state.targetVerb = "";
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
      && !state.net.backgroundSyncPaused
      && state.sessionStarted
      && (state.sim.tick - state.net.lastPresenceHeartbeatTick) >= NET_PRESENCE_HEARTBEAT_TICKS
    ) {
      state.net.lastPresenceHeartbeatTick = state.sim.tick >>> 0;
      netSendPresenceHeartbeat().catch((err) => {
        recordBackgroundNetFailure(err, "Presence heartbeat");
      });
    }
    if (
      isNetAuthenticated()
      && !state.net.backgroundSyncPaused
      && (state.sim.tick - state.net.lastClockPollTick) >= NET_CLOCK_POLL_TICKS
    ) {
      state.net.lastClockPollTick = state.sim.tick >>> 0;
      netPollWorldClock().catch((err) => {
        recordBackgroundNetFailure(err, "Clock sync");
      });
    }
    if (
      isNetAuthenticated()
      && !state.net.backgroundSyncPaused
      && (state.sim.tick - state.net.lastPresencePollTick) >= NET_PRESENCE_POLL_TICKS
    ) {
      state.net.lastPresencePollTick = state.sim.tick >>> 0;
      netPollPresence().catch((err) => {
        recordBackgroundNetFailure(err, "Presence poll");
      });
    }
    if (
      state.net.maintenanceAuto
      && state.net.token
      && !state.net.backgroundSyncPaused
      && !state.net.maintenanceInFlight
      && (state.sim.tick % 120) === 0
      && state.sim.tick !== state.net.lastMaintenanceTick
    ) {
      netRunCriticalMaintenance({ silent: true }).catch((err) => {
        recordBackgroundNetFailure(err, "Maintenance");
        diagBox.className = "diag warn";
        diagBox.textContent = `Critical maintenance failed: ${String(err.message || err)}`;
      });
    }
    if (
      state.sessionStarted
      && !state.pristineBaselinePollInFlight
      && (state.sim.tick - state.pristineBaselineLastPollTick) >= PRISTINE_BASELINE_POLL_TICKS
    ) {
      state.pristineBaselineLastPollTick = state.sim.tick >>> 0;
      refreshPristineBaseline(false).catch((_err) => {});
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

function clearObjectTransientState() {
  if (!state.sim) {
    return;
  }
  state.sim.doorOpenStates = {};
  state.sim.removedObjectKeys = {};
  state.sim.removedObjectAtTick = {};
  state.sim.removedObjectCount = 0;
}

async function fetchPristineBaselineVersion() {
  const res = await fetch(PRISTINE_BASELINE_VERSION_PATH, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`missing baseline version marker (${PRISTINE_BASELINE_VERSION_PATH})`);
  }
  return String(await res.text()).trim();
}

async function loadObjectBaselineFromPath(baseTiles, objectPath) {
  if (!baseTiles || baseTiles.length < 0x400) {
    throw new Error("invalid base tile table for object baseline");
  }
  const objectLayer = new U6ObjectLayerJS(baseTiles);
  await objectLayer.loadOutdoor((name) => fetch(`${objectPath}/${name}`, { cache: "no-store" }));
  const objListRes = await fetch(`${objectPath}/objlist`, { cache: "no-store" });
  if (objectLayer.filesLoaded < 64 || !objListRes.ok) {
    throw new Error(`missing object baseline at ${objectPath}`);
  }
  const objListBuf = await objListRes.arrayBuffer();
  const entityLayer = new U6EntityLayerJS(baseTiles);
  if (objListBuf.byteLength >= 0x0900) {
    entityLayer.load(new Uint8Array(objListBuf));
  }
  return { objectLayer, entityLayer, objectPath };
}

async function loadPristineObjectBaseline(baseTiles) {
  const baselinePaths = [RUNTIME_OBJECT_PATH, PRISTINE_OBJECT_PATH];
  let lastErr = null;
  for (const objectPath of baselinePaths) {
    try {
      return await loadObjectBaselineFromPath(baseTiles, objectPath);
    } catch (err) {
      lastErr = err;
    }
  }
  throw (lastErr || new Error("no valid object baseline path"));
}

async function refreshPristineBaseline(force = false) {
  if (!state.tileSet || !state.objectLayer || !state.entityLayer) {
    return false;
  }
  if (state.pristineBaselinePollInFlight) {
    return false;
  }
  state.pristineBaselinePollInFlight = true;
  try {
    const version = await fetchPristineBaselineVersion();
    if (!force && version && state.pristineBaselineVersion && version === state.pristineBaselineVersion) {
      return false;
    }
    const loaded = await loadPristineObjectBaseline(state.objectLayer.baseTiles);
    state.objectLayer = loaded.objectLayer;
    state.entityLayer = loaded.entityLayer;
    state.pristineBaselineVersion = version;
    clearObjectTransientState();
    diagBox.className = "diag ok";
    diagBox.textContent = `Pristine baseline reloaded (version ${version || "unknown"}).`;
    return true;
  } catch (err) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Pristine baseline reload failed: ${String(err.message || err)}`;
    return false;
  } finally {
    state.pristineBaselinePollInFlight = false;
  }
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

    const [mapRes, chunksRes, palRes, flagRes, idxRes, maskRes, mapTileRes, objTileRes, baseTileRes, animRes, paperRes, fontRes, portraitBRes, portraitARes, titlesRes, mainmenuRes, cursorRes] = await Promise.all([
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
      fetch("../assets/runtime/paper.bmp"),
      fetch("../assets/runtime/u6.ch"),
      fetch("../assets/runtime/portrait.b"),
      fetch("../assets/runtime/portrait.a"),
      fetch("../assets/runtime/titles.shp"),
      fetch("../assets/runtime/mainmenu.shp"),
      fetch("../assets/runtime/u6mcga.ptr")
    ]);
    const [mapBuf, chunkBuf, palBuf, flagBuf, idxBuf, maskBuf, mapTileBuf, objTileBuf, baseTileBuf, animBuf, paperBuf, fontBuf, portraitBBuf, portraitABuf, titlesBuf, mainmenuBuf, cursorBuf] = await Promise.all([
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
    if (flagRes.ok && flagBuf.byteLength >= 0x1c00) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      /* Legacy tileflag layout: terrain(0x800), flag1(0x800), typeWeight(0x400), flag2/D_B3EF(0x800). */
      state.tileFlags2 = new Uint8Array(flagBuf.slice(0x1400, 0x1c00));
    } else if (flagRes.ok && flagBuf.byteLength >= 0x1800) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      state.tileFlags2 = new Uint8Array(flagBuf.slice(0x1000, 0x1800));
    } else if (flagRes.ok && flagBuf.byteLength >= 0x1000) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      state.tileFlags2 = null;
    } else if (flagRes.ok && flagBuf.byteLength >= 0x800) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags2 = null;
    } else {
      state.tileFlags = null;
      state.tileFlags2 = null;
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
      const loaded = await loadPristineObjectBaseline(baseTiles);
      state.objectLayer = loaded.objectLayer;
      state.entityLayer = loaded.entityLayer;
      state.pristineBaselineVersion = await fetchPristineBaselineVersion();
      state.pristineBaselineLastPollTick = state.sim.tick >>> 0;
      if (animRes.ok && animBuf.byteLength >= 2) {
        state.animData = U6AnimDataJS.fromBytes(new Uint8Array(animBuf));
      } else {
        state.animData = null;
      }
    } else {
      state.objectLayer = null;
      state.entityLayer = null;
      state.animData = null;
      state.pristineBaselineVersion = "";
      state.pristineBaselineLastPollTick = -1;
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
    state.tileFlags2 = null;
    state.terrainType = null;
    state.pristineBaselineVersion = "";
    state.pristineBaselineLastPollTick = -1;
    applyLegacyFrameLayout();
    statSource.textContent = "synthetic fallback";
    diagBox.className = "diag warn";
    diagBox.textContent = `Fallback active: ${String(err.message || err)}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`;
  }
}

function viewStartX() {
  return (state.sim.world.map_x | 0) - (VIEW_W >> 1);
}

function viewStartY() {
  return (state.sim.world.map_y | 0) - (VIEW_H >> 1);
}

function clampUseCursorToView() {
  const startX = viewStartX();
  const startY = viewStartY();
  const maxX = startX + VIEW_W - 1;
  const maxY = startY + VIEW_H - 1;
  state.useCursorX = clampI32(state.useCursorX | 0, startX, maxX);
  state.useCursorY = clampI32(state.useCursorY | 0, startY, maxY);
}

function beginTargetCursor(verb) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const v = String(verb || "").toLowerCase();
  if (!LEGACY_TARGET_VERB_LABEL[v]) {
    return;
  }
  const px = state.sim.world.map_x | 0;
  const py = state.sim.world.map_y | 0;
  const dx = state.avatarFacingDx | 0;
  const dy = state.avatarFacingDy | 0;
  state.useCursorX = px + dx;
  state.useCursorY = py + dy;
  state.targetVerb = v;
  state.useCursorActive = true;
  clampUseCursorToView();
  diagBox.className = "diag ok";
  diagBox.textContent = `${LEGACY_TARGET_VERB_LABEL[v]}: move target with arrows, confirm with Enter/U, cancel with Esc.`;
}

function moveUseCursor(dx, dy) {
  if (!state.useCursorActive) {
    return;
  }
  state.useCursorX = (state.useCursorX + (dx | 0)) | 0;
  state.useCursorY = (state.useCursorY + (dy | 0)) | 0;
  clampUseCursorToView();
}

function commitUseCursorInteract() {
  if (!state.useCursorActive) {
    return;
  }
  const tx = state.useCursorX | 0;
  const ty = state.useCursorY | 0;
  const verb = String(state.targetVerb || "");
  if (!verb || verb === LEGACY_TARGET_VERB.USE) {
    queueInteractAtCell(tx, ty);
  } else if (verb === LEGACY_TARGET_VERB.LOOK || verb === LEGACY_TARGET_VERB.TALK || verb === LEGACY_TARGET_VERB.GET) {
    queueLegacyTargetVerb(verb, tx, ty);
  } else {
    const label = LEGACY_TARGET_VERB_LABEL[verb] || "Action";
    diagBox.className = "diag warn";
    diagBox.textContent = `${label} target at ${tx},${ty}: legacy key mapped, action system not implemented yet.`;
  }
  state.useCursorActive = false;
  state.targetVerb = "";
}

function cancelTargetCursor() {
  if (!state.useCursorActive) {
    return;
  }
  state.useCursorActive = false;
  state.targetVerb = "";
  diagBox.className = "diag ok";
  diagBox.textContent = "Targeting cancelled.";
}

function moveDeltaFromKey(ev, allowDiagonal) {
  const k = String(ev.key || "").toLowerCase();
  const code = String(ev.code || "");
  if (k === "arrowup" || k === "w" || code === "Numpad8") return [0, -1];
  if (k === "arrowdown" || k === "s" || code === "Numpad2") return [0, 1];
  if (k === "arrowleft" || k === "a" || code === "Numpad4") return [-1, 0];
  if (k === "arrowright" || k === "d" || code === "Numpad6") return [1, 0];
  if (!allowDiagonal) {
    return null;
  }
  if (code === "Numpad7") return [-1, -1];
  if (code === "Numpad9") return [1, -1];
  if (code === "Numpad1") return [-1, 1];
  if (code === "Numpad3") return [1, 1];
  return null;
}

function beginLegacyVerbTarget(verb) {
  if (state.movementMode !== "avatar") {
    diagBox.className = "diag warn";
    diagBox.textContent = "Legacy targeting requires Avatar mode.";
    return false;
  }
  beginTargetCursor(verb);
  return state.useCursorActive;
}

function promptNetLoginLogout() {
  if (isNetAuthenticated()) {
    netLogout();
    return;
  }
  if (hasMultipleSavedAccounts()) {
    populateNetAccountSelect();
    setAccountModalOpen(true);
    setNetStatus("idle", "Choose an account in Account Setup, then login.");
    return;
  }
  netLogin().then(() => {
    diagBox.className = "diag ok";
    diagBox.textContent = `Net login ok: ${state.net.username}/${state.net.characterName}`;
  }).catch((err) => {
    setNetStatus("error", `Login failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Net login failed: ${String(err.message || err)}`;
  });
}

function saveWorldSnapshotHotkey() {
  netSaveSnapshot().then(() => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `World snapshot saved at tick ${state.sim.tick >>> 0}.`;
  }).catch((err) => {
    setNetStatus("error", `Save failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `World save failed: ${String(err.message || err)}`;
  });
}

function loadWorldSnapshotHotkey() {
  netLoadSnapshot().then((out) => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `World snapshot loaded at tick ${Number(out?.snapshot_meta?.saved_tick || 0)}.`;
  }).catch((err) => {
    setNetStatus("error", `Load failed: ${String(err.message || err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `World load failed: ${String(err.message || err)}`;
  });
}

function runLegacyNonTargetAction(k) {
  if (k === "r") {
    diagBox.className = "diag ok";
    diagBox.textContent = "Rest: legacy key mapped; rest system integration pending.";
    return true;
  }
  if (k === "b") {
    state.sim.world.in_combat = state.sim.world.in_combat ? 0 : 1;
    diagBox.className = "diag ok";
    diagBox.textContent = state.sim.world.in_combat ? "Combat mode: ON" : "Combat mode: OFF";
    return true;
  }
  if (k === "i") {
    diagBox.className = "diag ok";
    diagBox.textContent = "Inventory: legacy key mapped; inventory UI integration pending.";
    return true;
  }
  return false;
}

function runLegacyCommandKey(k) {
  if (k === "a") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.ATTACK);
  if (k === "c") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.CAST);
  if (k === "t") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.TALK);
  if (k === "l") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.LOOK);
  if (k === "g") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.GET);
  if (k === "d") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.DROP);
  if (k === "m") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.MOVE);
  if (k === "u") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.USE);
  return runLegacyNonTargetAction(k);
}

function runDebugHotkeys(ev) {
  const k = String(ev.key || "").toLowerCase();
  if (ev.ctrlKey && k === "s") {
    saveWorldSnapshotHotkey();
    return true;
  }
  if (ev.ctrlKey && k === "r") {
    loadWorldSnapshotHotkey();
    return true;
  }
  if (ev.ctrlKey && k === "z") {
    state.sim.world.sound_enabled = state.sim.world.sound_enabled ? 0 : 1;
    diagBox.className = "diag ok";
    diagBox.textContent = state.sim.world.sound_enabled ? "Sound enabled." : "Sound disabled.";
    return true;
  }
  if (ev.ctrlKey && k === "h") {
    const helpPanel = document.querySelector(".vm-help");
    if (helpPanel) {
      helpPanel.classList.toggle("hidden");
      diagBox.className = "diag ok";
      diagBox.textContent = helpPanel.classList.contains("hidden") ? "Help hidden." : "Help visible.";
    }
    return true;
  }
  if (ev.ctrlKey && k === "v") {
    diagBox.className = "diag ok";
    diagBox.textContent = "VirtueMachine: legacy Ctrl+V key mapped (version string TBD).";
    return true;
  }
  if (!ev.shiftKey) {
    return false;
  }
  if (k === "i") {
    promptNetLoginLogout();
    return true;
  }
  if (k === "y") {
    saveWorldSnapshotHotkey();
    return true;
  }
  if (k === "u") {
    loadWorldSnapshotHotkey();
    return true;
  }
  if (k === "n") {
    netRunCriticalMaintenance({ silent: false }).catch((err) => {
      setNetStatus("error", `Maintenance failed: ${String(err.message || err)}`);
      diagBox.className = "diag warn";
      diagBox.textContent = `Critical maintenance failed: ${String(err.message || err)}`;
    });
    return true;
  }
  if (k === "p") {
    if (ev.altKey) {
      captureWorldHudPng();
    } else {
      captureViewportPng();
    }
    return true;
  }
  if (k === "o") {
    setOverlayDebug(!state.showOverlayDebug);
    return true;
  }
  if (k === "f") {
    setAnimationMode(state.animationFrozen ? "live" : "freeze");
    return true;
  }
  if (k === "b") {
    setPaletteFxMode(!state.enablePaletteFx);
    return true;
  }
  if (k === "m") {
    setMovementMode(state.movementMode === "avatar" ? "ghost" : "avatar");
    return true;
  }
  if (k === "g") {
    jumpToPreset();
    return true;
  }
  if (k === "r") {
    resetRun();
    return true;
  }
  if (k === "v") {
    verifyReplayStability();
    return true;
  }
  if (ev.code === "Comma") {
    cycleCursor(-1);
    return true;
  }
  if (ev.code === "Period") {
    cycleCursor(1);
    return true;
  }
  if (ev.code === "BracketLeft") {
    cycleLegacyScaleMode(-1);
    return true;
  }
  if (ev.code === "BracketRight") {
    cycleLegacyScaleMode(1);
    return true;
  }
  return false;
}

window.addEventListener("keydown", (ev) => {
  if (netAccountModal && !netAccountModal.classList.contains("hidden")) {
    if (ev.key === "Escape") {
      setAccountModalOpen(false);
      ev.preventDefault();
    }
    return;
  }
  if (isTypingContext(ev.target)) {
    return;
  }

  const k = String(ev.key || "").toLowerCase();
  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
    const isHoverCopyCombo = k === "c" && ev.shiftKey;
    if (!isHoverCopyCombo) {
      // Let browser/system shortcuts work (copy/paste/select-all/find/etc).
      return;
    }
  }
  if (!state.sessionStarted) {
    if (k === "arrowup") {
      setStartupMenuIndex(state.startupMenuIndex - 1);
    } else if (k === "arrowdown") {
      setStartupMenuIndex(state.startupMenuIndex + 1);
    } else if (k === "i") {
      setStartupMenuIndex(0);
      activateStartupMenuSelection();
    } else if (k === "c") {
      setStartupMenuIndex(1);
      activateStartupMenuSelection();
    } else if (k === "t") {
      setStartupMenuIndex(2);
      activateStartupMenuSelection();
    } else if (k === "a") {
      setStartupMenuIndex(3);
      activateStartupMenuSelection();
    } else if (k === "j") {
      setStartupMenuIndex(4);
      activateStartupMenuSelection();
    } else if (k === "enter" || k === " ") {
      activateStartupMenuSelection();
    } else {
      return;
    }
    ev.preventDefault();
    return;
  }

  if (k === "q") {
    returnToTitleMenu();
    ev.preventDefault();
    return;
  }
  if (
    ((k === "c" && ev.shiftKey && ev.ctrlKey && !ev.altKey && !ev.metaKey)
      || (ev.code === "Backquote" && ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey))
  ) {
    if (topCopyStatus) {
      topCopyStatus.textContent = "copying...";
    }
    void copyHoverReportToClipboard();
    ev.preventDefault();
    return;
  }

  if (state.useCursorActive) {
    const delta = moveDeltaFromKey(ev, true);
    if (delta) {
      moveUseCursor(delta[0], delta[1]);
      ev.preventDefault();
      return;
    }
    if (k === "u" || k === "enter" || k === " ") {
      commitUseCursorInteract();
      ev.preventDefault();
      return;
    }
    if (k === "escape") {
      cancelTargetCursor();
      ev.preventDefault();
      return;
    }
    if (runLegacyCommandKey(k)) {
      ev.preventDefault();
      return;
    }
    if (runDebugHotkeys(ev)) {
      ev.preventDefault();
      return;
    }
    return;
  }

  const delta = moveDeltaFromKey(ev, false);
  if (delta) {
    queueMove(delta[0], delta[1]);
    ev.preventDefault();
    return;
  }

  if (k === " " || k === "escape") {
    diagBox.className = "diag ok";
    diagBox.textContent = "Pass turn.";
    ev.preventDefault();
    return;
  }
  if ((ev.code.startsWith("Digit") || ev.code.startsWith("Numpad")) && k >= "0" && k <= "9") {
    diagBox.className = "diag ok";
    diagBox.textContent = `Party switch ${k}: legacy key mapped; full party command mode pending.`;
    ev.preventDefault();
    return;
  }
  if (runLegacyCommandKey(k)) {
    ev.preventDefault();
    return;
  }
  if (runDebugHotkeys(ev)) {
    ev.preventDefault();
  }
}, true);

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

function clampInt(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v | 0;
}

function hoveredWorldCellFromMouse() {
  if (!state.sessionStarted || !state.mouseInCanvas || !state.mapCtx) {
    return null;
  }
  const wz = state.sim.world.map_z | 0;
  const startX = (state.sim.world.map_x | 0) - (VIEW_W >> 1);
  const startY = (state.sim.world.map_y | 0) - (VIEW_H >> 1);
  if (isLegacyFramePreviewOn() && legacyBackdropCanvas) {
    const bw = legacyBackdropCanvas.width | 0;
    const bh = legacyBackdropCanvas.height | 0;
    if (bw <= 0 || bh <= 0) {
      return null;
    }
    const mx = Math.floor(state.mouseNormX * bw);
    const my = Math.floor(state.mouseNormY * bh);
    const scale = Math.max(1, Math.floor(bw / 320));
    const mapX = LEGACY_UI_MAP_RECT.x * scale;
    const mapY = LEGACY_UI_MAP_RECT.y * scale;
    const mapW = LEGACY_UI_MAP_RECT.w * scale;
    const mapH = LEGACY_UI_MAP_RECT.h * scale;
    if (mx < mapX || mx >= (mapX + mapW) || my < mapY || my >= (mapY + mapH)) {
      return null;
    }
    const lx = (mx - mapX) / scale;
    const ly = (my - mapY) / scale;
    const gx = clampInt(Math.floor((lx / 160) * VIEW_W), 0, VIEW_W - 1);
    const gy = clampInt(Math.floor((ly / 160) * VIEW_H), 0, VIEW_H - 1);
    return { x: startX + gx, y: startY + gy, z: wz, gx, gy, startX, startY };
  }

  const w = canvas.width | 0;
  const h = canvas.height | 0;
  if (w <= 0 || h <= 0) {
    return null;
  }
  const mx = Math.floor(state.mouseNormX * w);
  const my = Math.floor(state.mouseNormY * h);
  const gx = clampInt(Math.floor((mx / w) * VIEW_W), 0, VIEW_W - 1);
  const gy = clampInt(Math.floor((my / h) * VIEW_H), 0, VIEW_H - 1);
  return { x: startX + gx, y: startY + gy, z: wz, gx, gy, startX, startY };
}

function hex(value, width = 0) {
  const n = Number(value) >>> 0;
  const s = n.toString(16);
  return `0x${width > 0 ? s.padStart(width, "0") : s}`;
}

function buildHoverReportText() {
  let cell = hoveredWorldCellFromMouse();
  if (!cell && state.sessionStarted && state.mapCtx && state.sim && state.sim.world) {
    const wz = state.sim.world.map_z | 0;
    const startX = (state.sim.world.map_x | 0) - (VIEW_W >> 1);
    const startY = (state.sim.world.map_y | 0) - (VIEW_H >> 1);
    const gx = VIEW_W >> 1;
    const gy = VIEW_H >> 1;
    cell = {
      x: state.sim.world.map_x | 0,
      y: state.sim.world.map_y | 0,
      z: wz,
      gx,
      gy,
      startX,
      startY
    };
  }
  if (!cell || !state.mapCtx) {
    return null;
  }
  const wx = cell.x | 0;
  const wy = cell.y | 0;
  const wz = cell.z | 0;
  const tick = animationTick();
  const rawTile = state.mapCtx.tileAt(wx, wy, wz) & 0xffff;
  const animTile = resolveAnimatedTileAtTick(rawTile, tick) & 0xffff;
  const tileFlag = state.tileFlags ? (state.tileFlags[rawTile & 0x07ff] ?? 0) : 0;
  const terrain = state.terrainType ? (state.terrainType[rawTile & 0x07ff] ?? 0) : 0;
  const viewCtx = buildLegacyViewContext(cell.startX, cell.startY, wz);
  const visible = viewCtx ? (viewCtx.visibleAtWorld(wx, wy) ? 1 : 0) : 1;
  const open = viewCtx ? (viewCtx.openAtWorld(wx, wy) ? 1 : 0) : 0;

  const overlayBuild = buildOverlayCells(cell.startX, cell.startY, wz, viewCtx);
  const list = overlayBuild.overlayCells
    ? (overlayBuild.overlayCells[(cell.gy * VIEW_W) + cell.gx] || [])
    : [];
  const overlays = list.map((o, idx) => (
    `overlay[${idx}]: tile=${hex(o.tileId)} floor=${o.floor ? 1 : 0} occ=${o.occluder ? 1 : 0} src=${o.sourceX},${o.sourceY} ${o.sourceType}`
  ));

  const objects = state.objectLayer ? state.objectLayer.objectsAt(wx, wy, wz) : [];
  const objLines = objects.map((o, idx) => {
    const tileId = resolveDoorTileId(state.sim, o) & 0xffff;
    const tf = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
    return `obj[${idx}]: type=${hex(o.type)} frame=${o.frame | 0} tile=${hex(tileId)} tf=${hex(tf)} order=${o.order | 0} lord=${Number(o.legacyOrder || 0) | 0} achild=${Number(o.assocChildCount || 0) | 0} a0010=${Number(o.assocChild0010Count || 0) | 0}`;
  });

  const lines = [
    "VirtueMachine Hover Report",
    `cell: ${wx},${wy},${wz}`,
    `map: raw=${hex(rawTile)} anim=${hex(animTile)} tf=${hex(tileFlag)} terrain=${hex(terrain)}`,
    `visibility: visible=${visible} open=${open}`
  ];
  if (overlays.length) {
    lines.push(...overlays);
  } else {
    lines.push("overlay: none");
  }
  if (objLines.length) {
    lines.push(...objLines);
  } else {
    lines.push("objects@cell: none");
  }
  return lines.join("\n");
}

async function copyHoverReportToClipboard(options = {}) {
  const enrich = options.enrich !== false;
  const report = buildHoverReportText();
  if (!report) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Hover report unavailable. Move cursor over the world view.";
    return;
  }
  let enrichedReport = report;
  if (enrich) {
    try {
      const cell = hoveredWorldCellFromMouse();
      if (cell && isNetAuthenticated()) {
        const out = await netFetchWorldObjectsAtCell(cell.x | 0, cell.y | 0, cell.z | 0);
        if (out && Array.isArray(out.objects)) {
          const rows = [];
          rows.push("server_objects:");
          if (!out.objects.length) {
            rows.push("server_obj: none");
          } else {
            for (let i = 0; i < out.objects.length; i += 1) {
              const o = out.objects[i];
              const fp = Array.isArray(o.footprint)
                ? o.footprint.map((c) => `${Number(c.x) | 0},${Number(c.y) | 0},${Number(c.z) | 0}`).join(" ")
                : "";
              rows.push(
                `server_obj[${i}]: key=${String(o.object_key || "")} type=${hex(o.type)} frame=${Number(o.frame) | 0} tile=${hex(o.tile_id)} xyz=${Number(o.x) | 0},${Number(o.y) | 0},${Number(o.z) | 0} src=${String(o.source_kind || "baseline")} status=${hex(Number(o.status) | 0)} cu=${hex((Number(o.status) | 0) & 0x18)} area=${Number(o.source_area) | 0} idx=${Number(o.source_index) | 0} lord=${Number(o.legacy_order || 0) | 0} achild=${Number(o.assoc_child_count || 0) | 0} a0010=${Number(o.assoc_child_0010_count || 0) | 0}${fp ? ` fp=${fp}` : ""}`
              );
            }
          }
          enrichedReport = `${report}\n${rows.join("\n")}`;
        }
      }
    } catch (_err) {
      // Keep base local hover report available if net authority fetch fails.
    }
  }
  const ok = await copyTextToClipboard(enrichedReport);
  if (ok) {
    const line = enrichedReport.split("\n")[1] || "";
    diagBox.className = "diag ok";
    if (diagBox && diagBox.dataset) {
      delete diagBox.dataset.copyError;
    }
    diagBox.textContent = `Copied hover report (${line.replace(/^cell:\\s*/, "")}).`;
    setCopyStatus(true);
  } else {
    diagBox.className = "diag warn";
    const why = diagBox && diagBox.dataset && diagBox.dataset.copyError
      ? ` (${diagBox.dataset.copyError})`
      : "";
    diagBox.textContent = `Failed to copy hover report to clipboard${why}.`;
    setCopyStatus(false, why.replace(/^\s*\(|\)\s*$/g, ""));
  }
}

function handleShiftContextMenu(ev, surface) {
  if (!ev.shiftKey) {
    return;
  }
  ev.preventDefault();
}

function handleShiftRightMouseDownCopy(ev, surface) {
  if (!ev.shiftKey || ev.button !== 2) {
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();
  updateCanvasMouseFromEvent(ev, surface);
  setCopyStatus(false, "copying...");
  const report = buildHoverReportText();
  if (!report) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Hover report unavailable. Move cursor over the world view.";
    setCopyStatus(false, "no hover cell");
    return;
  }
  const sync = copyTextToClipboardSync(report);
  if (sync.ok) {
    if (diagBox && diagBox.dataset) {
      delete diagBox.dataset.copyError;
    }
    diagBox.className = "diag ok";
    const line = report.split("\n")[1] || "";
    diagBox.textContent = `Copied hover report (${line.replace(/^cell:\\s*/, "")}).`;
    setCopyStatus(true);
    return;
  }
  setCopyStatus(false, sync.reason || "copy blocked");
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

canvas.addEventListener("contextmenu", (ev) => {
  handleShiftContextMenu(ev, canvas);
});

canvas.addEventListener("mousedown", (ev) => {
  handleShiftRightMouseDownCopy(ev, canvas);
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

  legacyBackdropCanvas.addEventListener("contextmenu", (ev) => {
    handleShiftContextMenu(ev, legacyBackdropCanvas);
  });

  legacyBackdropCanvas.addEventListener("mousedown", (ev) => {
    handleShiftRightMouseDownCopy(ev, legacyBackdropCanvas);
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

  legacyViewportCanvas.addEventListener("contextmenu", (ev) => {
    handleShiftContextMenu(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mousedown", (ev) => {
    handleShiftRightMouseDownCopy(ev, legacyViewportCanvas);
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
if (paritySnapshotButton) {
  paritySnapshotButton.addEventListener("click", () => {
    void captureParitySnapshotJson();
  });
}

import {
  cloneRgbPaletteRuntime,
  rotatePaletteRangeInPlaceRuntime,
  type RgbPaletteRuntime
} from "../assets/palette_runtime.ts";

export type BootIntroSceneKind = "splash" | "lounge" | "window" | "stones";

export type BootIntroTextCard = {
  frame: number;
  text: string;
  lines?: string[];
  printOps?: Array<{ text: string; startX: number; width: number; x: number; y: number }>;
  align?: "left" | "center";
  x: number;
  y: number;
  width: number;
  textX: number;
  textY: number;
};

export type BootIntroSceneSpec = {
  id: string;
  kind: BootIntroSceneKind;
  autoAdvanceMs: number;
  waitForInput?: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  splashFrame?: number;
  textCard?: BootIntroTextCard | null;
};

export type BootIntroRuntimeState = {
  active: boolean;
  played: boolean;
  sceneIndex: number;
  sceneElapsedMs: number;
  phase: "fade_in" | "hold" | "fade_out" | "done";
  aborting: boolean;
};

export type BootIntroTvSpriteRuntime = {
  frame: number;
  xOff: number;
  yOff: number;
};

export type BootIntroTvStaticCellRuntime = {
  colorIndex: number;
  px: number;
  py: number;
};

export type BootIntroClockSpriteRuntime = {
  frame: number;
  x: number;
  y: number;
};

export type BootIntroSpriteOpRuntime = {
  alpha?: number;
  bank: "intro1" | "intro2" | "intro3";
  frame: number;
  h?: number | null;
  scene: BootIntroSceneSpec;
  w?: number | null;
  x: number;
  y: number;
};

export type BootIntroClippedSpriteOpRuntime = BootIntroSpriteOpRuntime & {
  clipH: number;
  clipW: number;
  clipX: number;
  clipY: number;
};

export type BootIntroStaticOpRuntime = {
  h: number;
  seed: number;
  w: number;
  x: number;
  y: number;
};

export type BootIntroDrawRectRuntime = {
  alpha: number;
  h: number;
  w: number;
  x: number;
  y: number;
};

export type BootIntroLayerRenderPlanRuntime =
  | {
    kind: "startup";
    overlayAlpha: 0;
    scene: null;
    sceneKind: null;
  }
  | {
    kind: "intro";
    overlayAlpha: number;
    scene: BootIntroSceneSpec;
    sceneKind: BootIntroSceneKind;
  };

export type BootIntroSplashRenderPlanRuntime = {
  clear: true;
  sprite: {
    frame: number;
    h: number;
    w: number;
    x: number;
    y: number;
  } | null;
};

export type BootIntroStaticDrawCellRuntime = {
  color: string;
  h: number;
  w: number;
  x: number;
  y: number;
};

export type BootIntroLoungeRenderPlanRuntime = {
  clear: true;
  clippedSprites: BootIntroClippedSpriteOpRuntime[];
  sprites: BootIntroSpriteOpRuntime[];
  staticOps: BootIntroStaticOpRuntime[];
};

export type BootIntroWindowRenderPlanRuntime = {
  clear: true;
  sprites: BootIntroSpriteOpRuntime[];
};

export type BootIntroStonesRenderPlanRuntime = {
  clear: true;
  clippedSprites: BootIntroClippedSpriteOpRuntime[];
  sprites: BootIntroSpriteOpRuntime[];
};

export type BootIntroTextCardPanelRuntime = {
  frame: number;
  x: number;
  y: number;
};

export type BootIntroTextCardPrintOpRuntime = {
  startX: number;
  text: unknown;
  width: number;
  x: number;
  y: number;
};

export type BootIntroTextCardResolvedPrintOpRuntime = BootIntroTextCardPrintOpRuntime & {
  resolvedX: number;
  resolvedY: number;
};

export type BootIntroTextCardLineRuntime = {
  drawX: number;
  text: string;
  y: number;
};

export type BootIntroTextCardRenderPlanRuntime = {
  color: string;
  lines: BootIntroTextCardLineRuntime[];
  panel: BootIntroTextCardPanelRuntime | null;
  printOps: BootIntroTextCardPrintOpRuntime[];
  textMaxWidth: number;
};

export type BootIntroTvMachineRuntime = {
  fingerVisible: boolean;
  loopCnt: number;
  loopPos: number;
  newsImage: number;
  pledgeCounter: number;
  pledgeImage: number;
  pos: number;
  program: number;
  roadOffset: number;
  seed: number;
  sprites: BootIntroTvSpriteRuntime[];
  staticVisible: boolean;
};

export type BootIntroWouFontRuntime = {
  bytes: Uint8Array;
  height: number;
  pixelChar: number;
};

export type BootIntroTextCanvasRuntime = {
  fillStyle?: unknown;
  fillRect(x: number, y: number, w: number, h: number): void;
};

export type BootIntroCanvasCacheRuntime<TCanvas> = {
  get(key: string): TCanvas | null | undefined;
  set(key: string, canvas: TCanvas | null): unknown;
};

export type BootIntroWindowSpriteRuntime = {
  frame: number;
  x: number;
  y: number;
};

export type BootIntroWindowRainRuntime = {
  frame: number;
  x: number;
  y: number;
};

export type BootIntroWindowStateRuntime = {
  cloudX: number;
  clouds: BootIntroWindowSpriteRuntime[];
  flash: number;
  lightningCounter: number;
  lightningDrawX: number;
  lightningDrawY: number;
  lightningFrame: number;
  lightningVisible: boolean;
  lightningX: number;
  lightningY: number;
  rain: BootIntroWindowRainRuntime[];
  seed: number;
  strikeFrame: number;
  windowFrame: number;
};

const NUVIE_FADE_MS = Math.ceil(0x100 / 3) * 25;
const DEFAULT_FADE_MS = 0;

const BOOT_INTRO_TV_PROGRAMS = Object.freeze([
  Object.freeze([0x82, 0x82, 0x80, 0x03, 0x02, 0x8a, 0x02, 0x8a, 0x01, 0x8a, 0x01, 0x8a, 0x00, 0x8a, 0x00, 0x8a, 0x01, 0x8a, 0x01, 0x81]),
  Object.freeze([0x82, 0x82, 0x80, 0x28, 0x03, 0x8b, 0x81]),
  Object.freeze([0x82, 0x82, 0x80, 0x04, 0x04, 0x81, 0x80, 0x04, 0x08, 0x81, 0x80, 0x04, 0x09, 0x81, 0x80, 0x04, 0x0a, 0x81, 0x80, 0x04, 0x0b, 0x81, 0x80, 0x04, 0x0c, 0x81]),
  Object.freeze([0x82, 0x82, 0x87, 0x80, 0x46, 0x0f, 0x86, 0x84, 0x09, 0x10, 0x10, 0x10, 0x11, 0x11, 0x11, 0x12, 0x12, 0x12, 0x81]),
  Object.freeze([0x82, 0x82, 0x80, 0x32, 0x83, 0x81]),
  Object.freeze([0x82, 0x82, 0x80, 0x05, 0x27, 0x8a, 0x28, 0x8a, 0x29, 0x81, 0x80, 0x06, 0x2a, 0x8a, 0x2a, 0x8a, 0x2b, 0x8a, 0x2b, 0x8a, 0x2c, 0x8a, 0x2c, 0x8a, 0x2d, 0x8a, 0x2d, 0x81, 0x80, 0x0a, 0x2e, 0x8a, 0x2f, 0x8a, 0x30, 0x8a, 0x84, 0x09, 0x2e, 0x2e, 0x2e, 0x2f, 0x2f, 0x2f, 0x30, 0x30, 0x30, 0x8a, 0x2e, 0x8a, 0x2f, 0x8a, 0x30, 0x81]),
  Object.freeze([0x82, 0x82, 0x80, 0x55, 0x16, 0x17, 0x84, 0x0c, 0x13, 0x13, 0x13, 0x13, 0x14, 0x14, 0x14, 0x14, 0x15, 0x15, 0x15, 0x15, 0x88, 0x81, 0x80, 0x0f, 0x16, 0x84, 0x02, 0x1a, 0x1b, 0x89, 0x88, 0x81, 0x80, 0x03, 0x16, 0x1a, 0x89, 0x88, 0x81, 0x80, 0x03, 0x16, 0x1c, 0x88, 0x81, 0x80, 0x03, 0x16, 0x1d, 0x88, 0x81, 0x80, 0x03, 0x16, 0x1e, 0x88, 0x81, 0x80, 0x03, 0x16, 0x23, 0x88, 0x81, 0x80, 0x03, 0x16, 0x24, 0x88, 0x81, 0x80, 0x32, 0x16, 0x88, 0x81])
]);

const BOOT_INTRO_TV_X_OFF = Object.freeze([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x1f, 0x1f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x1f,
  0x00, 0x09, 0x09, 0x09, 0x0c, 0x0c, 0x0c, 0x00, 0x04, 0x1f, 0x1f, 0x04, 0x00, 0x04,
  0x04, 0x04, 0x1f, 0x1f, 0x00, 0x00, 0x06, 0x06, 0x08, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

const BOOT_INTRO_TV_Y_OFF = Object.freeze([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x02, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x02, 0x00, 0x07, 0x07,
  0x07, 0x03, 0x03, 0x03, 0x00, 0x02, 0x02, 0x02, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x02, 0x00, 0x00, 0x03,
  0x08, 0x1d, 0x1c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

const BOOT_INTRO_TV_NEWS_IMAGES = Object.freeze([0x05, 0x06, 0x07, 0x0d, 0x0e, 0x18, 0x19, 0x1f, 0x20]);

export const BOOT_INTRO_SCENES: readonly BootIntroSceneSpec[] = Object.freeze([
  { id: "logo_1", kind: "splash", splashFrame: 0x45, autoAdvanceMs: 0, fadeInMs: NUVIE_FADE_MS, fadeOutMs: NUVIE_FADE_MS },
  { id: "logo_2", kind: "splash", splashFrame: 0x46, autoAdvanceMs: 0, fadeInMs: NUVIE_FADE_MS, fadeOutMs: NUVIE_FADE_MS },
  {
    id: "lounge_opening",
    kind: "lounge",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "Upon your world, five seasons have passed since your triumphant homecoming from Britannia.",
      printOps: [
        { text: "Upon your world, five seasons have passed since your ", startX: 8, width: 312, x: 8, y: 10 },
        { text: "triumphant homecoming from Britannia.", startX: 8, width: 312, x: -1, y: -1 }
      ],
      frame: 1,
      x: 1,
      y: 0x9f,
      width: 312,
      textX: 8,
      textY: 10
    }
  },
  {
    id: "lounge_reflection",
    kind: "lounge",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "You have traded the Avatar's life of peril and adventure for the lonely serenity of a world at peace. But television supermen cannot take the place of friends who died at your side!",
      printOps: [
        { text: "You have traded the Avatar's life of peril and adventure ", startX: 7, width: 310, x: 7, y: 8 },
        { text: "for the lonely serenity of a world at peace. But ", startX: 7, width: 310, x: -1, y: -1 },
        { text: "television supermen cannot take the place of friends ", startX: 7, width: 310, x: -1, y: -1 },
        { text: "who died at your side!", startX: 7, width: 310, x: -1, y: -1 }
      ],
      frame: 2,
      x: 1,
      y: 0x98,
      width: 310,
      textX: 7,
      textY: 8
    }
  },
  {
    id: "lounge_pan",
    kind: "lounge",
    autoAdvanceMs: 8000,
    textCard: {
      text: "Outside, a chill wind rises...",
      printOps: [
        { text: "Outside, a chill wind rises...", startX: 39, width: 200, x: 39, y: 8 }
      ],
      frame: 0,
      x: 0x21,
      y: 0x9d,
      width: 200,
      textX: 39,
      textY: 8
    }
  },
  {
    id: "window_storm",
    kind: "window",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "...and in moments, the storm is upon you.",
      printOps: [
        { text: "...and in moments, the storm is upon you.", startX: 8, width: 312, x: 36, y: 14 }
      ],
      frame: 1,
      x: 1,
      y: 0x98,
      width: 312,
      textX: 36,
      textY: 14
    }
  },
  {
    id: "window_lightning",
    kind: "window",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "Tongues of lightning lash the sky, conducting an unceasing crescendo of thunder....",
      printOps: [
        { text: "Tongues of lightning lash the sky, conducting an unceasing ", startX: 8, width: 310, x: 8, y: 10 },
        { text: "crescendo of thunder....", startX: 8, width: 310, x: -1, y: -1 }
      ],
      frame: 1,
      x: 1,
      y: 0x98,
      width: 310,
      textX: 8,
      textY: 10
    }
  },
  {
    id: "window_strike",
    kind: "window",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "In a cataclysm of sound and light, a bolt of searing blue fire strikes the earth!",
      printOps: [
        { text: "In a cataclysm of sound and light, a bolt of searing ", startX: 8, width: 310, x: 8, y: 10 },
        { text: "blue fire strikes the earth!", startX: 8, width: 310, x: -1, y: -1 }
      ],
      frame: 1,
      x: 1,
      y: 0x98,
      width: 310,
      textX: 8,
      textY: 10
    }
  },
  {
    id: "window_pan",
    kind: "window",
    autoAdvanceMs: 4000,
    textCard: {
      text: "Lightning among the stones! Is this a sign from distant Britannia?",
      printOps: [
        { text: "Lightning among the stones!", startX: 8, width: 310, x: 73, y: 10 },
        { text: "Is this a sign from distant Britannia?", startX: 8, width: 310, x: 41, y: 18 }
      ],
      frame: 1,
      x: 1,
      y: 0x98,
      width: 310,
      textX: 41,
      textY: 10
    }
  },
  {
    id: "window_door_open",
    kind: "window",
    autoAdvanceMs: 1700,
    fadeInMs: 0,
    fadeOutMs: 0
  },
  {
    id: "window_run",
    kind: "window",
    autoAdvanceMs: 0,
    waitForInput: true,
    fadeOutMs: NUVIE_FADE_MS,
    fadeInMs: 0,
    textCard: {
      text: "You bolt from your house, stumbling, running blind in the storm. Into the forest, down the path, through the rain... to the stones.",
      printOps: [
        { text: "You bolt from your house, stumbling, running blind in the", startX: 7, width: 310, x: 8, y: 12 },
        { text: " storm. Into the forest, down the path, through the ", startX: 7, width: 310, x: -1, y: -1 },
        { text: "rain... to the stones.", startX: 7, width: 310, x: -1, y: -1 }
      ],
      frame: 2,
      x: 1,
      y: 0x98,
      width: 310,
      textX: 8,
      textY: 12
    }
  },
  {
    id: "stones_opening",
    kind: "stones",
    autoAdvanceMs: 0,
    waitForInput: true,
    fadeInMs: NUVIE_FADE_MS,
    textCard: {
      text: "Near the stones, the smell of damp, blasted earth hangs in the air. In a frozen moment of lightning-struck daylight, you glimpse a tiny obsidian stone in the midst of the circle!",
      printOps: [
        { text: "Near the stones, the smell of damp, blasted earth hangs ", startX: 7, width: 303, x: 7, y: 8 },
        { text: "in the air. In a frozen moment of lightning-struck ", startX: 7, width: 303, x: -1, y: -1 },
        { text: "daylight, you glimpse a tiny obsidian stone in the ", startX: 7, width: 303, x: -1, y: -1 },
        { text: "midst of the circle!", startX: 7, width: 303, x: -1, y: -1 }
      ],
      frame: 2,
      x: 1,
      y: 0x0c,
      width: 303,
      textX: 7,
      textY: 8
    }
  },
  {
    id: "stones_pickup",
    kind: "stones",
    autoAdvanceMs: 3200,
    textCard: {
      text: "Wondering, you pick it up....",
      printOps: [
        { text: "Wondering, you pick it up....", startX: 8, width: 234, x: 0x2a, y: 8 }
      ],
      frame: 0,
      x: 0x21,
      y: 0x1e,
      width: 234,
      textX: 42,
      textY: 8
    }
  },
  {
    id: "stones_gate",
    kind: "stones",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "...and from the heart of the stones, a softly glowing door ascends in silence!",
      printOps: [
        { text: "...and from the heart of the stones, a softly glowing door ", startX: 7, width: 303, x: 7, y: 10 },
        { text: "ascends in silence!", startX: 7, width: 303, x: -1, y: -1 }
      ],
      frame: 1,
      x: 1,
      y: 0xa0,
      width: 303,
      textX: 7,
      textY: 10
    }
  },
  {
    id: "stones_memory",
    kind: "stones",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "Exultant memories wash over you as you clutch the stone. When last you saw an orb such as this, it was cast down by Lord British to banish the tyrant Blackthorn!",
      printOps: [
        { text: "Exultant memories wash over you as you clutch the stone. ", startX: 7, width: 303, x: 7, y: 8 },
        { text: "When last you saw an orb such as this, it was cast down ", startX: 7, width: 303, x: -1, y: -1 },
        { text: "by Lord British to banish the tyrant Blackthorn!", startX: 7, width: 303, x: -1, y: -1 }
      ],
      frame: 2,
      x: 1,
      y: 0x98,
      width: 303,
      textX: 7,
      textY: 8
    }
  },
  {
    id: "stones_warning",
    kind: "stones",
    autoAdvanceMs: 0,
    waitForInput: true,
    textCard: {
      text: "But your joy soon gives way to apprehension. The gate to Britannia has always been blue... as blue as the morning sky.",
      printOps: [
        { text: "But your joy soon gives way to apprehension.", startX: 7, width: 303, x: 16, y: 8 },
        { text: "The gate to Britannia has always been blue...", startX: 7, width: 303, x: 18, y: 24 },
        { text: "as blue as the morning sky.", startX: 7, width: 303, x: 76, y: 32 }
      ],
      frame: 2,
      x: 1,
      y: 0x98,
      width: 303,
      textX: 16,
      textY: 8
    }
  },
  {
    id: "stones_sink",
    kind: "stones",
    autoAdvanceMs: 2200,
    textCard: {
      text: "Abruptly, the portal quivers and begins to sink into the ground. Its crimson light wanes!",
      printOps: [
        { text: "Abruptly, the portal quivers and begins to sink ", startX: 7, width: 303, x: 7, y: 10 },
        { text: "into the ground.  Its crimson light wanes!", startX: 7, width: 303, x: -1, y: -1 }
      ],
      frame: 1,
      x: 1,
      y: 0xa0,
      width: 303,
      textX: 7,
      textY: 10
    }
  },
  {
    id: "stones_decision",
    kind: "stones",
    autoAdvanceMs: 2200,
    textCard: {
      text: "Desperation makes the decision an easy one.",
      printOps: [
        { text: "Desperation makes the decision an easy one.", startX: 7, width: 303, x: 22, y: 14 }
      ],
      frame: 1,
      x: 1,
      y: 0xa0,
      width: 303,
      textX: 22,
      textY: 14
    }
  },
  {
    id: "stones_enter",
    kind: "stones",
    autoAdvanceMs: 4200,
    fadeOutMs: 1200
  }
]);

export function createBootIntroRuntimeState(): BootIntroRuntimeState {
  return {
    active: false,
    played: false,
    sceneIndex: 0,
    sceneElapsedMs: 0,
    phase: "fade_in",
    aborting: false
  };
}

export function currentBootIntroSceneRuntime(
  state: BootIntroRuntimeState | null | undefined
): BootIntroSceneSpec | null {
  const idx = Number(state?.sceneIndex) | 0;
  return BOOT_INTRO_SCENES[idx] || null;
}

export function startBootIntroRuntime(state: BootIntroRuntimeState | null | undefined) {
  if (!state) {
    return;
  }
  state.active = true;
  state.sceneIndex = 0;
  state.sceneElapsedMs = 0;
  state.phase = "fade_in";
  state.aborting = false;
}

function sceneFadeInMs(scene: BootIntroSceneSpec | null): number {
  return Math.max(0, Number(scene?.fadeInMs ?? DEFAULT_FADE_MS) || 0);
}

function sceneFadeOutMs(scene: BootIntroSceneSpec | null): number {
  return Math.max(0, Number(scene?.fadeOutMs ?? DEFAULT_FADE_MS) || 0);
}

function stepToNextScene(state: BootIntroRuntimeState) {
  state.sceneIndex += 1;
  state.sceneElapsedMs = 0;
  if (state.sceneIndex >= BOOT_INTRO_SCENES.length) {
    state.active = false;
    state.played = true;
    state.phase = "done";
    state.sceneIndex = BOOT_INTRO_SCENES.length - 1;
    return;
  }
  state.phase = "fade_in";
}

export function advanceBootIntroRuntime(
  state: BootIntroRuntimeState | null | undefined,
  dtMs: number
): { becameInactive: boolean } {
  if (!state || !state.active) {
    return { becameInactive: false };
  }
  const scene = currentBootIntroSceneRuntime(state);
  const prevActive = state.active;
  state.sceneElapsedMs += Math.max(0, Number(dtMs) || 0);
  if (!scene) {
    state.active = false;
    state.played = true;
    state.phase = "done";
    return { becameInactive: prevActive };
  }
  if (state.aborting) {
    if (state.sceneElapsedMs >= sceneFadeOutMs(scene)) {
      state.active = false;
      state.played = true;
      state.phase = "done";
    }
    return { becameInactive: prevActive && !state.active };
  }
  if (state.phase === "fade_in") {
    const fadeMs = sceneFadeInMs(scene);
    if (fadeMs <= 0 || state.sceneElapsedMs >= fadeMs) {
      state.sceneElapsedMs = 0;
      state.phase = "hold";
    }
    return { becameInactive: false };
  }
  if (state.phase === "hold") {
    if (scene.waitForInput) {
      return { becameInactive: false };
    }
    if (state.sceneElapsedMs >= Math.max(0, scene.autoAdvanceMs | 0)) {
      if (sceneFadeOutMs(scene) <= 0) {
        stepToNextScene(state);
      } else {
        state.sceneElapsedMs = 0;
        state.phase = "fade_out";
      }
    }
    return { becameInactive: false };
  }
  if (state.phase === "fade_out") {
    const fadeMs = sceneFadeOutMs(scene);
    if (fadeMs <= 0 || state.sceneElapsedMs >= fadeMs) {
      stepToNextScene(state);
    }
    return { becameInactive: prevActive && !state.active };
  }
  return { becameInactive: false };
}

export function abortBootIntroRuntime(state: BootIntroRuntimeState | null | undefined) {
  if (!state || !state.active) {
    return;
  }
  state.aborting = true;
  state.phase = "fade_out";
  state.sceneElapsedMs = 0;
}

export type BootIntroInputPlanRuntime = {
  action: "none" | "abort" | "advance";
  preventDefault: boolean;
};

export function bootIntroInputPlanRuntime(args: {
  active: unknown;
  awaitingGesture?: unknown;
  key?: unknown;
}): BootIntroInputPlanRuntime {
  if (!args.active) {
    return {
      action: "none",
      preventDefault: false
    };
  }
  const preventDefault = !!args.awaitingGesture;
  const key = String(args.key || "").toLowerCase();
  if (key === "escape") {
    return {
      action: "abort",
      preventDefault: true
    };
  }
  return {
    action: "advance",
    preventDefault
  };
}

export function advanceBootIntroInputRuntime(state: BootIntroRuntimeState | null | undefined): boolean {
  if (!state || !state.active || state.aborting) {
    return false;
  }
  const scene = currentBootIntroSceneRuntime(state);
  if (!scene || state.phase !== "hold" || !scene.waitForInput) {
    return false;
  }
  if (sceneFadeOutMs(scene) <= 0) {
    stepToNextScene(state);
  } else {
    state.phase = "fade_out";
    state.sceneElapsedMs = 0;
  }
  return true;
}

export function bootIntroOverlayAlphaRuntime(
  state: BootIntroRuntimeState | null | undefined
): number {
  if (!state || !state.active) {
    return 0;
  }
  const scene = currentBootIntroSceneRuntime(state);
  if (!scene) {
    return 255;
  }
  if (state.phase === "fade_in") {
    const total = sceneFadeInMs(scene);
    if (total <= 0) {
      return 0;
    }
    const t = Math.max(0, Math.min(1, state.sceneElapsedMs / total));
    return Math.round((1 - t) * 255);
  }
  if (state.phase === "fade_out") {
    const total = sceneFadeOutMs(scene);
    if (total <= 0) {
      return 0;
    }
    const t = Math.max(0, Math.min(1, state.sceneElapsedMs / total));
    return Math.round(t * 255);
  }
  return 0;
}

export function bootIntroScenePaletteIndexRuntime(scene: { kind?: unknown } | null | undefined): number {
  if (!scene || typeof scene !== "object") {
    return 0;
  }
  if (scene.kind === "lounge") {
    return 1;
  }
  if (scene.kind === "window") {
    return 2;
  }
  if (scene.kind === "stones") {
    return 3;
  }
  return 0;
}

export function bootIntroStonesPaletteShiftRuntime(
  scene: { kind?: unknown } | null | undefined,
  elapsedMs: number
): number {
  if (scene?.kind !== "stones") {
    return 0;
  }
  return Math.floor((Number(elapsedMs) | 0) / 125) & 0x0f;
}

export function bootIntroPaletteCacheKeyRuntime(
  scene: { id?: unknown; kind?: unknown } | null | undefined,
  elapsedMs: number
): string {
  const idx = bootIntroScenePaletteIndexRuntime(scene);
  let suffix = "";
  if (
    scene?.kind === "window"
    && (scene.id === "window_lightning" || scene.id === "window_strike" || scene.id === "window_pan")
  ) {
    suffix = ":storm";
  } else if (scene?.kind === "stones") {
    suffix = `${scene?.id === "stones_enter" ? ":enter" : ""}:r${bootIntroStonesPaletteShiftRuntime(scene, elapsedMs)}`;
  }
  return `p${idx}${suffix}`;
}

export function bootIntroCachedCanvasRuntime<TCanvas>(args: {
  cache: BootIntroCanvasCacheRuntime<TCanvas>;
  cacheKey: string;
  createCanvas: () => TCanvas | null | undefined;
}): TCanvas | null {
  const cached = args.cache.get(args.cacheKey);
  if (cached) {
    return cached;
  }
  const canvas = args.createCanvas() || null;
  if (canvas) {
    args.cache.set(args.cacheKey, canvas);
  }
  return canvas;
}

export function activeBootIntroPaletteRuntime(args: {
  basePalette: RgbPaletteRuntime | null | undefined;
  fallbackPalette: RgbPaletteRuntime | null | undefined;
  introPalettes: readonly RgbPaletteRuntime[] | null | undefined;
  scene: { id?: unknown; kind?: unknown } | null | undefined;
  sceneElapsedMs: number;
}): RgbPaletteRuntime | null {
  const idx = bootIntroScenePaletteIndexRuntime(args.scene);
  const paletteSrc = args.introPalettes?.[idx] || args.basePalette || args.fallbackPalette;
  if (!paletteSrc || paletteSrc.length < 256) {
    return null;
  }
  const palette = cloneRgbPaletteRuntime(paletteSrc);
  if (args.scene?.kind === "window") {
    const hot = args.scene.id === "window_lightning" || args.scene.id === "window_strike" || args.scene.id === "window_pan";
    if (hot) {
      palette[0x58] = [0x40, 0x94, 0xfc];
      palette[0x5a] = [0x40, 0x94, 0xfc];
      palette[0x5c] = [0x40, 0x94, 0xfc];
    }
  }
  if (args.scene?.id === "stones_enter") {
    palette[0x19] = [0, 0, 0];
  }
  if (args.scene?.kind === "stones") {
    rotatePaletteRangeInPlaceRuntime(palette, 0x90, 16, bootIntroStonesPaletteShiftRuntime(args.scene, args.sceneElapsedMs));
  }
  return palette;
}

export function bootIntroTvRandRuntime(
  ctx: Pick<BootIntroTvMachineRuntime, "seed">,
  min: number,
  max: number
): number {
  ctx.seed = ((ctx.seed * 1664525) + 1013904223) >>> 0;
  const lo = Math.min(min | 0, max | 0);
  const hi = Math.max(min | 0, max | 0);
  return lo + (ctx.seed % ((hi - lo) + 1));
}

export function createBootIntroTvMachineRuntime(): BootIntroTvMachineRuntime {
  return {
    program: 2,
    pos: 0,
    loopPos: 0,
    loopCnt: 0,
    newsImage: 0,
    pledgeCounter: 0,
    pledgeImage: 37,
    roadOffset: 0x0e,
    seed: 0x6d2b79f5,
    sprites: [],
    fingerVisible: false,
    staticVisible: false
  };
}

export function bootIntroTvAddSpriteRuntime(
  ctx: BootIntroTvMachineRuntime,
  imageNum: number,
  yOverride: number | null = null
): void {
  if (ctx.sprites.length >= 5) {
    return;
  }
  const num = Math.max(0, Number(imageNum) | 0);
  ctx.sprites.push({
    frame: 0x10 + num,
    xOff: BOOT_INTRO_TV_X_OFF[num] || 0,
    yOff: yOverride == null ? (BOOT_INTRO_TV_Y_OFF[num] || 0) : yOverride
  });
}

export function bootIntroTvDisplayRuntime(ctx: BootIntroTvMachineRuntime): void {
  ctx.sprites = [];
  ctx.fingerVisible = false;
  ctx.staticVisible = false;
  let shouldExit = false;
  let guard = 0;
  while (!shouldExit && guard < 80) {
    guard += 1;
    const program = BOOT_INTRO_TV_PROGRAMS[ctx.program] || BOOT_INTRO_TV_PROGRAMS[0];
    const item = program[ctx.pos] ?? 0x81;
    if (item < 0x80) {
      bootIntroTvAddSpriteRuntime(ctx, item);
    } else if (item === 0x82) {
      ctx.staticVisible = true;
      ctx.fingerVisible = true;
      shouldExit = true;
    } else if (item === 0x80) {
      ctx.pos += 1;
      ctx.loopCnt = program[ctx.pos] || 0;
      ctx.loopPos = ctx.pos;
    } else if (item === 0x81) {
      if (ctx.loopCnt > 0) {
        ctx.pos = ctx.loopPos;
        ctx.loopCnt -= 1;
      }
      shouldExit = true;
    } else if (item === 0x83) {
      ctx.roadOffset -= 1;
      if (ctx.roadOffset === 0) ctx.roadOffset = 0x0e;
      bootIntroTvAddSpriteRuntime(ctx, 0x22, 0x15 - ctx.roadOffset);
      bootIntroTvAddSpriteRuntime(ctx, 0x22, 0x24 - ctx.roadOffset);
      bootIntroTvAddSpriteRuntime(ctx, 0x21);
    } else if (item === 0x84) {
      const randLen = program[ctx.pos + 1] || 0;
      const choice = bootIntroTvRandRuntime(ctx, 1, Math.max(1, randLen));
      bootIntroTvAddSpriteRuntime(ctx, program[ctx.pos + choice + 1] || 0);
      ctx.pos += 1 + randLen;
    } else if (item === 0x86) {
      bootIntroTvAddSpriteRuntime(ctx, ctx.newsImage);
    } else if (item === 0x87) {
      ctx.newsImage = BOOT_INTRO_TV_NEWS_IMAGES[bootIntroTvRandRuntime(ctx, 0, BOOT_INTRO_TV_NEWS_IMAGES.length - 1)] || 0;
    } else if (item === 0x88) {
      ctx.pledgeCounter += 1;
      if ((ctx.pledgeCounter % 4) === 0) {
        bootIntroTvAddSpriteRuntime(ctx, ctx.pledgeImage);
      }
      if (ctx.pledgeCounter === 16) {
        ctx.pledgeImage = ctx.pledgeImage === 37 ? 38 : 37;
        ctx.pledgeCounter = 0;
      }
    } else if (item === 0x89) {
      bootIntroTvAddSpriteRuntime(ctx, bootIntroTvRandRuntime(ctx, 50, 52));
    } else if (item === 0x8a) {
      shouldExit = true;
    }
    ctx.pos += 1;
    const currentProgram = BOOT_INTRO_TV_PROGRAMS[ctx.program] || BOOT_INTRO_TV_PROGRAMS[0];
    if (ctx.pos >= currentProgram.length) {
      ctx.program += 1;
      ctx.pos = 0;
      if (ctx.program >= BOOT_INTRO_TV_PROGRAMS.length) {
        ctx.program = 0;
      }
    }
  }
}

export function bootIntroTvStateAtRuntime(updateCount: number): BootIntroTvMachineRuntime {
  const ctx = createBootIntroTvMachineRuntime();
  const count = Math.max(0, Math.min(2400, Number(updateCount) | 0));
  for (let i = 0; i <= count; i += 1) {
    bootIntroTvDisplayRuntime(ctx);
  }
  return ctx;
}

export function decodeBootIntroWouFontRuntime(
  bytes: Uint8Array | null | undefined,
  decompress: (bytes: Uint8Array | null | undefined) => Uint8Array | null | undefined
): BootIntroWouFontRuntime | null {
  const decoded = decompress(bytes);
  if (!decoded || decoded.length < 0x304) {
    return null;
  }
  const height = decoded[0] | 0;
  const pixelChar = decoded[2] & 0xff;
  if (height <= 0 || height > 32) {
    return null;
  }
  return { bytes: decoded, height, pixelChar };
}

export function bootIntroWouCharWidthRuntime(
  font: BootIntroWouFontRuntime | null | undefined,
  code: number
): number {
  if (!font || !font.bytes) {
    return 0;
  }
  return font.bytes[0x04 + (code & 0xff)] || 0;
}

export function measureBootIntroTextWidthRuntime(
  font: BootIntroWouFontRuntime | null | undefined,
  text: unknown,
  fallbackMeasure: (text: unknown) => number
): number {
  if (!font) {
    return fallbackMeasure(text);
  }
  const msg = String(text || "");
  let width = 0;
  for (let i = 0; i < msg.length; i += 1) {
    width += bootIntroWouCharWidthRuntime(font, msg.charCodeAt(i));
  }
  return width;
}

export function drawBootIntroWouTextRuntime(
  g: BootIntroTextCanvasRuntime,
  args: {
    color: string;
    drawFallbackText: (g: BootIntroTextCanvasRuntime, text: string, sx: number, sy: number, scale: number, color: string) => void;
    fallbackMeasure: (text: unknown) => number;
    font: BootIntroWouFontRuntime | null | undefined;
    scale: number;
    sx: number;
    sy: number;
    text: unknown;
  }
): number {
  const scale = Math.max(1, Number(args.scale) || 1);
  const sx = Number(args.sx) || 0;
  const sy = Number(args.sy) || 0;
  const msg = String(args.text || "");
  const font = args.font;
  if (!font) {
    args.drawFallbackText(g, msg, sx, sy, scale, args.color);
    return sx + args.fallbackMeasure(msg) * scale;
  }
  const bytes = font.bytes;
  const height = font.height | 0;
  const pixelChar = font.pixelChar & 0xff;
  let cursor = 0;
  g.fillStyle = args.color;
  for (let i = 0; i < msg.length; i += 1) {
    const code = msg.charCodeAt(i) & 0xff;
    const width = bytes[0x04 + code] || 0;
    const glyphOff = ((bytes[0x204 + code] || 0) << 8) + (bytes[0x104 + code] || 0);
    if (width > 0 && glyphOff > 0 && glyphOff + (width * height) <= bytes.length) {
      for (let row = 0; row < height; row += 1) {
        const rowOff = glyphOff + (row * width);
        for (let col = 0; col < width; col += 1) {
          if ((bytes[rowOff + col] & 0xff) === pixelChar) {
            g.fillRect(
              sx + ((cursor + col) * scale),
              sy + (row * scale),
              scale,
              scale
            );
          }
        }
      }
    }
    cursor += width;
  }
  return sx + cursor * scale;
}

export function bootIntroPrintTextRuntime(
  g: BootIntroTextCanvasRuntime,
  args: {
    color: string;
    drawTextRun: (g: BootIntroTextCanvasRuntime, text: string, x: number, y: number, scale: number, color: string) => number;
    measureText: (text: string) => number;
    scale: number;
    spaceWidth: number;
    startX: number;
    text: unknown;
    width: number;
    x: number;
    y: number;
  }
): { x: number; y: number } {
  const src = String(args.text || "");
  const spaceWidth = Math.max(0, Number(args.spaceWidth) || 0);
  const width = Number(args.width) || 0;
  const startX = Number(args.startX) | 0;
  let cursorX = Math.max(0, Number(args.x) | 0);
  let cursorY = Math.max(0, Number(args.y) | 0);
  let len = cursorX - startX;
  const tokens: string[] = [];
  let start = 0;
  let found = src.indexOf(" ", start);
  while (found !== -1) {
    const token = src.slice(start, found);
    const tokenLen = args.measureText(token);
    if (len + tokenLen + spaceWidth > width) {
      let newSpace = 0;
      if (tokens.length > 1) {
        newSpace = Math.floor((width - (len - spaceWidth * (tokens.length - 1))) / (tokens.length - 1));
      }
      for (const item of tokens) {
        cursorX = args.drawTextRun(g, item, cursorX, cursorY, args.scale, args.color);
        cursorX += newSpace;
      }
      cursorY += 8;
      cursorX = startX;
      len = tokenLen + spaceWidth;
      tokens.length = 0;
      tokens.push(token);
    } else {
      tokens.push(token);
      len += tokenLen + spaceWidth;
    }
    start = found + 1;
    found = src.indexOf(" ", start);
  }
  for (const item of tokens) {
    cursorX = args.drawTextRun(g, item, cursorX, cursorY, args.scale, args.color);
    cursorX += spaceWidth;
  }
  if (start < src.length) {
    const token = src.slice(start);
    if (len + args.measureText(token) > width) {
      cursorY += 8;
      cursorX = startX;
    }
    cursorX = args.drawTextRun(g, token, cursorX, cursorY, args.scale, args.color);
  }
  return { x: cursorX, y: cursorY };
}

export function bootIntroPrintTextOnCardRuntime(
  g: BootIntroTextCanvasRuntime,
  args: {
    cardX: number;
    cardY: number;
    color: string;
    drawTextRun: (g: BootIntroTextCanvasRuntime, text: string, x: number, y: number, scale: number, color: string) => number;
    measureText: (text: string) => number;
    scale: number;
    spaceWidth: number;
    startX: number;
    text: unknown;
    width: number;
    x: number;
    y: number;
  }
): { x: number; y: number } {
  const translated: BootIntroTextCanvasRuntime = {
    fillStyle: g.fillStyle,
    fillRect: (px, py, pw, ph) => {
      g.fillStyle = translated.fillStyle;
      g.fillRect(
        px + Math.round((Number(args.cardX) || 0) * args.scale),
        py + Math.round((Number(args.cardY) || 0) * args.scale),
        pw,
        ph
      );
    }
  };
  return bootIntroPrintTextRuntime(translated, args);
}

export function bootIntroTvStaticCellsRuntime(seed: number, width = 57, height = 37): BootIntroTvStaticCellRuntime[] {
  let s = seed >>> 0;
  const w = Math.max(0, Number(width) | 0);
  const h = Math.max(0, Number(height) | 0);
  const cells: BootIntroTvStaticCellRuntime[] = [];
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      s = ((s * 1103515245) + 12345) >>> 0;
      cells.push({
        colorIndex: ((s >>> 16) & 1) ? 0x3e : 0x00,
        px,
        py
      });
    }
  }
  return cells;
}

export function bootIntroSpriteDrawRectRuntime(args: {
  alpha?: unknown;
  h?: unknown;
  scale?: unknown;
  spriteHeight: unknown;
  spriteWidth: unknown;
  w?: unknown;
  x?: unknown;
  y?: unknown;
}): BootIntroDrawRectRuntime {
  const scale = Math.max(1, Number(args.scale) || 1);
  const spriteWidth = Math.max(0, Number(args.spriteWidth) || 0);
  const spriteHeight = Math.max(0, Number(args.spriteHeight) || 0);
  const w = args.w == null ? spriteWidth : Math.max(0, Number(args.w) || 0);
  const h = args.h == null ? spriteHeight : Math.max(0, Number(args.h) || 0);
  return {
    alpha: Math.max(0, Math.min(1, Number(args.alpha ?? 1))),
    h: Math.round(h * scale),
    w: Math.round(w * scale),
    x: Math.round((Number(args.x) || 0) * scale),
    y: Math.round((Number(args.y) || 0) * scale)
  };
}

export function bootIntroClipRectRuntime(args: {
  clipH?: unknown;
  clipW?: unknown;
  clipX?: unknown;
  clipY?: unknown;
  scale?: unknown;
}): Pick<BootIntroDrawRectRuntime, "h" | "w" | "x" | "y"> {
  const scale = Math.max(1, Number(args.scale) || 1);
  return {
    h: Math.round((Number(args.clipH) || 0) * scale),
    w: Math.round((Number(args.clipW) || 0) * scale),
    x: Math.round((Number(args.clipX) || 0) * scale),
    y: Math.round((Number(args.clipY) || 0) * scale)
  };
}

export function bootIntroTvStaticDrawCellsRuntime(args: {
  fallbackDark?: readonly number[];
  fallbackLight?: readonly number[];
  height?: unknown;
  palette?: readonly (readonly number[] | null | undefined)[] | null;
  scale?: unknown;
  seed: unknown;
  width?: unknown;
  x?: unknown;
  y?: unknown;
}): BootIntroStaticDrawCellRuntime[] {
  const scale = Math.max(1, Number(args.scale) | 0);
  const cell = Math.max(1, scale);
  const x = Number(args.x) || 0;
  const y = Number(args.y) || 0;
  const palette = Array.isArray(args.palette) ? args.palette : [];
  const fallbackLight = Array.isArray(args.fallbackLight) ? args.fallbackLight : [230, 209, 160];
  const fallbackDark = Array.isArray(args.fallbackDark) ? args.fallbackDark : [0, 0, 0];
  return bootIntroTvStaticCellsRuntime(
    Number(args.seed) | 0,
    Number(args.width ?? 57) | 0,
    Number(args.height ?? 37) | 0
  ).map((staticCell) => {
    const idx = staticCell.colorIndex;
    const rgb = palette[idx] || (idx ? fallbackLight : fallbackDark);
    return {
      color: `rgb(${Number(rgb[0]) | 0}, ${Number(rgb[1]) | 0}, ${Number(rgb[2]) | 0})`,
      h: cell,
      w: cell,
      x: Math.round((x + staticCell.px) * scale),
      y: Math.round((y + staticCell.py) * scale)
    };
  });
}

export function buildBootIntroSplashRenderPlanRuntime(args: {
  scale?: unknown;
  scene: BootIntroSceneSpec;
  spriteHeight?: unknown;
  spriteWidth?: unknown;
}): BootIntroSplashRenderPlanRuntime {
  const scale = Math.max(1, Number(args.scale) || 1);
  const spriteWidth = Number(args.spriteWidth);
  const spriteHeight = Number(args.spriteHeight);
  const hasSprite = Number.isFinite(spriteWidth) && spriteWidth > 0 && Number.isFinite(spriteHeight) && spriteHeight > 0;
  return {
    clear: true,
    sprite: hasSprite
      ? {
        frame: Number(args.scene?.splashFrame) | 0,
        h: Math.round(spriteHeight * scale),
        w: Math.round(spriteWidth * scale),
        x: Math.floor(((320 * scale) - (spriteWidth * scale)) / 2),
        y: Math.floor(((200 * scale) - (spriteHeight * scale)) / 2)
      }
      : null
  };
}

export function buildBootIntroLayerRenderPlanRuntime(
  state: BootIntroRuntimeState | null | undefined
): BootIntroLayerRenderPlanRuntime {
  if (!state?.active) {
    return {
      kind: "startup",
      overlayAlpha: 0,
      scene: null,
      sceneKind: null
    };
  }
  const scene = currentBootIntroSceneRuntime(state);
  if (!scene) {
    return {
      kind: "startup",
      overlayAlpha: 0,
      scene: null,
      sceneKind: null
    };
  }
  return {
    kind: "intro",
    overlayAlpha: bootIntroOverlayAlphaRuntime(state),
    scene,
    sceneKind: scene.kind
  };
}

export function bootIntroClockFramesRuntime(now: Date = new Date()): number[] {
  let hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > 12) {
    hour -= 12;
  }
  const h1 = hour < 10 ? 12 : 3;
  if (hour >= 10) {
    hour -= 10;
  }
  return [
    h1,
    hour + 2,
    Math.floor(minute / 10) + 2,
    (minute % 10) + 2
  ];
}

export function bootIntroClockSpritesRuntime(now: Date, scrollPx: unknown): BootIntroClockSpriteRuntime[] {
  const frames = bootIntroClockFramesRuntime(now);
  const xOff = Math.floor(Number(scrollPx) || 0);
  return [
    { frame: frames[0], x: 0xdd - xOff, y: 0x14 },
    { frame: frames[1], x: 0xe1 - xOff, y: 0x14 },
    { frame: frames[2], x: 0xe7 - xOff, y: 0x14 },
    { frame: frames[3], x: 0xeb - xOff, y: 0x14 }
  ];
}

export function buildBootIntroLoungeRenderPlanRuntime(args: {
  elapsedMs: unknown;
  now?: Date;
  scene: BootIntroSceneSpec;
}): BootIntroLoungeRenderPlanRuntime {
  const scene = args.scene;
  const elapsed = Number(args.elapsedMs) | 0;
  const scrollPx = scene?.id === "lounge_pan"
    ? Math.min(319, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 319))
    : 0;
  const tvBaseX = 0xe5 - scrollPx;
  const tvBaseY = 0x32;
  const tvSceneBase = scene?.id === "lounge_reflection" ? 120 : (scene?.id === "lounge_pan" ? 240 : 0);
  const tvUpdate = tvSceneBase + Math.floor(elapsed / 100);
  const tvState = bootIntroTvStateAtRuntime(tvUpdate);
  const clipX = Math.max(0, tvBaseX);
  const coord = (value: number): number => Object.is(value, -0) ? 0 : value;
  const sprites: BootIntroSpriteOpRuntime[] = [
    { bank: "intro1", frame: 15, x: 210 - Math.max(0, scrollPx - 160), y: 0, scene },
    { bank: "intro1", frame: 0, x: coord(-scrollPx), y: 0, scene },
    { bank: "intro1", frame: 1, x: 320 - scrollPx, y: 0, scene },
    { bank: "intro1", frame: 13, x: coord(-Math.floor(scrollPx * 2)), y: 63, scene },
    { bank: "intro1", frame: 14, x: 143 - Math.floor(scrollPx * 2), y: 91, scene }
  ];
  const staticOps = tvState.staticVisible
    ? [{ x: tvBaseX, y: tvBaseY, w: 57, h: 37, seed: 0x9e3779b9 ^ tvUpdate }]
    : [];
  const clippedSprites = tvState.sprites.map((tvSprite) => ({
    bank: "intro1" as const,
    frame: tvSprite.frame,
    x: tvBaseX + tvSprite.xOff,
    y: tvBaseY + tvSprite.yOff,
    scene,
    clipX,
    clipY: tvBaseY,
    clipW: 57,
    clipH: 37
  }));
  if (tvState.fingerVisible) {
    sprites.push({ bank: "intro1", frame: 0x0e, x: 143 - Math.floor(scrollPx * 2), y: 91, scene });
  }
  for (const clockSprite of bootIntroClockSpritesRuntime(args.now ?? new Date(), scrollPx)) {
    sprites.push({
      bank: "intro1",
      frame: clockSprite.frame,
      x: clockSprite.x,
      y: clockSprite.y,
      scene
    });
  }
  return {
    clear: true,
    clippedSprites,
    sprites,
    staticOps
  };
}

export function buildBootIntroTextCardRenderPlanRuntime(args: {
  card: BootIntroTextCard | null | undefined;
  measureText: (text: string) => number;
  scale: number;
  textColor: readonly number[];
  wrapText: (text: string, maxWidthPx: number) => string[];
}): BootIntroTextCardRenderPlanRuntime | null {
  const card = args.card;
  if (!card || !card.text) {
    return null;
  }
  const scale = Math.max(1, Number(args.scale) || 1);
  const colorRgb = Array.isArray(args.textColor) ? args.textColor : [];
  const color = `rgb(${Number(colorRgb[0]) | 0}, ${Number(colorRgb[1]) | 0}, ${Number(colorRgb[2]) | 0})`;
  const textMaxWidth = Math.max(8, (Number(card.width) || 0) - (Number(card.textX) || 0) - 6);
  const explicitLines = Array.isArray(card.lines)
    ? card.lines.map((line) => String(line || "").trim()).filter(Boolean)
    : null;
  const sourceLines = explicitLines && explicitLines.length
    ? explicitLines
    : args.wrapText(card.text, textMaxWidth);
  const panel = {
    frame: Number(card.frame) | 0,
    x: Math.round((Number(card.x) || 0) * scale),
    y: Math.round((Number(card.y) || 0) * scale)
  };
  if (Array.isArray(card.printOps) && card.printOps.length) {
    const printOps: BootIntroTextCardPrintOpRuntime[] = [];
    for (const op of card.printOps) {
      printOps.push({
        startX: Number(op.startX) || 0,
        text: op.text,
        width: Number(op.width) || textMaxWidth,
        x: Number(op.x) | 0,
        y: Number(op.y) | 0
      });
    }
    return {
      color,
      lines: [],
      panel,
      printOps,
      textMaxWidth
    };
  }
  const lines: BootIntroTextCardLineRuntime[] = [];
  for (let i = 0; i < sourceLines.length; i += 1) {
    const line = sourceLines[i];
    const baseX = ((Number(card.x) || 0) + (Number(card.textX) || 0));
    const lineWidth = args.measureText(line);
    const drawX = card.align === "center"
      ? Math.round((((Number(card.x) || 0) + (((Number(card.width) || 0) - lineWidth) / 2))) * scale)
      : Math.round(baseX * scale);
    lines.push({
      drawX,
      text: line,
      y: Math.round((((Number(card.y) || 0) + (Number(card.textY) || 0)) + (i * 8)) * scale)
    });
  }
  return {
    color,
    lines,
    panel,
    printOps: [],
    textMaxWidth
  };
}

export function resolveBootIntroTextCardPrintOpRuntime(
  op: BootIntroTextCardPrintOpRuntime,
  last: { x: unknown; y: unknown } = { x: 0, y: 0 }
): BootIntroTextCardResolvedPrintOpRuntime {
  return {
    ...op,
    resolvedX: (Number(op.x) | 0) >= 0 ? (Number(op.x) | 0) : (Number(last.x) | 0),
    resolvedY: (Number(op.y) | 0) >= 0 ? (Number(op.y) | 0) : (Number(last.y) | 0)
  };
}

export function bootIntroWindowRandRuntime(
  ctx: Pick<BootIntroWindowStateRuntime, "seed">,
  min: number,
  max: number
): number {
  ctx.seed = ((ctx.seed * 1664525) + 1013904223) >>> 0;
  const lo = Math.min(min | 0, max | 0);
  const hi = Math.max(min | 0, max | 0);
  return lo + (ctx.seed % ((hi - lo) + 1));
}

export function bootIntroWindowSceneBaseRuntime(sceneId: unknown): number {
  if (sceneId === "window_lightning") return 80;
  if (sceneId === "window_strike") return 160;
  if (sceneId === "window_pan") return 240;
  if (sceneId === "window_door_open") return 405;
  if (sceneId === "window_run") return 475;
  return 20;
}

export function bootIntroWindowStateAtRuntime(
  scene: { id?: unknown } | null | undefined,
  updateCount: number,
  forceStrike: boolean
): BootIntroWindowStateRuntime {
  const ctx: BootIntroWindowStateRuntime = {
    seed: 0x51f15eED,
    cloudX: -400,
    clouds: [
      { frame: 2, x: -216, y: 6 },
      { frame: 3, x: -149, y: 18 },
      { frame: 2, x: -88, y: 4 },
      { frame: 3, x: 7, y: 23 },
      { frame: 2, x: 58, y: 11 }
    ],
    lightningCounter: 0,
    lightningFrame: 11,
    lightningX: 0,
    lightningY: 0,
    lightningDrawX: 0,
    lightningDrawY: 0,
    lightningVisible: false,
    strikeFrame: 19,
    flash: 0,
    windowFrame: 26,
    rain: []
  };
  const count = Math.max(0, Math.min(1200, Number(updateCount) | 0));
  for (let step = 0; step <= count; step += 1) {
    for (const cloud of ctx.clouds) {
      if (cloud.x > 320) {
        cloud.x = bootIntroWindowRandRuntime(ctx, 0, 320) - 320;
        cloud.y = bootIntroWindowRandRuntime(ctx, 0, 30);
      }
      cloud.x += 2;
    }
    ctx.cloudX += 1;
    if (ctx.cloudX === 320) {
      ctx.cloudX = 0;
    }
    if (bootIntroWindowRandRuntime(ctx, 0, 6) === 0 && ctx.lightningCounter === 0) {
      ctx.lightningCounter = bootIntroWindowRandRuntime(ctx, 1, 4);
      ctx.lightningFrame = bootIntroWindowRandRuntime(ctx, 11, 18);
      ctx.lightningX = bootIntroWindowRandRuntime(ctx, -5, 320);
      ctx.lightningY = bootIntroWindowRandRuntime(ctx, -5, 200);
      ctx.lightningVisible = true;
    }
    if (ctx.lightningCounter > 0) {
      ctx.lightningVisible = true;
      ctx.lightningDrawX = ctx.lightningX + bootIntroWindowRandRuntime(ctx, 0, 3);
      ctx.lightningDrawY = ctx.lightningY + bootIntroWindowRandRuntime(ctx, 0, 3);
    } else {
      ctx.lightningVisible = false;
    }
    if (bootIntroWindowRandRuntime(ctx, 0, 1) === 0) {
      ctx.strikeFrame = bootIntroWindowRandRuntime(ctx, 19, 23);
    }
    if (ctx.flash > 0) {
      ctx.flash -= 1;
    } else if (bootIntroWindowRandRuntime(ctx, 0, 5) === 0 || forceStrike) {
      ctx.windowFrame = 27;
      ctx.flash = bootIntroWindowRandRuntime(ctx, 1, 5);
    } else {
      ctx.windowFrame = 26;
    }
    if (ctx.rain.length < 100 && bootIntroWindowRandRuntime(ctx, 0, Math.max(1, 20 - Math.floor(ctx.rain.length / 8))) === 0) {
      ctx.rain.push({
        frame: bootIntroWindowRandRuntime(ctx, 4, 7),
        x: bootIntroWindowRandRuntime(ctx, 0, 320),
        y: -4
      });
    }
    for (const drop of ctx.rain) {
      drop.x += 2;
      drop.y += 8;
      if (drop.x > 320 || drop.y > 200) {
        drop.frame = bootIntroWindowRandRuntime(ctx, 4, 7);
        drop.x = bootIntroWindowRandRuntime(ctx, 0, 320);
        drop.y = -4;
      }
    }
    if (ctx.lightningCounter > 0) {
      ctx.lightningCounter -= 1;
    }
  }
  void scene;
  return ctx;
}

export function buildBootIntroWindowRenderPlanRuntime(args: {
  elapsedMs: unknown;
  scene: BootIntroSceneSpec;
}): BootIntroWindowRenderPlanRuntime {
  const scene = args.scene;
  const elapsed = Number(args.elapsedMs) | 0;
  const panPx = scene?.id === "window_pan"
    ? Math.min(320, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 320))
    : ((scene?.id === "window_door_open" || scene?.id === "window_run") ? 320 : 0);
  const doorOpenPx = scene?.id === "window_door_open"
    ? Math.min(68, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 68))
    : (scene?.id === "window_run" ? 68 : 0);
  const strikeVisible = scene?.id === "window_strike"
    || (scene?.id === "window_pan" && panPx <= 160);
  const updateCount = bootIntroWindowSceneBaseRuntime(scene?.id) + Math.floor(elapsed / 80);
  const windowState = bootIntroWindowStateAtRuntime(scene, updateCount, strikeVisible);
  const coord = (value: number): number => Object.is(value, -0) ? 0 : value;
  const sprites: BootIntroSpriteOpRuntime[] = [
    { bank: "intro2", frame: 1, x: 0, y: 0, scene },
    { bank: "intro2", frame: 0, x: windowState.cloudX, y: -5, scene },
    { bank: "intro2", frame: 0, x: windowState.cloudX - 320, y: -5, scene },
    { bank: "intro2", frame: 10, x: 0, y: 0x4c, scene },
    { bank: "intro2", frame: 8, x: 0, y: 0, scene }
  ];
  for (const cloud of windowState.clouds) {
    sprites.push({ bank: "intro2", frame: cloud.frame, x: cloud.x, y: cloud.y, scene });
  }
  if (windowState.lightningVisible) {
    sprites.push({
      bank: "intro2",
      frame: windowState.lightningFrame,
      x: windowState.lightningDrawX,
      y: windowState.lightningDrawY,
      scene
    });
  }
  if (strikeVisible) {
    sprites.push({ bank: "intro2", frame: windowState.strikeFrame, x: 158, y: 114, scene });
  }
  for (const drop of windowState.rain) {
    sprites.push({ bank: "intro2", frame: drop.frame, x: drop.x, y: drop.y, scene });
  }
  sprites.push(
    { bank: "intro2", frame: 28, x: coord(-panPx), y: 0, scene },
    { bank: "intro2", frame: windowState.windowFrame, x: 0x39 - panPx, y: 0, scene },
    { bank: "intro2", frame: 24, x: 320 - panPx - doorOpenPx, y: 0, scene },
    { bank: "intro2", frame: 25, x: 573 - panPx + doorOpenPx, y: 0, scene }
  );
  return {
    clear: true,
    sprites
  };
}

export function buildBootIntroStonesRenderPlanRuntime(args: {
  elapsedMs: unknown;
  scene: BootIntroSceneSpec;
}): BootIntroStonesRenderPlanRuntime {
  const scene = args.scene;
  const elapsed = Number(args.elapsedMs) | 0;
  const gateScene =
    scene?.id === "stones_gate"
    || scene?.id === "stones_memory"
    || scene?.id === "stones_warning"
    || scene?.id === "stones_sink"
    || scene?.id === "stones_decision"
    || scene?.id === "stones_enter";
  const gateRisePx = scene?.id === "stones_gate"
    ? Math.max(5, 0x64 - Math.floor(elapsed / 25))
    : (gateScene ? 5 : 0x64);
  const gateSinkPx = scene?.id === "stones_enter"
    ? Math.min(0x64, 5 + Math.floor(elapsed / 25))
    : gateRisePx;
  const gateRiseDoneMs = (0x64 - 0x05) * 25;
  const handY = scene?.id === "stones_pickup"
    ? Math.max(0x54, 0xc7 - Math.floor(elapsed / 18) * 2)
    : (scene?.id === "stones_gate"
      ? Math.min(0xc7, 0x54 + Math.max(0, Math.floor((elapsed - gateRiseDoneMs) / 25)) * 2)
      : (scene?.id === "stones_memory" ? 0x44 : 0xc7));
  const sprites: BootIntroSpriteOpRuntime[] = [
    { bank: "intro3", frame: gateScene ? 5 : 0, x: 0, y: 0, scene }
  ];
  if (!gateScene) {
    sprites.push({ bank: "intro3", frame: 3, x: 0x96, y: 0x64, scene });
  }
  if (gateScene) {
    sprites.push({ bank: "intro3", frame: 4, x: 0x5e, y: 0x66, scene });
  }
  if (scene?.id === "stones_pickup" || scene?.id === "stones_gate" || scene?.id === "stones_memory") {
    sprites.push({
      bank: "intro3",
      frame: scene?.id === "stones_memory" ? 6 : 1,
      x: scene?.id === "stones_memory" ? 0x9b : 0xbd,
      y: handY,
      scene
    });
  }
  const clippedSprites: BootIntroClippedSpriteOpRuntime[] = [];
  if (gateScene) {
    const shake = (scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter")
      ? (Math.floor(elapsed / 80) % 2)
      : 0;
    clippedSprites.push({
      bank: "intro3",
      frame: 2,
      x: 0x7c + shake,
      y: scene?.id === "stones_enter" ? gateSinkPx : gateRisePx,
      scene,
      clipX: 0,
      clipY: 0,
      clipW: 320,
      clipH: 0x66
    });
  }
  if (scene?.id === "stones_enter") {
    sprites.push({
      alpha: Math.max(0, 1 - Math.max(0, elapsed - 2400) / 1200),
      bank: "intro3",
      frame: 7 + Math.min(19, Math.floor(elapsed / 180)),
      x: -2,
      y: Math.max(-20, 0x12 - Math.floor(elapsed / 60)),
      scene
    });
  }
  return {
    clear: true,
    clippedSprites,
    sprites
  };
}

export function wrapBootIntroTextRuntime(text: unknown, maxChars: number): string[] {
  const src = String(text || "").replace(/\s+/g, " ").trim();
  if (!src) {
    return [];
  }
  const words = src.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

export function wrapBootIntroTextPixelsRuntime(
  text: unknown,
  maxWidthPx: number,
  measureTextWidth: (text: string) => number
): string[] {
  const src = String(text || "").replace(/\s+/g, " ").trim();
  if (!src) {
    return [];
  }
  const limit = Math.max(8, Number(maxWidthPx) || 0);
  const words = src.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measureTextWidth(next) > limit) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

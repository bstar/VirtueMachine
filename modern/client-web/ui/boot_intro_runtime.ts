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

const NUVIE_FADE_MS = Math.ceil(0x100 / 3) * 25;
const DEFAULT_FADE_MS = 0;

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

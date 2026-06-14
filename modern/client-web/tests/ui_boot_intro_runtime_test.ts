import assert from "node:assert/strict";
import {
  BOOT_INTRO_SCENES,
  abortBootIntroRuntime,
  advanceBootIntroInputRuntime,
  advanceBootIntroRuntime,
  activeBootIntroPaletteRuntime,
  bootIntroPaletteCacheKeyRuntime,
  bootIntroScenePaletteIndexRuntime,
  bootIntroStonesPaletteShiftRuntime,
  bootIntroWindowRandRuntime,
  bootIntroWindowSceneBaseRuntime,
  bootIntroWindowStateAtRuntime,
  bootIntroTvAddSpriteRuntime,
  bootIntroTvRandRuntime,
  bootIntroTvStateAtRuntime,
  bootIntroPrintTextOnCardRuntime,
  bootIntroPrintTextRuntime,
  bootIntroClockFramesRuntime,
  bootIntroClockSpritesRuntime,
  bootIntroWouCharWidthRuntime,
  bootIntroTvStaticCellsRuntime,
  createBootIntroTvMachineRuntime,
  decodeBootIntroWouFontRuntime,
  drawBootIntroWouTextRuntime,
  measureBootIntroTextWidthRuntime,
  bootIntroOverlayAlphaRuntime,
  createBootIntroRuntimeState,
  currentBootIntroSceneRuntime,
  startBootIntroRuntime,
  wrapBootIntroTextPixelsRuntime,
  wrapBootIntroTextRuntime
} from "../ui/boot_intro_runtime.ts";

type RectCall = { color: unknown; h: number; w: number; x: number; y: number };

function makeFakeTextCanvas() {
  return {
    fillStyle: "",
    rects: [] as RectCall[],
    fillRect(x: number, y: number, w: number, h: number) {
      this.rects.push({ color: this.fillStyle, x, y, w, h });
    }
  };
}

function testStartAndAdvance() {
  const state = createBootIntroRuntimeState();
  startBootIntroRuntime(state);
  assert.equal(state.active, true, "boot intro should start active");
  assert.equal(currentBootIntroSceneRuntime(state)?.id, "logo_1", "first boot intro scene mismatch");

  advanceBootIntroRuntime(state, (BOOT_INTRO_SCENES[0].fadeInMs || 0) + 1);
  assert.equal(state.phase, "hold", "logo scene should enter hold after fade in");

  advanceBootIntroRuntime(state, BOOT_INTRO_SCENES[0].autoAdvanceMs + 1);
  assert.equal(state.phase, "fade_out", "logo scene should fade out after hold");
}

function advancePastScene(state: ReturnType<typeof createBootIntroRuntimeState>) {
  const scene = currentBootIntroSceneRuntime(state);
  advanceBootIntroRuntime(state, (scene?.fadeInMs || 0) + 1);
  advanceBootIntroRuntime(state, (scene?.autoAdvanceMs || 0) + 1);
  advanceBootIntroRuntime(state, (scene?.fadeOutMs || 0) + 1);
}

function testInputAdvance() {
  const state = createBootIntroRuntimeState();
  startBootIntroRuntime(state);
  advancePastScene(state);
  assert.equal(currentBootIntroSceneRuntime(state)?.id, "logo_2", "second logo should be active");

  advancePastScene(state);
  assert.equal(currentBootIntroSceneRuntime(state)?.id, "lounge_opening", "lounge opening should follow logos");

  advanceBootIntroRuntime(state, 1);
  assert.equal(state.phase, "hold", "wait scene should reach hold");
  assert.equal(advanceBootIntroInputRuntime(state), true, "wait scene should accept input advance");
  assert.equal(currentBootIntroSceneRuntime(state)?.id, "lounge_reflection", "ordinary text input should advance without fade");
  assert.equal(state.phase, "fade_in", "next zero-fade scene should enter via instant fade phase");
}

function testAbort() {
  const state = createBootIntroRuntimeState();
  startBootIntroRuntime(state);
  abortBootIntroRuntime(state);
  assert.equal(state.phase, "fade_out", "abort should force fade out");
  advanceBootIntroRuntime(state, (BOOT_INTRO_SCENES[0].fadeOutMs || 0) + 1);
  assert.equal(state.active, false, "abort should finish inactive");
  assert.equal(state.played, true, "abort should mark intro as played");
}

function testOverlayAlpha() {
  const state = createBootIntroRuntimeState();
  startBootIntroRuntime(state);
  const startAlpha = bootIntroOverlayAlphaRuntime(state);
  assert.ok(startAlpha > 200, "fade in should start mostly black");
  advanceBootIntroRuntime(state, Math.floor((BOOT_INTRO_SCENES[0].fadeInMs || 0) / 3));
  const midAlpha = bootIntroOverlayAlphaRuntime(state);
  assert.ok(midAlpha < startAlpha, "fade alpha should decrease during fade in");
}

function makePalette(offset = 0) {
  return Array.from({ length: 256 }, (_v, i) => [i + offset, i + offset + 1, i + offset + 2] as [number, number, number]);
}

function testPaletteHelpers() {
  assert.equal(bootIntroScenePaletteIndexRuntime(null), 0);
  assert.equal(bootIntroScenePaletteIndexRuntime({ kind: "lounge" }), 1);
  assert.equal(bootIntroScenePaletteIndexRuntime({ kind: "window" }), 2);
  assert.equal(bootIntroScenePaletteIndexRuntime({ kind: "stones" }), 3);
  assert.equal(bootIntroScenePaletteIndexRuntime({ kind: "other" }), 0);

  assert.equal(bootIntroStonesPaletteShiftRuntime({ kind: "lounge" }, 1000), 0);
  assert.equal(bootIntroStonesPaletteShiftRuntime({ kind: "stones" }, 0), 0);
  assert.equal(bootIntroStonesPaletteShiftRuntime({ kind: "stones" }, 250), 2);
  assert.equal(bootIntroStonesPaletteShiftRuntime({ kind: "stones" }, 16 * 125), 0);

  assert.equal(bootIntroPaletteCacheKeyRuntime({ kind: "window", id: "window_lightning" }, 0), "p2:storm");
  assert.equal(bootIntroPaletteCacheKeyRuntime({ kind: "stones", id: "stones_enter" }, 250), "p3:enter:r2");
  assert.equal(bootIntroPaletteCacheKeyRuntime({ kind: "stones", id: "stones_gate" }, 125), "p3:r1");
  assert.equal(bootIntroPaletteCacheKeyRuntime({ kind: "splash" }, 0), "p0");

  const base = makePalette(0);
  const intro = [makePalette(10), makePalette(20), makePalette(30), makePalette(40)];
  const storm = activeBootIntroPaletteRuntime({
    basePalette: base,
    fallbackPalette: null,
    introPalettes: intro,
    scene: { kind: "window", id: "window_lightning" },
    sceneElapsedMs: 0
  });
  assert.deepEqual(storm?.[0x58], [0x40, 0x94, 0xfc], "storm scene should tint hot blues");
  assert.deepEqual(storm?.[0], [30, 31, 32], "window scene should use intro palette index 2");
  assert.notEqual(storm, intro[2], "active palette should clone source");

  const stones = activeBootIntroPaletteRuntime({
    basePalette: base,
    fallbackPalette: null,
    introPalettes: intro,
    scene: { kind: "stones", id: "stones_enter" },
    sceneElapsedMs: 125
  });
  assert.deepEqual(stones?.[0x19], [0, 0, 0], "stones_enter should mask palette slot 0x19");
  assert.deepEqual(stones?.[0x90], intro[3][0x9f], "stones palette should rotate the animated range");

  const fallback = activeBootIntroPaletteRuntime({
    basePalette: null,
    fallbackPalette: base,
    introPalettes: [],
    scene: { kind: "splash" },
    sceneElapsedMs: 0
  });
  assert.deepEqual(fallback?.[0], [0, 1, 2]);
  assert.equal(activeBootIntroPaletteRuntime({
    basePalette: [],
    fallbackPalette: null,
    introPalettes: [],
    scene: null,
    sceneElapsedMs: 0
  }), null);
}

function testZeroFadeSceneHasNoOverlay() {
  const state = createBootIntroRuntimeState();
  startBootIntroRuntime(state);
  advancePastScene(state);
  advancePastScene(state);
  assert.equal(currentBootIntroSceneRuntime(state)?.id, "lounge_opening", "lounge opening should be active");
  assert.equal(bootIntroOverlayAlphaRuntime(state), 0, "ordinary live intro scenes should not get a default fade overlay");
}

function testTvMachine() {
  const randCtx = { seed: 0x6d2b79f5 };
  const firstRand = bootIntroTvRandRuntime(randCtx, 1, 4);
  assert.ok(firstRand >= 1 && firstRand <= 4, "TV rand should stay inside inclusive bounds");

  const machine = createBootIntroTvMachineRuntime();
  assert.equal(machine.program, 2, "TV starts on canonical program");
  bootIntroTvAddSpriteRuntime(machine, 5);
  assert.deepEqual(machine.sprites[0], { frame: 0x15, xOff: 0x1f, yOff: 0x02 });

  const firstState = bootIntroTvStateAtRuntime(0);
  assert.equal(firstState.staticVisible, true, "initial TV frame should include static");
  assert.equal(firstState.fingerVisible, true, "initial TV frame should include finger overlay");

  const laterState = bootIntroTvStateAtRuntime(12);
  assert.ok(laterState.program >= 0, "TV state should remain valid after stepping");
  assert.ok(laterState.sprites.length <= 5, "TV sprite list is capped");
}

function testWouFontHelpers() {
  const decoded = new Uint8Array(0x304);
  decoded[0] = 8;
  decoded[2] = 0x7f;
  decoded[0x04 + 65] = 5;
  const font = decodeBootIntroWouFontRuntime(new Uint8Array([1, 2, 3]), () => decoded);
  assert.ok(font, "valid WOU font should decode");
  assert.equal(font?.height, 8);
  assert.equal(font?.pixelChar, 0x7f);
  assert.equal(bootIntroWouCharWidthRuntime(font, 65), 5);
  assert.equal(measureBootIntroTextWidthRuntime(font, "AA", () => 99), 10);
  assert.equal(measureBootIntroTextWidthRuntime(null, "AA", (text) => String(text).length * 8), 16);
  assert.equal(decodeBootIntroWouFontRuntime(new Uint8Array([1]), () => null), null);
  assert.equal(decodeBootIntroWouFontRuntime(new Uint8Array([1]), () => new Uint8Array(8)), null);
  const invalidHeight = new Uint8Array(0x304);
  invalidHeight[0] = 40;
  assert.equal(decodeBootIntroWouFontRuntime(new Uint8Array([1]), () => invalidHeight), null);
}

function testTextDrawingHelpers() {
  const bytes = new Uint8Array(0x340);
  bytes[0x04 + 65] = 2;
  bytes[0x104 + 65] = 0x20;
  bytes[0x204 + 65] = 0;
  bytes[0x20] = 0x7f;
  bytes[0x21] = 0;
  bytes[0x22] = 0;
  bytes[0x23] = 0x7f;
  const font = { bytes, height: 2, pixelChar: 0x7f };
  const g = makeFakeTextCanvas();
  assert.equal(drawBootIntroWouTextRuntime(g, {
    color: "#abc",
    drawFallbackText: () => assert.fail("fallback draw should not be used with a valid font"),
    fallbackMeasure: () => 99,
    font,
    scale: 2,
    sx: 10,
    sy: 20,
    text: "A"
  }), 14);
  assert.deepEqual(g.rects, [
    { color: "#abc", x: 10, y: 20, w: 2, h: 2 },
    { color: "#abc", x: 12, y: 22, w: 2, h: 2 }
  ]);

  const fallback = makeFakeTextCanvas();
  let fallbackArgs: unknown[] | null = null;
  assert.equal(drawBootIntroWouTextRuntime(fallback, {
    color: "#def",
    drawFallbackText: (_g, text, sx, sy, scale, color) => {
      fallbackArgs = [text, sx, sy, scale, color];
    },
    fallbackMeasure: (text) => String(text).length * 3,
    font: null,
    scale: 2,
    sx: 5,
    sy: 6,
    text: "AB"
  }), 17);
  assert.deepEqual(fallbackArgs, ["AB", 5, 6, 2, "#def"]);

  const drawn: Array<{ text: string; x: number; y: number }> = [];
  assert.deepEqual(bootIntroPrintTextRuntime(makeFakeTextCanvas(), {
    color: "#fff",
    drawTextRun: (_ctx, text, x, y) => {
      drawn.push({ text, x, y });
      return x + text.length;
    },
    measureText: (text) => text.length,
    scale: 1,
    spaceWidth: 1,
    startX: 0,
    text: "aa bb c",
    width: 5,
    x: 0,
    y: 0
  }), { x: 4, y: 8 });
  assert.deepEqual(drawn, [
    { text: "aa", x: 0, y: 0 },
    { text: "bb", x: 0, y: 8 },
    { text: "c", x: 3, y: 8 }
  ]);

  const cardCanvas = makeFakeTextCanvas();
  bootIntroPrintTextOnCardRuntime(cardCanvas, {
    cardX: 3,
    cardY: 4,
    color: "#fff",
    drawTextRun: (ctx, _text, x, y) => {
      ctx.fillRect(x, y, 1, 1);
      return x + 1;
    },
    measureText: () => 1,
    scale: 2,
    spaceWidth: 1,
    startX: 0,
    text: "x",
    width: 10,
    x: 1,
    y: 2
  });
  assert.deepEqual(cardCanvas.rects, [
    { color: "", x: 7, y: 10, w: 1, h: 1 }
  ]);
}

function testTvStaticAndClockPlanning() {
  assert.deepEqual(bootIntroTvStaticCellsRuntime(0x12345678, 3, 2), [
    { colorIndex: 0x3e, px: 0, py: 0 },
    { colorIndex: 0x00, px: 1, py: 0 },
    { colorIndex: 0x3e, px: 2, py: 0 },
    { colorIndex: 0x3e, px: 0, py: 1 },
    { colorIndex: 0x3e, px: 1, py: 1 },
    { colorIndex: 0x00, px: 2, py: 1 }
  ]);
  assert.deepEqual(bootIntroTvStaticCellsRuntime(1, 0, 4), []);

  const morning = new Date("2026-06-14T09:05:00");
  assert.deepEqual(bootIntroClockFramesRuntime(morning), [12, 11, 2, 7]);

  const evening = new Date("2026-06-14T23:59:00");
  assert.deepEqual(bootIntroClockFramesRuntime(evening), [3, 3, 7, 11]);
  assert.deepEqual(bootIntroClockSpritesRuntime(evening, 4), [
    { frame: 3, x: 0xd9, y: 0x14 },
    { frame: 3, x: 0xdd, y: 0x14 },
    { frame: 7, x: 0xe3, y: 0x14 },
    { frame: 11, x: 0xe7, y: 0x14 }
  ]);
}

function testWindowHelpers() {
  const randCtx = { seed: 0x51f15eED };
  const rand = bootIntroWindowRandRuntime(randCtx, -5, 5);
  assert.ok(rand >= -5 && rand <= 5, "window rand should stay inside inclusive bounds");

  assert.equal(bootIntroWindowSceneBaseRuntime("window_lightning"), 80);
  assert.equal(bootIntroWindowSceneBaseRuntime("window_strike"), 160);
  assert.equal(bootIntroWindowSceneBaseRuntime("window_pan"), 240);
  assert.equal(bootIntroWindowSceneBaseRuntime("window_door_open"), 405);
  assert.equal(bootIntroWindowSceneBaseRuntime("window_run"), 475);
  assert.equal(bootIntroWindowSceneBaseRuntime("unknown"), 20);

  const initial = bootIntroWindowStateAtRuntime({ id: "window_storm" }, 0, false);
  assert.equal(initial.clouds.length, 5, "window scene should preserve cloud list");
  assert.equal(initial.clouds[0].x, -214, "first update should move clouds");
  assert.ok(initial.rain.length <= 100, "rain list should stay capped");

  const forced = bootIntroWindowStateAtRuntime({ id: "window_storm" }, 0, true);
  assert.equal(forced.windowFrame, 27, "force strike should open lit window frame");
  assert.ok(forced.flash >= 0, "force strike should maintain flash counter");

  const late = bootIntroWindowStateAtRuntime({ id: "window_storm" }, 1300, false);
  assert.ok(late.rain.length <= 100, "clamped late state should keep rain capped");
  assert.ok(late.clouds.every((cloud) => Number.isFinite(cloud.x) && Number.isFinite(cloud.y)));
}

function testTextWrapHelpers() {
  assert.deepEqual(wrapBootIntroTextRuntime("  one   two three  ", 7), ["one two", "three"]);
  assert.deepEqual(wrapBootIntroTextRuntime("", 7), []);
  assert.deepEqual(
    wrapBootIntroTextPixelsRuntime("one two three", 24, (text) => text.length * 4),
    ["one", "two", "three"]
  );
  assert.deepEqual(
    wrapBootIntroTextPixelsRuntime("one two", 0, (text) => text.length * 4),
    ["one", "two"]
  );
  assert.deepEqual(wrapBootIntroTextPixelsRuntime("   ", 24, () => 4), []);
}

testStartAndAdvance();
testInputAdvance();
testAbort();
testOverlayAlpha();
testPaletteHelpers();
testZeroFadeSceneHasNoOverlay();
testTvMachine();
testWouFontHelpers();
testTextDrawingHelpers();
testTvStaticAndClockPlanning();
testWindowHelpers();
testTextWrapHelpers();

console.log("ui_boot_intro_runtime_test: ok");

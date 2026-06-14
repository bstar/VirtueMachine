import assert from "node:assert/strict";
import {
  BOOT_INTRO_SCENES,
  abortBootIntroRuntime,
  advanceBootIntroInputRuntime,
  advanceBootIntroRuntime,
  bootIntroTvAddSpriteRuntime,
  bootIntroTvRandRuntime,
  bootIntroTvStateAtRuntime,
  bootIntroWouCharWidthRuntime,
  createBootIntroTvMachineRuntime,
  decodeBootIntroWouFontRuntime,
  measureBootIntroTextWidthRuntime,
  bootIntroOverlayAlphaRuntime,
  createBootIntroRuntimeState,
  currentBootIntroSceneRuntime,
  startBootIntroRuntime
} from "../ui/boot_intro_runtime.ts";

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

testStartAndAdvance();
testInputAdvance();
testAbort();
testOverlayAlpha();
testZeroFadeSceneHasNoOverlay();
testTvMachine();
testWouFontHelpers();

console.log("ui_boot_intro_runtime_test: ok");

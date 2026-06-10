import assert from "node:assert/strict";
import {
  BOOT_INTRO_SCENES,
  abortBootIntroRuntime,
  advanceBootIntroInputRuntime,
  advanceBootIntroRuntime,
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

testStartAndAdvance();
testInputAdvance();
testAbort();
testOverlayAlpha();
testZeroFadeSceneHasNoOverlay();

console.log("ui_boot_intro_runtime_test: ok");

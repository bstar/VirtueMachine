import assert from "node:assert/strict";
import {
  audioMuteButtonModelRuntime,
  audioMuteTogglePlanRuntime,
  audioSoundTogglePlanRuntime,
  audioWorldFlagPlanRuntime,
  bindAudioMuteButtonRuntime,
  bootIntroMusicAwaitingGestureRuntime,
  bootIntroMusicPhaseRuntime,
  canonicalMusicPhasePlanRuntime,
  renderAudioMuteButtonRuntime,
  startupMenuMusicPhaseRuntime
} from "../audio/audio_ui_runtime.ts";

type AudioUiTestListener = {
  current?: () => void;
};

assert.deepEqual(audioMuteButtonModelRuntime(false), {
  ariaPressed: "false",
  isActive: false,
  text: "Mute Audio"
});
assert.deepEqual(audioMuteButtonModelRuntime(true), {
  ariaPressed: "true",
  isActive: true,
  text: "Unmute Audio"
});
function fakeButton(): HTMLButtonElement & {
  attrs: Record<string, string>;
  classes: Set<string>;
} {
  const attrs: Record<string, string> = {};
  const classes = new Set<string>();
  const button = {
    attrs,
    classes,
    textContent: "",
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    classList: {
      toggle(name: string, force?: boolean) {
        if (force) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
      }
    }
  };
  return button as unknown as HTMLButtonElement & { attrs: Record<string, string>; classes: Set<string> };
}
{
  const button = fakeButton();
  renderAudioMuteButtonRuntime(button, false);
  assert.equal(button.textContent, "Mute Audio");
  assert.equal(button.attrs["aria-pressed"], "false");
  assert.equal(button.classes.has("is-active"), false);
  renderAudioMuteButtonRuntime(button, true);
  assert.equal(button.textContent, "Unmute Audio");
  assert.equal(button.attrs["aria-pressed"], "true");
  assert.equal(button.classes.has("is-active"), true);
  renderAudioMuteButtonRuntime(null, true);
}

assert.deepEqual(audioMuteTogglePlanRuntime({ muted: false }), {
  diagClass: "diag ok",
  nextMuted: true,
  shouldPrime: false,
  diagText: "Audio muted."
});
assert.deepEqual(audioMuteTogglePlanRuntime({ muted: true, reason: "Ready." }), {
  diagClass: "diag ok",
  nextMuted: false,
  shouldPrime: true,
  diagText: "Ready."
});
{
  const listener: AudioUiTestListener = {};
  let toggles = 0;
  const button = {
    addEventListener(type: "click", nextListener: () => void) {
      assert.equal(type, "click");
      listener.current = nextListener;
    }
  };
  assert.equal(bindAudioMuteButtonRuntime({
    button,
    toggle: () => {
      toggles += 1;
    }
  }), true);
  assert(listener.current, "mute button listener should be bound");
  listener.current();
  listener.current();
  assert.equal(toggles, 2);
  assert.equal(bindAudioMuteButtonRuntime({
    button: null,
    toggle: () => {
      throw new Error("unexpected");
    }
  }), false);
}
assert.deepEqual(audioSoundTogglePlanRuntime(0), {
  diagClass: "diag ok",
  diagText: "Sound enabled.",
  nextSoundEnabled: 1,
  shouldPrime: true
});
assert.deepEqual(audioSoundTogglePlanRuntime(1), {
  diagClass: "diag ok",
  diagText: "Sound disabled.",
  nextSoundEnabled: 0,
  shouldPrime: false
});

assert.equal(canonicalMusicPhasePlanRuntime({
  currentPhase: "",
  currentSong: "",
  phase: "boot_origin",
  songId: "bootup.m",
  soundEnabled: false
}), null);
assert.equal(canonicalMusicPhasePlanRuntime({
  currentPhase: "",
  currentSong: "",
  phase: "boot_origin",
  songId: "",
  soundEnabled: true
}), null);
assert.deepEqual(canonicalMusicPhasePlanRuntime({
  currentPhase: "boot_origin",
  currentSong: "bootup.m",
  phase: "boot_origin",
  songId: "bootup.m",
  soundEnabled: true
}), {
  phase: "boot_origin",
  songId: "bootup.m",
  alreadyPlaying: true,
  shouldPlay: false
});
assert.deepEqual(canonicalMusicPhasePlanRuntime({
  currentPhase: "boot_origin",
  currentSong: "bootup.m",
  phase: "boot_intro",
  songId: "stones.m",
  soundEnabled: true
}), {
  phase: "boot_intro",
  songId: "stones.m",
  alreadyPlaying: false,
  shouldPlay: true
});

assert.deepEqual(bootIntroMusicPhaseRuntime({ kind: "splash" }), {
  phase: "boot_origin",
  songId: "bootup.m"
});
assert.deepEqual(bootIntroMusicPhaseRuntime({ kind: "stones" }), {
  phase: "boot_intro",
  songId: "stones.m"
});
assert.equal(bootIntroMusicPhaseRuntime(null), null);
assert.deepEqual(startupMenuMusicPhaseRuntime(), {
  phase: "startup_menu",
  songId: "ultima.m"
});
assert.equal(bootIntroMusicAwaitingGestureRuntime({
  bootIntroActive: true,
  musicAwaitingGesture: true
}), true);
assert.equal(bootIntroMusicAwaitingGestureRuntime({
  bootIntroActive: false,
  musicAwaitingGesture: true
}), false);

assert.deepEqual(audioWorldFlagPlanRuntime({
  bootIntroActive: true,
  sessionStarted: false,
  soundEnabled: false
}), {
  enabled: false,
  clearMusicPhase: true,
  startBootIntroMusic: false,
  startStartupMenuMusic: false
});
assert.deepEqual(audioWorldFlagPlanRuntime({
  bootIntroActive: true,
  sessionStarted: false,
  soundEnabled: true
}), {
  enabled: true,
  clearMusicPhase: false,
  startBootIntroMusic: true,
  startStartupMenuMusic: false
});
assert.deepEqual(audioWorldFlagPlanRuntime({
  bootIntroActive: false,
  sessionStarted: false,
  soundEnabled: true
}), {
  enabled: true,
  clearMusicPhase: false,
  startBootIntroMusic: false,
  startStartupMenuMusic: true
});
assert.deepEqual(audioWorldFlagPlanRuntime({
  bootIntroActive: false,
  sessionStarted: true,
  soundEnabled: true
}), {
  enabled: true,
  clearMusicPhase: false,
  startBootIntroMusic: false,
  startStartupMenuMusic: false
});

console.log("audio_ui_runtime_test: ok");

export type AudioMuteButtonModelRuntime = {
  ariaPressed: "true" | "false";
  isActive: boolean;
  text: string;
};

export type AudioMuteTogglePlanRuntime = {
  diagClass: "diag ok";
  diagText: string;
  nextMuted: boolean;
  shouldPrime: boolean;
};

export type CanonicalMusicPhaseRuntime = {
  phase: string;
  songId: string;
};

export type CanonicalMusicPhasePlanRuntime = CanonicalMusicPhaseRuntime & {
  alreadyPlaying: boolean;
  shouldPlay: boolean;
};

export type BootIntroMusicSceneRuntime = {
  kind?: unknown;
};

export type AudioWorldFlagPlanRuntime = {
  clearMusicPhase: boolean;
  enabled: boolean;
  startBootIntroMusic: boolean;
  startStartupMenuMusic: boolean;
};

export type AudioSoundTogglePlanRuntime = {
  diagClass: "diag ok";
  diagText: string;
  nextSoundEnabled: 0 | 1;
  shouldPrime: boolean;
};

export function audioMuteButtonModelRuntime(muted: unknown): AudioMuteButtonModelRuntime {
  const isActive = !!muted;
  return {
    ariaPressed: isActive ? "true" : "false",
    isActive,
    text: isActive ? "Unmute Audio" : "Mute Audio"
  };
}

export function renderAudioMuteButtonRuntime(
  button: HTMLButtonElement | null | undefined,
  muted: unknown
): void {
  if (!button) {
    return;
  }
  const model = audioMuteButtonModelRuntime(muted);
  button.textContent = model.text;
  button.setAttribute("aria-pressed", model.ariaPressed);
  button.classList.toggle("is-active", model.isActive);
}

export function audioMuteTogglePlanRuntime(args: {
  muted: unknown;
  reason?: unknown;
}): AudioMuteTogglePlanRuntime {
  const nextMuted = !args.muted;
  const reason = String(args.reason || "");
  return {
    diagClass: "diag ok",
    nextMuted,
    shouldPrime: !nextMuted,
    diagText: reason || (nextMuted ? "Audio muted." : "Audio unmuted.")
  };
}

export function bindAudioMuteButtonRuntime(args: {
  button?: { addEventListener: (type: "click", listener: () => void) => void } | null;
  toggle: () => void;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    args.toggle();
  });
  return true;
}

export function canonicalMusicPhasePlanRuntime(args: {
  currentPhase: unknown;
  currentSong: unknown;
  phase: unknown;
  songId: unknown;
  soundEnabled: unknown;
}): CanonicalMusicPhasePlanRuntime | null {
  if (!args.soundEnabled) {
    return null;
  }
  const phase = String(args.phase || "");
  const songId = String(args.songId || "");
  if (!songId) {
    return null;
  }
  const alreadyPlaying = String(args.currentPhase || "") === phase && String(args.currentSong || "") === songId;
  return {
    phase,
    songId,
    alreadyPlaying,
    shouldPlay: !alreadyPlaying
  };
}

export function bootIntroMusicPhaseRuntime(
  scene: BootIntroMusicSceneRuntime | null | undefined
): CanonicalMusicPhaseRuntime | null {
  if (!scene) {
    return null;
  }
  if (scene.kind === "splash") {
    return { phase: "boot_origin", songId: "bootup.m" };
  }
  return { phase: "boot_intro", songId: "stones.m" };
}

export function startupMenuMusicPhaseRuntime(): CanonicalMusicPhaseRuntime {
  return { phase: "startup_menu", songId: "ultima.m" };
}

export function bootIntroMusicAwaitingGestureRuntime(args: {
  bootIntroActive: unknown;
  musicAwaitingGesture: unknown;
}): boolean {
  return !!(args.bootIntroActive && args.musicAwaitingGesture);
}

export function audioWorldFlagPlanRuntime(args: {
  bootIntroActive: unknown;
  sessionStarted: unknown;
  soundEnabled: unknown;
}): AudioWorldFlagPlanRuntime {
  const enabled = !!args.soundEnabled;
  const shouldStartIntroMusic = enabled && !args.sessionStarted;
  return {
    enabled,
    clearMusicPhase: !enabled,
    startBootIntroMusic: shouldStartIntroMusic && !!args.bootIntroActive,
    startStartupMenuMusic: shouldStartIntroMusic && !args.bootIntroActive
  };
}

export function audioSoundTogglePlanRuntime(currentSoundEnabled: unknown): AudioSoundTogglePlanRuntime {
  const nextSoundEnabled = currentSoundEnabled ? 0 : 1;
  return {
    diagClass: "diag ok",
    diagText: nextSoundEnabled ? "Sound enabled." : "Sound disabled.",
    nextSoundEnabled,
    shouldPrime: !!nextSoundEnabled
  };
}

import { buildPcSpeakerAmbientSfxRuntime, buildPcSpeakerSfxRuntime, type PcSpeakerAmbientOptions, type PcSpeakerSample } from "./pc_speaker_sfx_runtime.ts";
import { U6_SFX } from "./sfx_ids_runtime.ts";

export type AudioBackendMode = "off" | "pcspeaker" | "adlib";

export type U6AudioRuntime = {
  setEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  setMusicEnabled(enabled: boolean): void;
  setBackendMode(mode: AudioBackendMode): void;
  setVolume(volume: number): void;
  primeFromUserGesture(): Promise<boolean>;
  playSfx(sfxId: number, options?: { volume?: number }): boolean;
  playAmbientSfx(sfxId: number, options?: PcSpeakerAmbientOptions & { volume?: number }): boolean;
  playMusic(songId: string): boolean;
  stopMusic(): void;
  status(): { enabled: boolean; sfxEnabled: boolean; musicEnabled: boolean; backendMode: AudioBackendMode; ready: boolean; lastError: string };
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
}

export function createU6AudioRuntime(): U6AudioRuntime {
  let audioContext: AudioContext | null = null;
  let enabled = true;
  let sfxEnabled = true;
  let musicEnabled = false;
  let backendMode: AudioBackendMode = "pcspeaker";
  let volume = 0.8;
  let lastError = "";
  const cache = new Map<number, AudioBuffer>();

  function fail(err: unknown): false {
    lastError = String((err as any)?.message || err || "audio error");
    enabled = false;
    return false;
  }

  function getContext(): AudioContext | null {
    if (!enabled) return null;
    try {
      if (!audioContext) {
        const Ctor = globalThis.AudioContext || (globalThis as any).webkitAudioContext;
        if (!Ctor) throw new Error("Web Audio API unavailable");
        audioContext = new Ctor();
      }
      return audioContext;
    } catch (err) {
      fail(err);
      return null;
    }
  }

  function bufferForSfx(ctx: AudioContext, sfxId: number): AudioBuffer | null {
    const cached = cache.get(sfxId | 0);
    if (cached) return cached;
    const sample = buildPcSpeakerSfxRuntime(sfxId);
    if (!sample) return null;
    const buffer = ctx.createBuffer(1, sample.channelData.length, sample.sampleRate);
    buffer.copyToChannel(new Float32Array(sample.channelData), 0);
    cache.set(sfxId | 0, buffer);
    return buffer;
  }

  function playSample(ctx: AudioContext, sample: PcSpeakerSample, sampleVolume: number): boolean {
    const buffer = ctx.createBuffer(1, sample.channelData.length, sample.sampleRate);
    buffer.copyToChannel(new Float32Array(sample.channelData), 0);
    const gain = ctx.createGain();
    gain.gain.value = clamp01(sampleVolume * volume);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return true;
  }

  return {
    setEnabled(next) {
      enabled = !!next;
      if (!enabled && audioContext) {
        try { void audioContext.suspend(); } catch {}
      }
    },
    setSfxEnabled(next) {
      sfxEnabled = !!next;
    },
    setMusicEnabled(next) {
      musicEnabled = !!next;
    },
    setBackendMode(next) {
      backendMode = next === "adlib" || next === "off" ? next : "pcspeaker";
    },
    setVolume(next) {
      volume = clamp01(next);
    },
    async primeFromUserGesture() {
      const ctx = getContext();
      if (!ctx) return false;
      try {
        if (ctx.state === "suspended") await ctx.resume();
        return true;
      } catch (err) {
        return fail(err);
      }
    },
    playSfx(sfxId, options = {}) {
      if (!enabled || !sfxEnabled || backendMode === "off") return false;
      if (backendMode === "adlib" && sfxId !== U6_SFX.EXPLOSION && sfxId !== U6_SFX.SE_TICK) {
        // Nuvie's U6-native SFX coverage is PC speaker-first; keep fallback audible.
      }
      const ctx = getContext();
      if (!ctx) return false;
      try {
        const buffer = bufferForSfx(ctx, sfxId | 0);
        if (!buffer) return false;
        const gain = ctx.createGain();
        gain.gain.value = clamp01((options.volume ?? 1) * volume);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        return true;
      } catch (err) {
        return fail(err);
      }
    },
    playAmbientSfx(sfxId, options = {}) {
      if (!enabled || !sfxEnabled || backendMode === "off") return false;
      const ctx = getContext();
      if (!ctx) return false;
      try {
        const sample = buildPcSpeakerAmbientSfxRuntime(sfxId | 0, options);
        if (!sample) return false;
        return playSample(ctx, sample, options.volume ?? 1);
      } catch (err) {
        return fail(err);
      }
    },
    playMusic(_songId) {
      if (!enabled || !musicEnabled || backendMode !== "adlib") return false;
      lastError = "AdLib music backend is documented but not yet ported";
      return false;
    },
    stopMusic() {
      // No-op until the contained AdLib music port lands.
    },
    status() {
      return {
        enabled,
        sfxEnabled,
        musicEnabled,
        backendMode,
        ready: !!audioContext && audioContext.state !== "closed",
        lastError
      };
    }
  };
}

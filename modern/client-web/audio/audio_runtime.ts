import { U6AdlibMusicRuntime, type U6AdlibSongSource } from "./adlib_music_runtime.ts";
import { buildPcSpeakerAmbientSfxRuntime, buildPcSpeakerSfxRuntime, type PcSpeakerAmbientOptions, type PcSpeakerSample } from "./pc_speaker_sfx_runtime.ts";
import { U6_SFX } from "./sfx_ids_runtime.ts";

export type AudioBackendMode = "off" | "pcspeaker" | "adlib";

type RenderedSongMetadata = {
  readonly loopStartSeconds: number;
  readonly loopEndSeconds: number;
  readonly sampleRate?: number;
  readonly tickHz?: number;
};

export type U6AudioRuntime = {
  setEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  setMusicEnabled(enabled: boolean): void;
  setBackendMode(mode: AudioBackendMode): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  primeFromUserGesture(): Promise<boolean>;
  playSfx(sfxId: number, options?: { volume?: number }): boolean;
  playAmbientSfx(sfxId: number, options?: PcSpeakerAmbientOptions & { volume?: number }): boolean;
  playMusic(songId: string): boolean;
  stopMusic(): void;
  status(): { enabled: boolean; sfxEnabled: boolean; musicEnabled: boolean; backendMode: AudioBackendMode; muted: boolean; ready: boolean; lastError: string; musicSong: string; musicLoading: boolean; musicPlaying: boolean; musicAwaitingGesture: boolean };
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
  let muted = false;
  let volume = 0.8;
  let lastError = "";
  const cache = new Map<number, AudioBuffer>();
  let adlibMusic: U6AdlibMusicRuntime | null = null;
  let renderedMusicSource: AudioBufferSourceNode | null = null;
  let renderedMusicGain: GainNode | null = null;
  let renderedMusicElement: HTMLAudioElement | null = null;
  let renderedMusicSong = "";
  let renderedMusicLoading = false;
  let renderedMusicPlaying = false;
  let renderedMusicAwaitingGesture = false;
  let renderedMusicMutedUntilGesture = false;
  let renderedMusicIntendedStartMs = 0;
  let musicRequestSerial = 0;

  function fail(err: unknown): false {
    lastError = String((err as any)?.message || err || "audio error");
    enabled = false;
    return false;
  }

  function effectiveVolume(): number {
    return muted ? 0 : clamp01(volume);
  }

  function applyMuteState() {
    const outVolume = effectiveVolume();
    adlibMusic?.setVolume(outVolume);
    if (renderedMusicElement) {
      renderedMusicElement.muted = muted || renderedMusicAwaitingGesture;
      renderedMusicElement.volume = outVolume;
    }
    if (renderedMusicGain) {
      renderedMusicGain.gain.value = outVolume;
    }
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

  const songSource: U6AdlibSongSource = async (songId) => {
    const file = String(songId || "").replace(/^\/+/, "");
    const candidates = [
      `../assets/runtime/${file}`,
      `./assets/runtime/${file}`,
      `assets/runtime/${file}`,
      `../../assets/runtime/${file}`,
      `/assets/runtime/${file}`,
      `/modern/assets/runtime/${file}`,
      `/modern/client-web/assets/runtime/${file}`
    ];
    for (const path of candidates) {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) return new Uint8Array(buf);
      } catch {}
    }
    return null;
  };

  function renderedSongCandidates(songId: string): string[] {
    const file = String(songId || "").replace(/^\/+/, "");
    return [
      `../assets/runtime/audio/adlib/${file}.wav`,
      `./assets/runtime/audio/adlib/${file}.wav`,
      `assets/runtime/audio/adlib/${file}.wav`,
      `../../assets/runtime/audio/adlib/${file}.wav`,
      `/assets/runtime/audio/adlib/${file}.wav`,
      `/modern/assets/runtime/audio/adlib/${file}.wav`,
      `/modern/client-web/assets/runtime/audio/adlib/${file}.wav`
    ];
  }

  function renderedSongMetadataCandidates(songId: string): string[] {
    return renderedSongCandidates(songId).map((candidate) => candidate.replace(/\.wav$/, ".json"));
  }

  async function fetchRenderedSongMetadata(songId: string): Promise<RenderedSongMetadata | null> {
    for (const path of renderedSongMetadataCandidates(songId)) {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) continue;
        const raw = await res.json();
        const loopStartSeconds = Number(raw?.loopStartSeconds);
        const loopEndSeconds = Number(raw?.loopEndSeconds);
        if (
          Number.isFinite(loopStartSeconds)
          && Number.isFinite(loopEndSeconds)
          && loopStartSeconds >= 0
          && loopEndSeconds > loopStartSeconds
        ) {
          return {
            loopStartSeconds,
            loopEndSeconds,
            sampleRate: Number(raw?.sampleRate) || undefined,
            tickHz: Number(raw?.tickHz) || undefined
          };
        }
      } catch {}
    }
    return null;
  }

  function isAutoplayBlocked(err: unknown): boolean {
    const name = String((err as any)?.name || "");
    const message = String((err as any)?.message || err || "");
    return name === "NotAllowedError" || /user gesture|interact|autoplay|not allowed/i.test(message);
  }

  function nowMs(): number {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  }

  function renderedMusicOffsetSeconds(duration = 0, metadata: RenderedSongMetadata | null = null): number {
    if (!renderedMusicIntendedStartMs) return 0;
    const elapsed = Math.max(0, (nowMs() - renderedMusicIntendedStartMs) / 1000);
    if (metadata && Number.isFinite(metadata.loopEndSeconds) && Number.isFinite(metadata.loopStartSeconds)) {
      const loopStart = Math.max(0, Math.min(duration || metadata.loopEndSeconds, metadata.loopStartSeconds));
      const loopEnd = Math.max(loopStart + 0.001, Math.min(duration || metadata.loopEndSeconds, metadata.loopEndSeconds));
      if (elapsed >= loopEnd) {
        return loopStart + ((elapsed - loopStart) % Math.max(0.001, loopEnd - loopStart));
      }
      return Math.min(elapsed, Math.max(0, loopEnd - 0.001));
    }
    return duration > 0 && Number.isFinite(duration) ? elapsed % duration : elapsed;
  }

  function seekRenderedElementToIntendedTime(audio: HTMLAudioElement) {
    try {
      const offset = renderedMusicOffsetSeconds(audio.duration || 0);
      if (offset > 0 && Number.isFinite(offset)) audio.currentTime = offset;
    } catch {}
  }

  async function playRenderedSongElement(songId: string, serial: number) {
    const candidates = renderedSongCandidates(songId);
    try {
      for (const path of candidates) {
        if (serial !== musicRequestSerial) return false;
        const audio = new Audio();
        audio.preload = "auto";
        audio.loop = true;
        audio.muted = muted;
        audio.volume = effectiveVolume();
        audio.src = path;
        renderedMusicElement = audio;
        renderedMusicSong = songId;
        try {
          seekRenderedElementToIntendedTime(audio);
          await audio.play();
          if (serial !== musicRequestSerial) {
            try { audio.pause(); } catch {}
            return false;
          }
          renderedMusicPlaying = true;
          renderedMusicAwaitingGesture = false;
          renderedMusicLoading = false;
          return true;
        } catch (err) {
          if (serial !== musicRequestSerial) return false;
          if (isAutoplayBlocked(err)) {
            try {
              audio.muted = true;
              seekRenderedElementToIntendedTime(audio);
              await audio.play();
              if (serial !== musicRequestSerial) {
                try { audio.pause(); } catch {}
                return false;
              }
              renderedMusicMutedUntilGesture = true;
              renderedMusicPlaying = true;
            } catch {
              renderedMusicMutedUntilGesture = false;
              renderedMusicPlaying = false;
            }
            renderedMusicAwaitingGesture = true;
            renderedMusicLoading = false;
            return true;
          }
          renderedMusicElement = null;
        }
      }
      return false;
    } finally {
      if (serial === musicRequestSerial) renderedMusicLoading = false;
    }
  }

  async function fetchRenderedSong(ctx: AudioContext, songId: string, serial: number, metadata: RenderedSongMetadata | null) {
    const candidates = renderedSongCandidates(songId);
    try {
      for (const path of candidates) {
        try {
          const res = await fetch(path, { cache: "no-store" });
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
          if (serial !== musicRequestSerial) return false;
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = effectiveVolume();
          source.buffer = audioBuffer;
          source.loop = true;
          if (metadata) {
            source.loopStart = Math.max(0, Math.min(audioBuffer.duration, metadata.loopStartSeconds));
            source.loopEnd = Math.max(source.loopStart + 0.001, Math.min(audioBuffer.duration, metadata.loopEndSeconds));
          }
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0, renderedMusicOffsetSeconds(audioBuffer.duration, metadata));
          renderedMusicSource = source;
          renderedMusicGain = gain;
          renderedMusicPlaying = true;
          renderedMusicAwaitingGesture = ctx.state === "suspended";
          renderedMusicLoading = false;
          renderedMusicSong = songId;
          return true;
        } catch {}
      }
      return false;
    } finally {
      if (serial === musicRequestSerial) renderedMusicLoading = false;
    }
  }

  function stopRenderedMusic() {
    renderedMusicLoading = false;
    renderedMusicPlaying = false;
    renderedMusicAwaitingGesture = false;
    renderedMusicMutedUntilGesture = false;
    renderedMusicSong = "";
    renderedMusicIntendedStartMs = 0;
    if (renderedMusicElement) {
      try { renderedMusicElement.pause(); } catch {}
      try { renderedMusicElement.removeAttribute("src"); renderedMusicElement.load(); } catch {}
      renderedMusicElement = null;
    }
    if (renderedMusicSource) {
      try { renderedMusicSource.stop(); } catch {}
      try { renderedMusicSource.disconnect(); } catch {}
      renderedMusicSource = null;
    }
    if (renderedMusicGain) {
      try { renderedMusicGain.disconnect(); } catch {}
      renderedMusicGain = null;
    }
  }

  function getAdlibMusic(ctx: AudioContext): U6AdlibMusicRuntime {
    if (!adlibMusic) {
      adlibMusic = new U6AdlibMusicRuntime(ctx, songSource, volume);
    }
    adlibMusic.setVolume(effectiveVolume());
    return adlibMusic;
  }

  function playSample(ctx: AudioContext, sample: PcSpeakerSample, sampleVolume: number): boolean {
    const buffer = ctx.createBuffer(1, sample.channelData.length, sample.sampleRate);
    buffer.copyToChannel(new Float32Array(sample.channelData), 0);
    const gain = ctx.createGain();
    gain.gain.value = clamp01(sampleVolume * effectiveVolume());
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
      if (!enabled) {
        musicRequestSerial += 1;
        if (audioContext) {
          try { void audioContext.suspend(); } catch {}
        }
        try { adlibMusic?.stop(); } catch {}
        stopRenderedMusic();
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
      if (backendMode !== "adlib") {
        try { adlibMusic?.stop(); } catch {}
        stopRenderedMusic();
      }
    },
    setMuted(next) {
      muted = !!next;
      applyMuteState();
    },
    setVolume(next) {
      volume = clamp01(next);
      applyMuteState();
    },
    async primeFromUserGesture() {
      const ctx = getContext();
      if (!ctx) return false;
      try {
        if (ctx.state === "suspended") await ctx.resume();
        if (renderedMusicSource && renderedMusicAwaitingGesture) {
          renderedMusicAwaitingGesture = false;
          renderedMusicPlaying = true;
        }
        if (renderedMusicElement && renderedMusicAwaitingGesture) {
          renderedMusicElement.muted = muted;
          renderedMusicElement.volume = effectiveVolume();
          seekRenderedElementToIntendedTime(renderedMusicElement);
          if (!renderedMusicMutedUntilGesture || renderedMusicElement.paused) {
            await renderedMusicElement.play();
          }
          renderedMusicMutedUntilGesture = false;
          renderedMusicAwaitingGesture = false;
          renderedMusicPlaying = true;
          applyMuteState();
        }
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
        gain.gain.value = clamp01((options.volume ?? 1) * effectiveVolume());
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
    playMusic(songId) {
      if (!enabled || !musicEnabled || backendMode !== "adlib") return false;
        try {
          const serial = ++musicRequestSerial;
          stopRenderedMusic();
          try { adlibMusic?.stop(); } catch {}
          renderedMusicSong = songId;
          renderedMusicLoading = true;
          renderedMusicIntendedStartMs = nowMs();
          void fetchRenderedSongMetadata(songId).then((metadata) => {
            if (serial !== musicRequestSerial) return true;
            if (!metadata) return false;
            const ctx = getContext();
            if (!ctx) return false;
            return fetchRenderedSong(ctx, songId, serial, metadata);
          }).then((bufferOk) => {
            if (bufferOk || serial !== musicRequestSerial) return true;
            return playRenderedSongElement(songId, serial);
          }).then((ok) => {
            if (ok || serial !== musicRequestSerial) return;
            const ctx = getContext();
            if (!ctx) return;
            void fetchRenderedSong(ctx, songId, serial, null).then((bufferOk) => {
              if (bufferOk || serial !== musicRequestSerial) return;
              try {
                getAdlibMusic(ctx).play(songId);
              } catch (err) {
                fail(err);
              }
            });
          }).catch(() => {
            if (serial !== musicRequestSerial) return;
            const ctx = getContext();
            if (!ctx) return;
          try {
            getAdlibMusic(ctx).play(songId);
          } catch (err) {
            fail(err);
          }
          });
        return true;
      } catch (err) {
        return fail(err);
      }
    },
    stopMusic() {
      musicRequestSerial += 1;
      stopRenderedMusic();
      try { adlibMusic?.stop(); } catch {}
    },
    status() {
      const music = adlibMusic?.status();
      return {
        enabled,
        sfxEnabled,
        musicEnabled,
        backendMode,
        muted,
        ready: !!audioContext && audioContext.state !== "closed",
        lastError: lastError || music?.lastError || "",
        musicSong: renderedMusicSong || music?.songId || "",
        musicLoading: renderedMusicLoading || !!music?.loading,
        musicPlaying: renderedMusicPlaying || !!music?.playing,
        musicAwaitingGesture: renderedMusicAwaitingGesture
      };
    }
  };
}

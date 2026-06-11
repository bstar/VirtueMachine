import assert from "node:assert/strict";
import { createU6AudioRuntime } from "../audio/audio_runtime.ts";

let audioElementCount = 0;
let sourceStartCount = 0;
let sourceStopCount = 0;

class MockAudio {
  constructor() {
    audioElementCount += 1;
  }
}

class MockGain {
  gain = { value: 1 };
  connect(): void {}
  disconnect(): void {}
}

class MockSource {
  buffer: any = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  connect(): void {}
  disconnect(): void {}
  start(): void {
    sourceStartCount += 1;
  }
  stop(): void {
    sourceStopCount += 1;
  }
}

class MockAudioContext {
  state = "running";
  destination = {};
  createGain(): MockGain {
    return new MockGain();
  }
  createBufferSource(): MockSource {
    return new MockSource();
  }
  async decodeAudioData(_buf: ArrayBuffer): Promise<{ duration: number }> {
    return { duration: 216 };
  }
  async resume(): Promise<void> {
    this.state = "running";
  }
  async suspend(): Promise<void> {
    this.state = "suspended";
  }
}

(globalThis as any).Audio = MockAudio;
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).fetch = async (input: string) => {
  const path = String(input || "");
  if (path.endsWith(".json")) {
    return {
      ok: true,
      json: async () => ({
        loopStartSeconds: 0,
        loopEndSeconds: 216,
        sampleRate: 44100,
        tickHz: 60
      })
    };
  }
  if (path.endsWith(".wav")) {
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16)
    };
  }
  return { ok: false };
};

async function waitForMusicPlaying(audio: ReturnType<typeof createU6AudioRuntime>): Promise<void> {
  for (let i = 0; i < 20 && !audio.status().musicPlaying; i += 1) {
    await Promise.resolve();
  }
  assert.equal(audio.status().musicPlaying, true, "music should start through WebAudio rendered WAV path");
}

const audio = createU6AudioRuntime();
audio.setBackendMode("adlib");
audio.setMusicEnabled(true);

assert.equal(audio.playMusic("bootup.m"), true, "music request should be accepted");
await waitForMusicPlaying(audio);

assert.equal(sourceStartCount, 1, "successful WebAudio rendered WAV path should start exactly one source");
assert.equal(audioElementCount, 0, "successful WebAudio rendered WAV path must not also create HTMLAudio fallback");

audio.stopMusic();
assert.equal(sourceStopCount, 1, "stopping music should stop the active WebAudio source");

console.log("audio_runtime_music_path_test: ok");

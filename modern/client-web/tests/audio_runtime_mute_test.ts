import assert from "node:assert/strict";
import { createU6AudioRuntime } from "../audio/audio_runtime.ts";

let pendingPlayResolve: (() => void) | null = null;
let pauseCount = 0;
const audioInstances: any[] = [];

class MockAudio {
  preload = "";
  loop = false;
  volume = 1;
  src = "";
  duration = 60;
  currentTime = 0;
  muted = false;
  paused = true;

  constructor() {
    audioInstances.push(this);
  }

  play(): Promise<void> {
    this.paused = false;
    return new Promise((resolve) => {
      pendingPlayResolve = resolve;
    });
  }

  pause(): void {
    pauseCount += 1;
    this.paused = true;
  }

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  load(): void {}
}

(globalThis as any).Audio = MockAudio;
(globalThis as any).fetch = async () => {
  throw new Error("audio asset fetch disabled in mute test");
};

const audio = createU6AudioRuntime();
audio.setBackendMode("adlib");
audio.setMusicEnabled(true);

async function waitForPendingPlay(): Promise<void> {
  for (let i = 0; i < 20 && !pendingPlayResolve; i += 1) {
    await Promise.resolve();
  }
  assert.ok(pendingPlayResolve, "rendered audio element should receive a play request");
}

assert.equal(audio.playMusic("bootup.m"), true, "music request should be accepted");
assert.equal(audio.status().musicLoading, true, "music should enter loading state");

await waitForPendingPlay();
pendingPlayResolve?.();
await Promise.resolve();
await Promise.resolve();

const playingStatus = audio.status();
assert.equal(playingStatus.musicPlaying, true, "music should start after the rendered element play resolves");
assert.equal(playingStatus.musicSong, "bootup.m", "active song should be tracked");

audio.setMuted(true);
const mutedStatus = audio.status();
assert.equal(mutedStatus.muted, true, "output mute should set muted status");
assert.equal(mutedStatus.musicPlaying, true, "output mute must not stop active music");
assert.equal(mutedStatus.musicSong, "bootup.m", "output mute must not clear active song");
assert.equal(audioInstances[0].muted, true, "output mute should mute the rendered audio element");
assert.equal(pauseCount, 0, "output mute must not pause rendered audio");

audio.setMuted(false);
const unmutedStatus = audio.status();
assert.equal(unmutedStatus.muted, false, "output unmute should clear muted status");
assert.equal(unmutedStatus.musicPlaying, true, "output unmute should preserve active music");
assert.equal(audioInstances[0].muted, false, "output unmute should unmute the rendered audio element");

audio.setEnabled(false);
const disabledStatus = audio.status();
assert.equal(disabledStatus.enabled, false, "runtime should remain disabled after hard disable");
assert.equal(disabledStatus.musicPlaying, false, "hard disable should stop music");
assert.equal(disabledStatus.musicSong, "", "hard disable should clear rendered song state");
assert.ok(pauseCount >= 1, "hard disable should pause the rendered audio element");

console.log("audio_runtime_mute_test: ok");

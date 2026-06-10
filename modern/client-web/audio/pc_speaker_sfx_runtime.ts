import { U6_SFX } from "./sfx_ids_runtime.ts";

export const PC_SPEAKER_OUTPUT_RATE = 22050;
const SPKR_VOLUME = 5000 / 32768;

export type PcSpeakerSample = {
  readonly sampleRate: number;
  readonly channelData: Float32Array;
  readonly durationMs: number;
};

type Segment =
  | { readonly kind: "tone"; readonly freq: number; readonly units: number }
  | { readonly kind: "sweep"; readonly start: number; readonly end: number; readonly units: number; readonly step: number }
  | { readonly kind: "random"; readonly base: number; readonly units: number; readonly step: number }
  | { readonly kind: "stutter"; readonly a0: number; readonly a2: number; readonly a4: number; readonly a6: number; readonly a8: number };

export type PcSpeakerAmbientOptions = {
  readonly distance?: number;
  readonly tickPhase?: number;
  readonly seed?: number;
};

function clampI16(n: number): number {
  return Math.max(0, Math.min(0xffff, n | 0));
}

function unitSamples(units: number): number {
  return Math.max(1, Math.floor((units | 0) * (PC_SPEAKER_OUTPUT_RATE / 1255)));
}

function renderSquareTone(freq: number, samples: number): Float32Array {
  const out = new Float32Array(Math.max(0, samples | 0));
  freq = Math.max(0, freq | 0);
  if (freq <= 0) return out;
  const halfPeriod = PC_SPEAKER_OUTPUT_RATE / freq / 2;
  let want = -SPKR_VOLUME;
  let cur = 0;
  let timeLeft = 0;
  for (let i = 0; i < out.length; i++) {
    if (cur !== want) {
      cur += ((want * 8.3502) * Math.min(timeLeft, 1)) / 2;
      if (cur > SPKR_VOLUME || cur < -SPKR_VOLUME) cur = want;
    }
    if (timeLeft <= 1) {
      want = want < 0 ? SPKR_VOLUME : -SPKR_VOLUME;
      const remainder = 1 - timeLeft;
      if (remainder !== 0) {
        cur += ((want * 8.3502) * remainder) / 2;
        if (cur > SPKR_VOLUME || cur < -SPKR_VOLUME) cur = want;
      }
      timeLeft = halfPeriod - remainder;
    } else {
      timeLeft -= 1;
    }
    out[i] = cur;
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function randomFreqSequence(base: number, count: number): number[] {
  const out: number[] = [];
  let rand = 0x7664;
  const range = Math.max(1, (base | 0) - 0x64 + 1);
  for (let i = 0; i < count; i++) {
    rand = (rand + 0x9248) & 0xffff;
    const bits = rand & 0x7;
    rand = ((rand >>> 3) + (bits << 13)) & 0xffff;
    rand = (rand ^ 0x9248) & 0xffff;
    rand = (rand + 0x11) & 0xffff;
    out.push((rand % range) + 0x64);
  }
  return out;
}

function renderSegment(seg: Segment): Float32Array {
  if (seg.kind === "tone") {
    return renderSquareTone(seg.freq, unitSamples(seg.units));
  }
  if (seg.kind === "sweep") {
    const steps = Math.max(1, Math.floor(seg.units / Math.max(1, seg.step)));
    const freqStep = Math.floor(((seg.end - seg.start) * seg.step) / Math.max(1, seg.units));
    const samplesPerStep = Math.max(1, Math.floor(seg.step * (PC_SPEAKER_OUTPUT_RATE * 0.000879533)));
    const parts: Float32Array[] = [];
    let freq = seg.start | 0;
    for (let i = 0; i < steps; i++) {
      parts.push(renderSquareTone(freq, samplesPerStep));
      freq += freqStep;
    }
    return concat(parts);
  }
  if (seg.kind === "random") {
    const steps = Math.max(1, Math.floor(seg.units / Math.max(1, seg.step)));
    const samplesPerStep = Math.max(1, Math.floor(seg.step * (PC_SPEAKER_OUTPUT_RATE / 20 / 800)));
    return concat(randomFreqSequence(seg.base, steps + 1).map((f) => renderSquareTone(f, samplesPerStep)));
  }
  const parts: Float32Array[] = [];
  let dx = 0;
  let cx = clampI16(seg.a4);
  let threshold = clampI16(seg.a2);
  const samplesPerStep = Math.max(1, Math.floor((PC_SPEAKER_OUTPUT_RATE / 22050) * Math.max(1, seg.a6)));
  while (cx > 0) {
    dx = (dx + seg.a8) & 0xffff;
    const freq = dx > threshold ? 22096 : 0;
    parts.push(renderSquareTone(freq, samplesPerStep));
    threshold = clampI16(threshold + seg.a0);
    cx--;
  }
  return concat(parts);
}

function renderQueued(segments: Segment[]): PcSpeakerSample {
  const channelData = concat(segments.map(renderSegment));
  return {
    sampleRate: PC_SPEAKER_OUTPUT_RATE,
    channelData,
    durationMs: channelData.length / PC_SPEAKER_OUTPUT_RATE * 1000
  };
}

function sampleFromData(channelData: Float32Array): PcSpeakerSample {
  return {
    sampleRate: PC_SPEAKER_OUTPUT_RATE,
    channelData,
    durationMs: channelData.length / PC_SPEAKER_OUTPUT_RATE * 1000
  };
}

function nuvieRand(seed: { value: number }, maxExclusive: number): number {
  seed.value = (Math.imul(seed.value ^ 0x6d2b79f5, 1664525) + 1013904223) >>> 0;
  return maxExclusive > 0 ? seed.value % maxExclusive : 0;
}

function osiRand(seed: { value: number }, minInclusive: number, maxInclusive: number): number {
  const min = Math.min(minInclusive | 0, maxInclusive | 0);
  const max = Math.max(minInclusive | 0, maxInclusive | 0);
  seed.value = (Math.imul(seed.value, 1103515245) + 12345) >>> 0;
  return min + ((seed.value >>> 16) % (max - min + 1));
}

function ambientDistance(distance: number | undefined): number {
  return Math.max(0, Math.min(7, Number.isFinite(distance) ? distance! | 0 : 0));
}

function renderNoiseSteps(
  maxFreq: number,
  stepCount: number,
  samplesPerStep: number,
  seedValue: number,
  gate?: (seed: { value: number }, step: number) => number
): Float32Array {
  const seed = { value: seedValue >>> 0 };
  const parts: Float32Array[] = [];
  for (let i = 0; i < stepCount; i++) {
    const gatedFreq = gate ? gate(seed, i) : null;
    const freq = gatedFreq == null ? osiRand(seed, 100, Math.max(100, maxFreq | 0)) : gatedFreq;
    parts.push(renderSquareTone(freq > 19 ? freq : 0, samplesPerStep));
  }
  return concat(parts);
}

function renderOriginalPlayNoise(tempo: number, total: number, maxFreq: number, seed: number, pitchScale = 1): PcSpeakerSample | null {
  const clampedTotal = Math.max(1, total | 0);
  const clampedTempo = Math.max(1, tempo | 0);
  const steps = Math.max(1, Math.ceil(clampedTotal / clampedTempo));
  const samplesPerStep = Math.max(24, Math.floor(clampedTempo * (PC_SPEAKER_OUTPUT_RATE / 1255)));
  const browserMaxFreq = Math.max(100, Math.min(7000, Math.floor((maxFreq | 0) * pitchScale)));
  return sampleFromData(renderNoiseSteps(browserMaxFreq, steps, samplesPerStep, seed >>> 0));
}

export function buildPcSpeakerAmbientSfxRuntime(sfxId: number, options: PcSpeakerAmbientOptions = {}): PcSpeakerSample | null {
  const id = sfxId | 0;
  const di = ambientDistance(options.distance);
  const phase = Number(options.tickPhase ?? 0) | 0;
  const seed = (Number(options.seed ?? 0x6d2b79f5) ^ (id << 16) ^ (di << 8) ^ phase) >>> 0;

  if (id === U6_SFX.CLOCK) {
    if ((phase & 0xf) === 0) return renderQueued([{ kind: "tone", freq: 3000, units: Math.max(1, 3 - (di >> 2)) }]);
    if ((phase & 0xf) === 8) return renderQueued([{ kind: "tone", freq: 2000, units: Math.max(1, 3 - (di >> 2)) }]);
    return null;
  }
  if (id === U6_SFX.FIRE) {
    const gateSeed = { value: seed };
    if (osiRand(gateSeed, 0, 3) !== 0) return null;
    return sampleFromData(renderNoiseSteps(15000, 5, unitSamples(8), gateSeed.value, (s) => {
      if (osiRand(s, 0, di + 7) !== 0) return 0;
      return osiRand(s, 2000, 15000);
    }));
  }
  if (id === U6_SFX.PROTECTION_FIELD) {
    const gateSeed = { value: seed };
    if (osiRand(gateSeed, 0, 1) !== 0) return null;
    return sampleFromData(renderNoiseSteps(Math.max(200, 1500 - (di << 8)), 80, unitSamples(8), gateSeed.value, (s) => {
      if (osiRand(s, 0, 15) !== 0) return 0;
      return osiRand(s, 200, Math.max(200, 1500 - (di << 8)));
    }));
  }
  if (id === U6_SFX.FOUNTAIN) {
    return renderOriginalPlayNoise(10, Math.max(1, 30 - (di << 2)), Math.max(100, 25000 - (di << 11)), seed, 0.25);
  }
  if (id === U6_SFX.WATER_WHEEL) {
    return renderOriginalPlayNoise(20, Math.max(1, 60 - (di << 2)), Math.max(100, 10000 - (di << 10)), seed, 0.45);
  }
  return buildPcSpeakerSfxRuntime(id);
}

export function buildPcSpeakerSfxRuntime(sfxId: number): PcSpeakerSample | null {
  const id = sfxId | 0;
  if (id === U6_SFX.BLOCKED) return renderQueued([{ kind: "tone", freq: 311, units: 0x0a }]);
  if (id === U6_SFX.MISSLE) return renderQueued([{ kind: "sweep", start: 1200, end: 2000, units: 40, step: 1 }]);
  if (id === U6_SFX.EXPLOSION) return renderQueued([{ kind: "random", base: 0x2710, units: 0x320, step: 1 }]);
  if (id === U6_SFX.SUCCESS) return renderQueued([{ kind: "tone", freq: 2000, units: 0x0a }]);
  if (id === U6_SFX.FAILURE) return renderQueued([{ kind: "sweep", start: 800, end: 2000, units: 50, step: 1 }]);
  if (id === U6_SFX.ATTACK_SWING) return renderQueued([{ kind: "sweep", start: 400, end: 750, units: 150, step: 5 }]);
  if (id === U6_SFX.RUBBER_DUCK) return renderQueued([{ kind: "sweep", start: 5000, end: 8000, units: 50, step: 1 }]);
  if (id === U6_SFX.HIT) return renderQueued([{ kind: "random", base: 0x2710, units: 0x320, step: 1 }]);
  if (id === U6_SFX.BROKEN_GLASS) {
    const segments: Segment[] = [];
    for (let i = 0x7d0; i < 0x4e20; i += 0x3e8) segments.push({ kind: "random", base: i, units: 0x78, step: 0x28 });
    return renderQueued(segments);
  }
  if (id === U6_SFX.CORPSER_DRAGGED_UNDER) return renderQueued([{ kind: "sweep", start: 1200, end: 2000, units: 40, step: 1 }]);
  if (id === U6_SFX.CORPSER_REGURGITATE) return renderQueued([{ kind: "random", base: 0x258, units: 0x1b58, step: 1 }]);
  if (id >= U6_SFX.CASTING_MAGIC_P1 && id <= U6_SFX.CASTING_MAGIC_P1_8) {
    const circle = id - U6_SFX.CASTING_MAGIC_P1 + 1;
    return renderQueued([{ kind: "random", base: 0x2bc, units: 0x640 * circle + 0x1f40, step: 0x320 }]);
  }
  if (id >= U6_SFX.CASTING_MAGIC_P2 && id <= U6_SFX.CASTING_MAGIC_P2_8) {
    const circle = id - U6_SFX.CASTING_MAGIC_P2 + 1;
    const a0 = [3, 2, 2, 2, 1, 1, 1, 1, 1][circle] || 1;
    const a2a = [0xA8C, 0xBB8, 0x3E8, 0x64, 0x1388, 0xFA0, 0x9C4, 0x3E8, 1][circle] || 1;
    const a2b = [0x7FBC, 0x7918, 0x9088, 0xAFC8, 0x7918, 0x84D0, 0x8E94, 0x9858, 0xA410][circle] || 1;
    const a8 = [0x226A, 0x1E96, 0x1B94, 0x1996, 0x173E, 0x15C2, 0x143C, 0x12D4, 0x1180][circle] || 0x1180;
    const a4 = circle * 0xfa0 + 0x2710;
    return renderQueued([
      { kind: "stutter", a0, a2: a2a, a4, a6: 1, a8 },
      { kind: "stutter", a0: -a0, a2: a2b, a4, a6: 1, a8 }
    ]);
  }
  if (id === U6_SFX.BELL) return renderQueued([{ kind: "stutter", a0: -1, a2: 0x4e20, a4: 0x3e80, a6: 1, a8: 0x7d0 }]);
  if (id === U6_SFX.AVATAR_DEATH) {
    return renderQueued([0x12C, 0x119, 0x12C, 0xFA, 0x119, 0xDE, 0xFA, 0xFA]
      .map((a8) => ({ kind: "stutter", a0: 3, a2: 1, a4: 0x4e20, a6: 1, a8 })));
  }
  if (id === U6_SFX.KAL_LOR) {
    const segments: Segment[] = [];
    for (let i = 0; i < 0x32; i++) {
      segments.push({ kind: "stutter", a0: (0x32 - i) << 2, a2: 0x2710 - (i << 6), a4: 0x3e8, a6: 1, a8: (i << 4) + 0x320 });
    }
    segments.push({ kind: "stutter", a0: 8, a2: 0, a4: 0x1f40, a6: 1, a8: 0x640 });
    return renderQueued(segments);
  }
  if (id === U6_SFX.SLUG_DISSOLVE) {
    const seed = { value: 0x12345678 };
    return renderQueued(Array.from({ length: 20 }, () => ({ kind: "random", base: nuvieRand(seed, 0x1068) + 0x258, units: 0x15e, step: 1 })));
  }
  if (id === U6_SFX.HAIL_STONE) {
    const seed = { value: 0x12345678 };
    return renderQueued(Array.from({ length: 0x28 }, () => ({ kind: "tone", freq: nuvieRand(seed, 0x28) + 0x20, units: 8 })));
  }
  if (id === U6_SFX.EARTH_QUAKE) {
    const seed = { value: 0x12345678 };
    return renderQueued(Array.from({ length: 0x28 }, () => ({ kind: "tone", freq: nuvieRand(seed, 0xb5) + 0x13, units: 8 })));
  }
  return null;
}

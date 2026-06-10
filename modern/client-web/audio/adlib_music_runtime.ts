import { decodeU6MSongRuntime, U6MRegisterSequencerRuntime, type U6MRegisterWrite } from "./u6m_music_runtime.ts";

export const U6_ADLIB_TICK_HZ = 60;

const OPERATOR_OFFSETS = new Set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15]);
const CARRIER_TO_CHANNEL = new Map([
  [0x03, 0], [0x04, 1], [0x05, 2],
  [0x0b, 3], [0x0c, 4], [0x0d, 5],
  [0x13, 6], [0x14, 7], [0x15, 8]
]);
const MODULATOR_TO_CHANNEL = new Map([
  [0x00, 0], [0x01, 1], [0x02, 2],
  [0x08, 3], [0x09, 4], [0x0a, 5],
  [0x10, 6], [0x11, 7], [0x12, 8]
]);
const OPL_MULTIPLIERS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12, 12, 15, 15];

export type U6AdlibSongSource = (songId: string) => Promise<Uint8Array | null>;

export type U6AdlibStatus = {
  readonly playing: boolean;
  readonly loading: boolean;
  readonly songId: string;
  readonly lastError: string;
};

type VoiceState = {
  readonly carrierOsc: OscillatorNode;
  readonly modOsc: OscillatorNode;
  readonly outputGain: GainNode;
  readonly modGain: GainNode;
  readonly modAudibleGain: GainNode;
  fnumLo: number;
  fnumHi: number;
  carrierLevel: number;
  modulatorLevel: number;
  carrierMult: number;
  modulatorMult: number;
  carrierAttackDecay: number;
  carrierSustainRelease: number;
  connectionFeedback: number;
  keyOn: boolean;
};

function u8(n: number): number {
  return (Number(n) | 0) & 0xff;
}

export function oplFnumToHzRuntime(fnumLo: number, fnumHi: number): number {
  const word = (u8(fnumLo) | (u8(fnumHi) << 8)) & 0x3ff;
  const block = (u8(fnumHi) >>> 2) & 0x07;
  if (word <= 0) return 0;
  return Math.max(20, Math.min(7902, (word * 49716) / Math.pow(2, 20 - block)));
}

export function oplTotalLevelToGainRuntime(totalLevel: number): number {
  const level = u8(totalLevel) & 0x3f;
  const db = -level * 0.75;
  return Math.max(0, Math.min(1, Math.pow(10, db / 20)));
}

function oplMultiplier(regValue: number): number {
  return OPL_MULTIPLIERS[u8(regValue) & 0x0f] || 1;
}

function attackTime(regValue: number): number {
  const attack = (u8(regValue) >>> 4) & 0x0f;
  return Math.max(0.004, (16 - attack) * 0.012);
}

function decayTime(regValue: number): number {
  const decay = u8(regValue) & 0x0f;
  return Math.max(0.018, (16 - decay) * 0.035);
}

function sustainScale(regValue: number): number {
  const sustain = (u8(regValue) >>> 4) & 0x0f;
  return Math.max(0.08, 1 - sustain / 17);
}

function releaseTime(regValue: number): number {
  const release = u8(regValue) & 0x0f;
  return Math.max(0.012, (16 - release) * 0.025);
}

export class U6AdlibMusicRuntime {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly songSource: U6AdlibSongSource;
  private readonly periodicWaves = new Map<number, PeriodicWave>();
  private voices: VoiceState[] = [];
  private sequencer: U6MRegisterSequencerRuntime | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private loading = false;
  private playing = false;
  private songId = "";
  private lastError = "";

  constructor(ctx: AudioContext, songSource: U6AdlibSongSource, masterVolume = 0.32) {
    this.ctx = ctx;
    this.songSource = songSource;
    this.master = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.compressor = ctx.createDynamicsCompressor();
    this.master.gain.value = masterVolume;
    this.filter.type = "lowpass";
    this.filter.frequency.value = 7600;
    this.filter.Q.value = 0.35;
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 2.5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;
    this.master.connect(this.filter);
    this.filter.connect(this.compressor);
    this.compressor.connect(ctx.destination);
  }

  setVolume(volume: number) {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) * 0.32, this.ctx.currentTime, 0.01);
  }

  status(): U6AdlibStatus {
    return {
      playing: this.playing,
      loading: this.loading,
      songId: this.songId,
      lastError: this.lastError
    };
  }

  play(songId: string): boolean {
    const nextSong = String(songId || "").trim();
    if (!nextSong) return false;
    this.stop();
    this.songId = nextSong;
    this.loading = true;
    this.lastError = "";
    void this.loadAndStart(nextSong);
    return true;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const voice of this.voices) {
      try {
        voice.outputGain.gain.cancelScheduledValues(this.ctx.currentTime);
        voice.outputGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
        voice.modAudibleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
        voice.modGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
        voice.carrierOsc.stop(this.ctx.currentTime + 0.05);
        voice.modOsc.stop(this.ctx.currentTime + 0.05);
      } catch {}
    }
    this.voices = [];
    this.sequencer = null;
    this.playing = false;
    this.loading = false;
  }

  private async loadAndStart(songId: string) {
    try {
      const bytes = await this.songSource(songId);
      if (!bytes) throw new Error(`song asset not found: ${songId}`);
      const decoded = decodeU6MSongRuntime(bytes);
      if (!decoded.ok || !decoded.data) throw new Error(`song decode failed: ${decoded.reason}`);
      if (this.songId !== songId) return;
      this.sequencer = new U6MRegisterSequencerRuntime(decoded.data);
      this.createVoices();
      this.applyWrites(this.sequencer.rewind());
      this.playing = true;
      this.loading = false;
      this.timer = setInterval(() => this.tick(), 1000 / U6_ADLIB_TICK_HZ);
    } catch (err) {
      this.lastError = String((err as any)?.message || err || "adlib music error");
      this.loading = false;
      this.playing = false;
    }
  }

  private createVoices() {
    this.voices = [];
    for (let i = 0; i < 9; i += 1) {
      const carrierOsc = this.ctx.createOscillator();
      const modOsc = this.ctx.createOscillator();
      const outputGain = this.ctx.createGain();
      const modGain = this.ctx.createGain();
      const modAudibleGain = this.ctx.createGain();
      carrierOsc.type = "sine";
      modOsc.type = "sine";
      carrierOsc.frequency.value = 220;
      modOsc.frequency.value = 220;
      outputGain.gain.value = 0;
      modGain.gain.value = 0;
      modAudibleGain.gain.value = 0;
      modOsc.connect(modGain);
      modGain.connect(carrierOsc.frequency);
      modOsc.connect(modAudibleGain);
      carrierOsc.connect(outputGain);
      modAudibleGain.connect(this.master);
      outputGain.connect(this.master);
      carrierOsc.start();
      modOsc.start();
      this.voices.push({
        carrierOsc,
        modOsc,
        outputGain,
        modGain,
        modAudibleGain,
        fnumLo: 0,
        fnumHi: 0,
        carrierLevel: 0x20,
        modulatorLevel: 0x20,
        carrierMult: 1,
        modulatorMult: 1,
        carrierAttackDecay: 0xf0,
        carrierSustainRelease: 0x0f,
        connectionFeedback: 0,
        keyOn: false
      });
    }
  }

  private tick() {
    if (!this.sequencer) return;
    const writes = this.sequencer.update();
    this.applyWrites(writes);
    if (this.sequencer.songEnd) {
      this.applyWrites(this.sequencer.rewind());
    }
  }

  private applyWrites(writes: readonly U6MRegisterWrite[]) {
    for (const write of writes) {
      this.applyWrite(write.reg, write.value);
    }
  }

  private applyWrite(reg: number, value: number) {
    reg = u8(reg);
    value = u8(value);
    if (reg >= 0xa0 && reg <= 0xa8) {
      const voice = this.voices[reg - 0xa0];
      if (!voice) return;
      voice.fnumLo = value;
      this.updateVoiceFrequency(voice);
      return;
    }
    if (reg >= 0xb0 && reg <= 0xb8) {
      const voice = this.voices[reg - 0xb0];
      if (!voice) return;
      voice.fnumHi = value;
      this.updateVoiceFrequency(voice);
      this.updateVoiceKey(voice);
      return;
    }
    if (reg >= 0x40 && reg <= 0x55) {
      const offset = reg - 0x40;
      if (!OPERATOR_OFFSETS.has(offset)) return;
      const carrierChannel = CARRIER_TO_CHANNEL.get(offset);
      const modulatorChannel = MODULATOR_TO_CHANNEL.get(offset);
      const voice = this.voices[carrierChannel ?? modulatorChannel ?? -1];
      if (!voice) return;
      if (carrierChannel != null) voice.carrierLevel = value;
      else voice.modulatorLevel = value;
      this.updateVoiceKey(voice);
      return;
    }
    if (reg >= 0x20 && reg <= 0x35) {
      const offset = reg - 0x20;
      if (!OPERATOR_OFFSETS.has(offset)) return;
      const carrierChannel = CARRIER_TO_CHANNEL.get(offset);
      const modulatorChannel = MODULATOR_TO_CHANNEL.get(offset);
      const voice = this.voices[carrierChannel ?? modulatorChannel ?? -1];
      if (!voice) return;
      if (carrierChannel != null) voice.carrierMult = oplMultiplier(value);
      else voice.modulatorMult = oplMultiplier(value);
      this.updateVoiceFrequency(voice);
      return;
    }
    if (reg >= 0x60 && reg <= 0x75) {
      const offset = reg - 0x60;
      const channel = CARRIER_TO_CHANNEL.get(offset);
      const voice = channel == null ? null : this.voices[channel];
      if (!voice) return;
      voice.carrierAttackDecay = value;
      return;
    }
    if (reg >= 0x80 && reg <= 0x95) {
      const offset = reg - 0x80;
      const channel = CARRIER_TO_CHANNEL.get(offset);
      const voice = channel == null ? null : this.voices[channel];
      if (!voice) return;
      voice.carrierSustainRelease = value;
      return;
    }
    if (reg >= 0xc0 && reg <= 0xc8) {
      const voice = this.voices[reg - 0xc0];
      if (!voice) return;
      voice.connectionFeedback = value;
      this.updateVoiceKey(voice);
      return;
    }
    if (reg >= 0xe0 && reg <= 0xf5) {
      const offset = reg - 0xe0;
      const carrierChannel = CARRIER_TO_CHANNEL.get(offset);
      const modulatorChannel = MODULATOR_TO_CHANNEL.get(offset);
      const voice = this.voices[carrierChannel ?? modulatorChannel ?? -1];
      if (!voice) return;
      this.applyOplWaveform(carrierChannel != null ? voice.carrierOsc : voice.modOsc, value);
    }
  }

  private applyOplWaveform(osc: OscillatorNode, regValue: number) {
    const waveform = u8(regValue) & 0x03;
    if (waveform === 0) {
      osc.type = "sine";
      return;
    }
    let wave = this.periodicWaves.get(waveform);
    if (!wave) {
      wave = this.createOplPeriodicWave(waveform);
      this.periodicWaves.set(waveform, wave);
    }
    osc.setPeriodicWave(wave);
  }

  private createOplPeriodicWave(waveform: number): PeriodicWave {
    const sampleCount = 1024;
    const harmonicCount = 64;
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      const phase = (i / sampleCount) * Math.PI * 2;
      const s = Math.sin(phase);
      if (waveform === 1) {
        samples[i] = s > 0 ? s : 0;
      } else if (waveform === 2) {
        samples[i] = Math.abs(s) * 2 - 1;
      } else {
        const folded = Math.sin(phase % Math.PI);
        samples[i] = phase < Math.PI ? folded : -folded * 0.35;
      }
    }
    const real = new Float32Array(harmonicCount + 1);
    const imag = new Float32Array(harmonicCount + 1);
    for (let h = 1; h <= harmonicCount; h += 1) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < sampleCount; i += 1) {
        const phase = (2 * Math.PI * h * i) / sampleCount;
        re += samples[i] * Math.cos(phase);
        im -= samples[i] * Math.sin(phase);
      }
      real[h] = (2 * re) / sampleCount;
      imag[h] = (2 * im) / sampleCount;
    }
    return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private updateVoiceFrequency(voice: VoiceState) {
    const hz = oplFnumToHzRuntime(voice.fnumLo, voice.fnumHi);
    voice.carrierOsc.frequency.setTargetAtTime(hz * voice.carrierMult, this.ctx.currentTime, 0.004);
    voice.modOsc.frequency.setTargetAtTime(hz * voice.modulatorMult, this.ctx.currentTime, 0.004);
    this.updateModulationDepth(voice, hz);
  }

  private updateVoiceKey(voice: VoiceState) {
    const keyOn = (voice.fnumHi & 0x20) !== 0;
    const wasOn = voice.keyOn;
    const carrierTarget = keyOn ? oplTotalLevelToGainRuntime(voice.carrierLevel) * 0.16 : 0;
    const modulatorTarget = keyOn && (voice.connectionFeedback & 0x01) ? oplTotalLevelToGainRuntime(voice.modulatorLevel) * 0.05 : 0;
    const sustain = sustainScale(voice.carrierSustainRelease);
    const attack = attackTime(voice.carrierAttackDecay);
    const decay = decayTime(voice.carrierAttackDecay);
    voice.keyOn = keyOn;
    voice.outputGain.gain.cancelScheduledValues(this.ctx.currentTime);
    voice.modAudibleGain.gain.cancelScheduledValues(this.ctx.currentTime);
    if (keyOn && !wasOn) {
      voice.outputGain.gain.setValueAtTime(0, this.ctx.currentTime);
      voice.outputGain.gain.linearRampToValueAtTime(carrierTarget, this.ctx.currentTime + attack);
      voice.outputGain.gain.setTargetAtTime(carrierTarget * sustain, this.ctx.currentTime + attack, decay);
      voice.modAudibleGain.gain.setValueAtTime(0, this.ctx.currentTime);
      voice.modAudibleGain.gain.linearRampToValueAtTime(modulatorTarget, this.ctx.currentTime + attack);
      voice.modAudibleGain.gain.setTargetAtTime(modulatorTarget * sustain, this.ctx.currentTime + attack, decay);
    } else {
      const time = keyOn ? 0.015 : releaseTime(voice.carrierSustainRelease);
      voice.outputGain.gain.setTargetAtTime(carrierTarget * (keyOn ? sustain : 1), this.ctx.currentTime, time);
      voice.modAudibleGain.gain.setTargetAtTime(modulatorTarget * (keyOn ? sustain : 1), this.ctx.currentTime, time);
    }
    this.updateModulationDepth(voice, oplFnumToHzRuntime(voice.fnumLo, voice.fnumHi));
  }

  private updateModulationDepth(voice: VoiceState, baseHz: number) {
    const keyOn = (voice.fnumHi & 0x20) !== 0;
    const levelGain = oplTotalLevelToGainRuntime(voice.modulatorLevel);
    const connectionScale = (voice.connectionFeedback & 0x01) ? 0.35 : 1;
    const target = keyOn ? Math.min(1600, Math.max(0, baseHz * levelGain * 2.8 * connectionScale)) : 0;
    voice.modGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.012);
  }
}

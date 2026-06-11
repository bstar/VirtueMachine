import { decompressU6LzwRuntime } from "../conversation/archive_runtime.ts";

export type U6MRegisterWrite = {
  readonly tick: number;
  readonly reg: number;
  readonly value: number;
};

export type U6MPlaybackTrace = {
  readonly writes: U6MRegisterWrite[];
  readonly loopStartTick: number | null;
  readonly loopEndTick: number | null;
};

export type U6MDecodeResult = {
  readonly ok: boolean;
  readonly data: Uint8Array | null;
  readonly reason: string;
};

type BytePair = { lo: number; hi: number };
type SubsongInfo = { continuePos: number; repetitions: number; start: number };

const FREQ_TABLE: ReadonlyArray<BytePair> = [
  { lo: 0x00, hi: 0x00 }, { lo: 0x58, hi: 0x01 }, { lo: 0x82, hi: 0x01 }, { lo: 0xb0, hi: 0x01 },
  { lo: 0xcc, hi: 0x01 }, { lo: 0x03, hi: 0x02 }, { lo: 0x41, hi: 0x02 }, { lo: 0x86, hi: 0x02 },
  { lo: 0x00, hi: 0x00 }, { lo: 0x6a, hi: 0x01 }, { lo: 0x96, hi: 0x01 }, { lo: 0xc7, hi: 0x01 },
  { lo: 0xe4, hi: 0x01 }, { lo: 0x1e, hi: 0x02 }, { lo: 0x5f, hi: 0x02 }, { lo: 0xa8, hi: 0x02 },
  { lo: 0x00, hi: 0x00 }, { lo: 0x47, hi: 0x01 }, { lo: 0x6e, hi: 0x01 }, { lo: 0x9a, hi: 0x01 },
  { lo: 0xb5, hi: 0x01 }, { lo: 0xe9, hi: 0x01 }, { lo: 0x24, hi: 0x02 }, { lo: 0x66, hi: 0x02 }
];

const CARRIER_OFFSETS = [0x03, 0x04, 0x05, 0x0b, 0x0c, 0x0d, 0x13, 0x14, 0x15];
const MODULATOR_OFFSETS = [0x00, 0x01, 0x02, 0x08, 0x09, 0x0a, 0x10, 0x11, 0x12];

function u8(n: number): number {
  return (Number(n) | 0) & 0xff;
}

function s8(n: number): number {
  const v = u8(n);
  return v <= 127 ? v : v - 0x100;
}

function clampChannel(channel: number): number {
  return Math.max(0, Math.min(8, Number(channel) | 0));
}

function expandFreqByte(freqByte: number): BytePair {
  const packed = Math.min(23, u8(freqByte) & 0x1f);
  const octave = u8(freqByte) >>> 5;
  const base = FREQ_TABLE[packed] || FREQ_TABLE[0];
  return { lo: base.lo, hi: u8(base.hi + (octave << 2)) };
}

export function decodeU6MSongRuntime(bytes: Uint8Array | null | undefined): U6MDecodeResult {
  if (!(bytes instanceof Uint8Array) || bytes.length < 6) {
    return { ok: false, data: null, reason: "missing_or_short_song" };
  }
  const decoded = decompressU6LzwRuntime(bytes);
  if (!decoded || decoded.length === 0) {
    return { ok: false, data: null, reason: "lzw_decode_failed" };
  }
  return { ok: true, data: decoded, reason: "ok" };
}

export class U6MRegisterSequencerRuntime {
  readonly songData: Uint8Array;
  tick = 0;
  songEnd = false;
  songPos = 0;
  loopPosition = 0;
  loopStartTick: number | null = null;
  loopEndTick: number | null = null;
  readDelay = 0;
  readonly instrumentOffsets = new Int32Array(256);
  readonly vbCurrentValue = new Uint8Array(9);
  readonly vbDoubleAmplitude = new Uint8Array(9);
  readonly vbMultiplier = new Uint8Array(9);
  readonly vbDirectionFlag = new Uint8Array(9);
  readonly carrierMf = new Uint8Array(9);
  readonly carrierMfSignedDelta = new Int8Array(9);
  readonly carrierMfModDelayBackup = new Uint8Array(9);
  readonly carrierMfModDelay = new Uint8Array(9);
  readonly channelFreqLo = new Uint8Array(9);
  readonly channelFreqHi = new Uint8Array(9);
  readonly channelFreqSignedDelta = new Int8Array(9);
  readonly subsongStack: SubsongInfo[] = [];

  constructor(songData: Uint8Array) {
    this.songData = songData;
    this.instrumentOffsets.fill(-1);
  }

  rewind(): U6MRegisterWrite[] {
    this.tick = 0;
    this.songEnd = false;
    this.songPos = 0;
    this.loopPosition = 0;
    this.loopStartTick = null;
    this.loopEndTick = null;
    this.readDelay = 0;
    this.subsongStack.length = 0;
    this.vbCurrentValue.fill(0);
    this.vbDoubleAmplitude.fill(0);
    this.vbMultiplier.fill(0);
    this.vbDirectionFlag.fill(0);
    this.carrierMf.fill(0);
    this.carrierMfSignedDelta.fill(0);
    this.carrierMfModDelayBackup.fill(0);
    this.carrierMfModDelay.fill(0);
    this.channelFreqLo.fill(0);
    this.channelFreqHi.fill(0);
    this.channelFreqSignedDelta.fill(0);
    return [{ tick: this.tick, reg: 0x01, value: 0x20 }];
  }

  update(): U6MRegisterWrite[] {
    if (this.songEnd) return [];
    const writes: U6MRegisterWrite[] = [];
    this.readDelay = Math.max(0, (this.readDelay | 0) - 1);
    if (this.readDelay === 0) {
      this.commandLoop(writes);
    }
    for (let channel = 0; channel < 9; channel += 1) {
      if (this.channelFreqSignedDelta[channel] !== 0) {
        this.freqSlide(channel, writes);
        if (this.carrierMfSignedDelta[channel] !== 0) this.mfSlide(channel, writes);
      } else {
        if (this.vbMultiplier[channel] !== 0 && (this.channelFreqHi[channel] & 0x20) === 0x20) {
          this.vibrato(channel, writes);
        }
        if (this.carrierMfSignedDelta[channel] !== 0) this.mfSlide(channel, writes);
      }
    }
    this.tick = (this.tick + 1) >>> 0;
    return writes;
  }

  collectRegisterWrites(maxTicks: number): U6MRegisterWrite[] {
    return this.collectPlaybackTrace(maxTicks).writes;
  }

  collectPlaybackTrace(maxTicks: number): U6MPlaybackTrace {
    const writes = this.rewind();
    for (let i = 0; i < maxTicks && !this.songEnd; i += 1) {
      writes.push(...this.update());
    }
    return {
      writes,
      loopStartTick: this.loopStartTick,
      loopEndTick: this.loopEndTick
    };
  }

  private readByte(): number {
    if (this.songPos < 0 || this.songPos >= this.songData.length) {
      this.songEnd = true;
      return 0;
    }
    return this.songData[this.songPos++] & 0xff;
  }

  private write(writes: U6MRegisterWrite[], reg: number, value: number) {
    writes.push({ tick: this.tick, reg: u8(reg), value: u8(value) });
  }

  private setAdlibFreq(channel: number, freq: BytePair, writes: U6MRegisterWrite[]) {
    channel = clampChannel(channel);
    this.write(writes, 0xa0 + channel, freq.lo);
    this.write(writes, 0xb0 + channel, freq.hi);
    this.channelFreqLo[channel] = u8(freq.lo);
    this.channelFreqHi[channel] = u8(freq.hi);
  }

  private setAdlibFreqNoUpdate(channel: number, freq: BytePair, writes: U6MRegisterWrite[]) {
    channel = clampChannel(channel);
    this.write(writes, 0xa0 + channel, freq.lo);
    this.write(writes, 0xb0 + channel, freq.hi);
  }

  private outOpCell(channel: number, carrier: boolean, reg: number, value: number, writes: U6MRegisterWrite[]) {
    channel = clampChannel(channel);
    const offsets = carrier ? CARRIER_OFFSETS : MODULATOR_OFFSETS;
    this.write(writes, reg + offsets[channel], value);
  }

  private setCarrierMf(channel: number, value: number, writes: U6MRegisterWrite[]) {
    channel = clampChannel(channel);
    this.outOpCell(channel, true, 0x40, value, writes);
    this.carrierMf[channel] = u8(value);
  }

  private commandLoop(writes: U6MRegisterWrite[]) {
    let repeat = true;
    let guard = 0;
    while (repeat && !this.songEnd && guard++ < 4096) {
      const cmd = this.readByte();
      const hi = cmd >>> 4;
      const lo = cmd & 0x0f;
      switch (hi) {
        case 0x0:
          this.setAdlibFreq(lo, expandFreqByte(this.readByte()), writes);
          break;
        case 0x1: {
          const freq = expandFreqByte(this.readByte());
          this.vbDirectionFlag[clampChannel(lo)] = 0;
          this.vbCurrentValue[clampChannel(lo)] = 0;
          this.setAdlibFreq(lo, freq, writes);
          this.setAdlibFreq(lo, { lo: freq.lo, hi: freq.hi | 0x20 }, writes);
          break;
        }
        case 0x2: {
          const freq = expandFreqByte(this.readByte());
          this.setAdlibFreq(lo, { lo: freq.lo, hi: freq.hi | 0x20 }, writes);
          break;
        }
        case 0x3:
          this.carrierMfSignedDelta[clampChannel(lo)] = 0;
          this.setCarrierMf(lo, this.readByte(), writes);
          break;
        case 0x4:
          this.outOpCell(lo, false, 0x40, this.readByte(), writes);
          break;
        case 0x5:
          this.channelFreqSignedDelta[clampChannel(lo)] = s8(this.readByte());
          break;
        case 0x6: {
          const params = this.readByte();
          const channel = clampChannel(lo);
          this.vbDoubleAmplitude[channel] = params >>> 4;
          this.vbMultiplier[channel] = params & 0x0f;
          break;
        }
        case 0x7:
          this.commandInstrument(lo, this.readByte(), writes);
          break;
        case 0x8:
          repeat = this.command8(lo, writes);
          break;
        case 0xe:
          this.loopPosition = this.songPos;
          this.loopStartTick = this.tick;
          break;
        case 0xf:
          this.commandReturn();
          break;
        default:
          break;
      }
    }
    if (guard >= 4096) this.songEnd = true;
  }

  private commandInstrument(channel: number, instrument: number, writes: U6MRegisterWrite[]) {
    const offset = this.instrumentOffsets[u8(instrument)] | 0;
    if (offset < 0 || offset + 10 >= this.songData.length) return;
    const d = this.songData;
    this.outOpCell(channel, false, 0x20, d[offset + 0], writes);
    this.outOpCell(channel, false, 0x40, d[offset + 1], writes);
    this.outOpCell(channel, false, 0x60, d[offset + 2], writes);
    this.outOpCell(channel, false, 0x80, d[offset + 3], writes);
    this.outOpCell(channel, false, 0xe0, d[offset + 4], writes);
    this.outOpCell(channel, true, 0x20, d[offset + 5], writes);
    this.outOpCell(channel, true, 0x40, d[offset + 6], writes);
    this.outOpCell(channel, true, 0x60, d[offset + 7], writes);
    this.outOpCell(channel, true, 0x80, d[offset + 8], writes);
    this.outOpCell(channel, true, 0xe0, d[offset + 9], writes);
    this.write(writes, 0xc0 + clampChannel(channel), d[offset + 10]);
  }

  private command8(lo: number, writes: U6MRegisterWrite[]): boolean {
    switch (lo) {
      case 1: {
        const repetitions = this.readByte();
        const start = this.readByte() | (this.readByte() << 8);
        this.subsongStack.push({ repetitions, start, continuePos: this.songPos });
        this.songPos = start;
        return true;
      }
      case 2:
        this.readDelay = this.readByte();
        return false;
      case 3: {
        const instrument = this.readByte();
        this.instrumentOffsets[u8(instrument)] = this.songPos;
        this.songPos += 11;
        return true;
      }
      case 5: {
        const data = this.readByte();
        const channel = clampChannel(data >>> 4);
        const delay = (data & 0x0f) + 1;
        this.carrierMfSignedDelta[channel] = 1;
        this.carrierMfModDelay[channel] = delay;
        this.carrierMfModDelayBackup[channel] = delay;
        return true;
      }
      case 6: {
        const data = this.readByte();
        const channel = clampChannel(data >>> 4);
        const delay = (data & 0x0f) + 1;
        this.carrierMfSignedDelta[channel] = -1;
        this.carrierMfModDelay[channel] = delay;
        this.carrierMfModDelayBackup[channel] = delay;
        return true;
      }
      default:
        return true;
    }
  }

  private commandReturn() {
    const top = this.subsongStack.pop();
    if (top) {
      const repetitions = (top.repetitions | 0) - 1;
      if (repetitions <= 0) {
        this.songPos = top.continuePos;
      } else {
        this.songPos = top.start;
        this.subsongStack.push({ ...top, repetitions });
      }
    } else {
      this.loopEndTick = this.tick;
      this.songPos = this.loopPosition;
      this.songEnd = true;
    }
  }

  private freqSlide(channel: number, writes: U6MRegisterWrite[]) {
    let word = (this.channelFreqLo[channel] | (this.channelFreqHi[channel] << 8)) + this.channelFreqSignedDelta[channel];
    word &= 0xffff;
    this.setAdlibFreq(channel, { lo: word & 0xff, hi: (word >>> 8) & 0xff }, writes);
  }

  private vibrato(channel: number, writes: U6MRegisterWrite[]) {
    if (this.vbCurrentValue[channel] >= this.vbDoubleAmplitude[channel]) this.vbDirectionFlag[channel] = 1;
    else if (this.vbCurrentValue[channel] <= 0) this.vbDirectionFlag[channel] = 0;
    this.vbCurrentValue[channel] = u8(this.vbCurrentValue[channel] + (this.vbDirectionFlag[channel] ? -1 : 1));
    let word = this.channelFreqLo[channel] | (this.channelFreqHi[channel] << 8);
    word += (this.vbCurrentValue[channel] - (this.vbDoubleAmplitude[channel] >>> 1)) * this.vbMultiplier[channel];
    word &= 0xffff;
    this.setAdlibFreqNoUpdate(channel, { lo: word & 0xff, hi: (word >>> 8) & 0xff }, writes);
  }

  private mfSlide(channel: number, writes: U6MRegisterWrite[]) {
    this.carrierMfModDelay[channel] = u8(this.carrierMfModDelay[channel] - 1);
    if (this.carrierMfModDelay[channel] !== 0) return;
    this.carrierMfModDelay[channel] = this.carrierMfModDelayBackup[channel];
    let current = this.carrierMf[channel] + this.carrierMfSignedDelta[channel];
    if (current > 0x3f) {
      current = 0x3f;
      this.carrierMfSignedDelta[channel] = 0;
    } else if (current < 0) {
      current = 0;
      this.carrierMfSignedDelta[channel] = 0;
    }
    this.setCarrierMf(channel, current, writes);
  }
}

export function collectU6MRegisterWritesRuntime(lzwSongBytes: Uint8Array, maxTicks: number): U6MRegisterWrite[] {
  return collectU6MPlaybackTraceRuntime(lzwSongBytes, maxTicks).writes;
}

export function collectU6MPlaybackTraceRuntime(lzwSongBytes: Uint8Array, maxTicks: number): U6MPlaybackTrace {
  const decoded = decodeU6MSongRuntime(lzwSongBytes);
  if (!decoded.ok || !decoded.data) return { writes: [], loopStartTick: null, loopEndTick: null };
  return new U6MRegisterSequencerRuntime(decoded.data).collectPlaybackTrace(maxTicks);
}

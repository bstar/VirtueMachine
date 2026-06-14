export type U6AnimDataEntryRuntime = {
  baseTile: number;
  startFrame: number;
  mask: number;
  shift: number;
};

export class U6AnimDataRuntime {
  entries: U6AnimDataEntryRuntime[];
  state: Uint8Array;
  byBase: Map<number, number>;

  constructor(entries: U6AnimDataEntryRuntime[]) {
    this.entries = entries;
    this.state = new Uint8Array(entries.length);
    this.state.fill(1);
    this.byBase = new Map();
    for (let i = 0; i < entries.length; i += 1) {
      this.byBase.set(entries[i].baseTile, i);
    }
  }

  setByBaseTile(tileId: number, mode: number): void {
    const i = this.byBase.get(tileId);
    if (i === undefined) {
      return;
    }
    this.state[i] = mode & 0x03;
  }

  hasBaseTile(tileId: number): boolean {
    return this.byBase.has(tileId);
  }

  animatedTile(tileId: number, counter: number): number {
    const i = this.byBase.get(tileId);
    if (i === undefined) {
      return tileId;
    }
    const e = this.entries[i];
    let frame = e.startFrame;
    if (this.state[i] === 1) {
      frame += ((counter & e.mask) >>> e.shift);
    } else if (this.state[i] === 2) {
      frame += (((~counter) & e.mask) >>> e.shift);
    }
    return frame & 0xffff;
  }

  static fromBytes(bytes: Uint8Array | null | undefined): U6AnimDataRuntime | null {
    if (!bytes || bytes.length < 2) {
      return null;
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const maxAnim = 32;
    let count = dv.getUint16(0, true);
    if (count > maxAnim) {
      count = maxAnim;
    }
    if (bytes.length < (2 + (maxAnim * 2) + (maxAnim * 2) + maxAnim + maxAnim)) {
      return null;
    }
    const entries: U6AnimDataEntryRuntime[] = [];
    const offBase = 2;
    const offStart = offBase + (maxAnim * 2);
    const offMask = offStart + (maxAnim * 2);
    const offShift = offMask + maxAnim;
    for (let i = 0; i < count; i += 1) {
      entries.push({
        baseTile: dv.getUint16(offBase + (i * 2), true),
        startFrame: dv.getUint16(offStart + (i * 2), true),
        mask: bytes[offMask + i],
        shift: bytes[offShift + i] & 0x07
      });
    }
    return new U6AnimDataRuntime(entries);
  }
}

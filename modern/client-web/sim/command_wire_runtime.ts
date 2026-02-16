export function packCommandRuntime(
  tick: number,
  type: number,
  arg0: number,
  arg1: number,
  wireSize = 16
): Uint8Array {
  const b = new Uint8Array(wireSize);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, tick, true);
  dv.setUint8(4, type);
  dv.setInt32(8, arg0, true);
  dv.setInt32(12, arg1, true);
  return b;
}

export function unpackCommandRuntime(bytes: Uint8Array): {
  tick: number;
  type: number;
  arg0: number;
  arg1: number;
} {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    tick: dv.getUint32(0, true),
    type: dv.getUint8(4),
    arg0: dv.getInt32(8, true),
    arg1: dv.getInt32(12, true)
  };
}

export type RuntimeTileflagSlices = {
  terrainType: Uint8Array | null;
  tileFlags: Uint8Array | null;
  typeWeights: Uint8Array | null;
  tileFlags2: Uint8Array | null;
};

export function decodeRuntimeTileflagSlicesRuntime(responseOk: unknown, buffer: ArrayBuffer): RuntimeTileflagSlices {
  if (!responseOk) {
    return emptyRuntimeTileflagSlices();
  }

  if (buffer.byteLength >= 0x1c00) {
    return {
      terrainType: new Uint8Array(buffer.slice(0, 0x800)),
      tileFlags: new Uint8Array(buffer.slice(0x800, 0x1000)),
      // Legacy tileflag layout: terrain(0x800), flag1(0x800), typeWeight(0x400), flag2/D_B3EF(0x800).
      typeWeights: new Uint8Array(buffer.slice(0x1000, 0x1400)),
      tileFlags2: new Uint8Array(buffer.slice(0x1400, 0x1c00))
    };
  }

  if (buffer.byteLength >= 0x1800) {
    return {
      terrainType: new Uint8Array(buffer.slice(0, 0x800)),
      tileFlags: new Uint8Array(buffer.slice(0x800, 0x1000)),
      typeWeights: null,
      tileFlags2: new Uint8Array(buffer.slice(0x1000, 0x1800))
    };
  }

  if (buffer.byteLength >= 0x1000) {
    return {
      terrainType: new Uint8Array(buffer.slice(0, 0x800)),
      tileFlags: new Uint8Array(buffer.slice(0x800, 0x1000)),
      typeWeights: null,
      tileFlags2: null
    };
  }

  if (buffer.byteLength >= 0x800) {
    return {
      terrainType: new Uint8Array(buffer.slice(0, 0x800)),
      tileFlags: new Uint8Array(buffer.slice(0, 0x800)),
      typeWeights: null,
      tileFlags2: null
    };
  }

  return emptyRuntimeTileflagSlices();
}

function emptyRuntimeTileflagSlices(): RuntimeTileflagSlices {
  return {
    terrainType: null,
    tileFlags: null,
    typeWeights: null,
    tileFlags2: null
  };
}

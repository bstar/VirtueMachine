import assert from "node:assert/strict";
import {
  fetchObjectBaselineVersionRuntime,
  loadObjectBaselineFromPathRuntime,
  loadPristineObjectBaselineRuntime,
  type ObjectBaselineFetchRuntime
} from "../sim/object_baseline_runtime.ts";
import { objectLayerAnchorKeyRuntime } from "../sim/object_layer_runtime.ts";

function writeU16LE(bytes: Uint8Array, off: number, value: number): void {
  bytes[off] = value & 0xff;
  bytes[off + 1] = (value >> 8) & 0xff;
}

function encodePackedCoord(x: number, y: number, z: number): [number, number, number] {
  return [
    x & 0xff,
    ((x >> 8) & 0x03) | ((y & 0x3f) << 2),
    ((y >> 6) & 0x0f) | ((z & 0x0f) << 4)
  ];
}

function writeObjRecord(bytes: Uint8Array, index: number, args: {
  frame?: number;
  status: number;
  type: number;
  x?: number;
  y?: number;
  z?: number;
}): void {
  const off = 2 + (index * 8);
  bytes[off] = args.status & 0xff;
  const [raw0, raw1, raw2] = encodePackedCoord(args.x ?? 0, args.y ?? 0, args.z ?? 0);
  bytes[off + 1] = raw0;
  bytes[off + 2] = raw1;
  bytes[off + 3] = raw2;
  writeU16LE(bytes, off + 4, ((args.frame ?? 0) << 10) | (args.type & 0x3ff));
}

function arrayBufferFor(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const baseTiles = new Uint16Array(0x400);
baseTiles[0x080] = 0x400;
baseTiles[0x153] = 0x500;

const objblk = new Uint8Array(2 + 8);
writeU16LE(objblk, 0, 1);
writeObjRecord(objblk, 0, { status: 0, type: 0x080, x: 5, y: 6, z: 0 });

const objlist = new Uint8Array(0x0900);
writeU16LE(objlist, 0x0400 + (4 * 2), 0x153);
{
  const [raw0, raw1, raw2] = encodePackedCoord(12, 13, 0);
  objlist[0x0100 + (4 * 3)] = raw0;
  objlist[0x0100 + (4 * 3) + 1] = raw1;
  objlist[0x0100 + (4 * 3) + 2] = raw2;
}

function makeFetch(failingPrefix = "bad"): { fetchImpl: ObjectBaselineFetchRuntime; requested: string[] } {
  const requested: string[] = [];
  const fetchImpl: ObjectBaselineFetchRuntime = async (assetPath) => {
    requested.push(assetPath);
    if (assetPath.startsWith(failingPrefix)) {
      return { ok: false, arrayBuffer: async () => new ArrayBuffer(0), text: async () => "" };
    }
    if (assetPath.endsWith("/objlist")) {
      return { ok: true, arrayBuffer: async () => arrayBufferFor(objlist), text: async () => "" };
    }
    if (/\/objblk[a-h][a-h]$/.test(assetPath)) {
      return { ok: true, arrayBuffer: async () => arrayBufferFor(objblk), text: async () => "" };
    }
    if (assetPath.endsWith(".baseline_version")) {
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0), text: async () => " v1\n" };
    }
    return { ok: false, arrayBuffer: async () => new ArrayBuffer(0), text: async () => "" };
  };
  return { fetchImpl, requested };
}

{
  const { fetchImpl } = makeFetch();
  assert.equal(await fetchObjectBaselineVersionRuntime("/assets/.baseline_version", fetchImpl), "v1");
}

{
  const { fetchImpl } = makeFetch();
  const loaded = await loadObjectBaselineFromPathRuntime({
    baseTiles,
    fetchImpl,
    objectPath: "good"
  });
  assert.equal(loaded.objectPath, "good");
  assert.equal(loaded.objectLayer.filesLoaded, 64);
  assert.equal(loaded.objectLayer.totalLoaded, 64);
  assert.equal(loaded.entityLayer.totalLoaded, 1);
}

{
  const { fetchImpl, requested } = makeFetch();
  const loaded = await loadPristineObjectBaselineRuntime({
    baseTiles,
    fetchImpl,
    paths: ["bad", "good"]
  });
  assert.equal(loaded.objectPath, "good");
  assert.equal(requested.some((assetPath) => assetPath.startsWith("bad/objblk")), true);
  assert.equal(requested.some((assetPath) => assetPath.startsWith("good/objblk")), true);
}

{
  const { fetchImpl } = makeFetch();
  const removed = await loadObjectBaselineFromPathRuntime({
    baseTiles,
    fetchImpl,
    isObjectRemoved: (obj) => objectLayerAnchorKeyRuntime(obj) === "5,6,0,0,128",
    objectPath: "good"
  });
  assert.deepEqual(removed.objectLayer.objectsAt(5, 6, 0), []);
}

await assert.rejects(
  () => loadObjectBaselineFromPathRuntime({
    baseTiles: new Uint16Array(4),
    fetchImpl: makeFetch().fetchImpl,
    objectPath: "good"
  }),
  /invalid base tile table/
);

console.log("object_baseline_runtime_test: ok");

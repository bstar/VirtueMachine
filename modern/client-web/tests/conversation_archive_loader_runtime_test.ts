import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  conversationArchiveCandidatePathsRuntime,
  conversationArchiveHasRecoverableCanonicalTripletRuntime,
  fetchConversationArchiveAWithValidationRuntime,
  fetchRuntimeAssetWithFallbackRuntime,
  looksLikeConversationArchiveRuntime,
  validateConversationArchiveARuntime,
  type RuntimeAssetFetch
} from "../conversation/archive_loader_runtime.ts";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const RUNTIME_DIR = path.join(ROOT, "assets", "runtime");

function arrayBufferFor(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const paths = conversationArchiveCandidatePathsRuntime("converse.a");
assert.equal(paths.includes("../assets/runtime/converse.a"), true);
assert.equal(new Set(paths).size, paths.length);
assert.deepEqual(conversationArchiveCandidatePathsRuntime(""), []);

const converseA = new Uint8Array(fs.readFileSync(path.join(RUNTIME_DIR, "converse.a")));
assert.equal(looksLikeConversationArchiveRuntime(converseA, 8), true);
assert.equal(validateConversationArchiveARuntime(converseA), true);
assert.equal(conversationArchiveHasRecoverableCanonicalTripletRuntime(converseA), true);
assert.equal(looksLikeConversationArchiveRuntime(new Uint8Array(32), 8), false);
assert.equal(validateConversationArchiveARuntime(new Uint8Array(512)), false);

{
  const requested: string[] = [];
  const fetchImpl: RuntimeAssetFetch = async (assetPath) => {
    requested.push(assetPath);
    if (assetPath === "missing") {
      return { ok: false, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    return { ok: true, arrayBuffer: async () => arrayBufferFor(Uint8Array.from([1, 2, 3, 4])) };
  };
  const out = await fetchRuntimeAssetWithFallbackRuntime(["", "missing", "ok"], 3, fetchImpl);
  assert.deepEqual(requested, ["missing", "ok"]);
  assert.deepEqual(Array.from(out || []), [1, 2, 3, 4]);
}

{
  const fetchImpl: RuntimeAssetFetch = async (assetPath) => ({
    ok: assetPath === "archive",
    arrayBuffer: async () => arrayBufferFor(converseA)
  });
  const out = await fetchConversationArchiveAWithValidationRuntime(["bad", "archive"], 256, fetchImpl);
  assert.equal(out?.length, converseA.length);
}

console.log("conversation_archive_loader_runtime_test: ok");

import {
  isLikelyValidConversationScriptRuntime,
  loadLegacyConversationScriptFromArchiveRuntime,
  parseConversationHeaderAndDescRuntime
} from "./archive_runtime.ts";

type RuntimeAssetFetchResponse = {
  ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type RuntimeAssetFetch = (
  path: string,
  init?: RequestInit
) => Promise<RuntimeAssetFetchResponse>;

function normalizedArchiveTextRuntime(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function runtimeAssetFetchRuntime(): RuntimeAssetFetch | null {
  return typeof fetch === "function" ? fetch : null;
}

export async function fetchRuntimeAssetWithFallbackRuntime(
  paths: ReadonlyArray<unknown>,
  minBytes = 1,
  fetchImpl: RuntimeAssetFetch | null | undefined = runtimeAssetFetchRuntime()
): Promise<Uint8Array | null> {
  if (typeof fetchImpl !== "function") {
    return null;
  }
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetchImpl(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength >= (Number(minBytes) | 0)) {
        return new Uint8Array(buf);
      }
    } catch (_err) {
      /* ignore and continue fallback chain */
    }
  }
  return null;
}

export function looksLikeConversationArchiveRuntime(bytes: unknown, minIndexCount = 8): boolean {
  if (!(bytes instanceof Uint8Array) || bytes.length < 512) {
    return false;
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.max(4, Number(minIndexCount) | 0);
  let validCount = 0;
  for (let i = 0; i < count; i += 1) {
    const offPtr = i << 2;
    if ((offPtr + 4) > bytes.length) {
      return false;
    }
    const offset = dv.getUint32(offPtr, true) >>> 0;
    if (offset && (offset + 4) <= bytes.length) {
      validCount += 1;
    }
  }
  return validCount >= Math.max(2, Math.floor(count / 4));
}

export function conversationArchiveHasRecoverableCanonicalTripletRuntime(archive: unknown): boolean {
  if (!(archive instanceof Uint8Array)) {
    return false;
  }
  const triplet = [2, 5, 6];
  for (const idx of triplet) {
    const script = loadLegacyConversationScriptFromArchiveRuntime(archive, idx);
    const header = parseConversationHeaderAndDescRuntime(script);
    if (!isLikelyValidConversationScriptRuntime(script, header)) {
      return false;
    }
  }
  return true;
}

export function validateConversationArchiveARuntime(archive: Uint8Array): boolean {
  const checks = [
    { index: 5, name: "lord british", descTokens: ["ruler", "britannia"] },
    { index: 6, name: "nystul", descTokens: ["concerned", "mage"] },
    { index: 2, name: "dupre", descTokens: ["handsome", "man"] }
  ];
  for (const check of checks) {
    const script = loadLegacyConversationScriptFromArchiveRuntime(archive, check.index);
    const header = parseConversationHeaderAndDescRuntime(script);
    if (!isLikelyValidConversationScriptRuntime(script, header)) {
      return false;
    }
    const gotName = normalizedArchiveTextRuntime(header?.name || "");
    if (!gotName.includes(check.name)) {
      return false;
    }
    const gotDesc = normalizedArchiveTextRuntime(header?.desc || "");
    for (const tok of check.descTokens) {
      if (!gotDesc.includes(tok)) {
        return false;
      }
    }
  }
  return true;
}

export async function fetchConversationArchiveAWithValidationRuntime(
  paths: ReadonlyArray<unknown>,
  minBytes = 256,
  fetchImpl: RuntimeAssetFetch | null | undefined = runtimeAssetFetchRuntime()
): Promise<Uint8Array | null> {
  if (typeof fetchImpl !== "function") {
    return null;
  }
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetchImpl(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < (Number(minBytes) | 0)) {
        continue;
      }
      const bytes = new Uint8Array(buf);
      if (validateConversationArchiveARuntime(bytes)) {
        return bytes;
      }
    } catch (_err) {
      /* keep trying fallback paths */
    }
  }
  return null;
}

export async function fetchConversationArchiveAnyRuntime(
  paths: ReadonlyArray<unknown>,
  minBytes = 256,
  fetchImpl: RuntimeAssetFetch | null | undefined = runtimeAssetFetchRuntime()
): Promise<Uint8Array | null> {
  if (typeof fetchImpl !== "function") {
    return null;
  }
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetchImpl(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < (Number(minBytes) | 0)) continue;
      const bytes = new Uint8Array(buf);
      if (
        looksLikeConversationArchiveRuntime(bytes, 8)
        && conversationArchiveHasRecoverableCanonicalTripletRuntime(bytes)
      ) {
        return bytes;
      }
    } catch (_err) {
      /* continue */
    }
  }
  return null;
}

export function conversationArchiveCandidatePathsRuntime(name: unknown): string[] {
  const file = String(name || "").trim();
  if (!file) return [];
  const base = [
    `../assets/runtime/${file}`,
    `./assets/runtime/${file}`,
    `assets/runtime/${file}`,
    `../../assets/runtime/${file}`,
    `../runtime/${file}`,
    `./runtime/${file}`,
    `/assets/runtime/${file}`,
    `/modern/assets/runtime/${file}`,
    `/modern/client-web/assets/runtime/${file}`,
    `/runtime/${file}`
  ];
  return Array.from(new Set(base));
}

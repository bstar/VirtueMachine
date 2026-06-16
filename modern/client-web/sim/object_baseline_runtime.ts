import { U6EntityLayerRuntime } from "./entity_layer_runtime.ts";
import {
  U6ObjectLayerRuntime,
  type U6ObjectEntryRuntime,
  type U6ObjectRemovedLookupRuntime
} from "./object_layer_runtime.ts";

export type ObjectBaselineFetchResponseRuntime = {
  ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text?(): Promise<string>;
};

export type ObjectBaselineFetchRuntime = (
  path: string,
  init?: RequestInit
) => Promise<ObjectBaselineFetchResponseRuntime>;

export type ObjectBaselineLoadResultRuntime = {
  entityLayer: U6EntityLayerRuntime;
  objectLayer: U6ObjectLayerRuntime;
  objectPath: string;
};

export type ObjectBaselineDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

function browserFetchRuntime(): ObjectBaselineFetchRuntime | null {
  return typeof fetch === "function" ? fetch : null;
}

export async function fetchObjectBaselineVersionRuntime(
  versionPath: string,
  fetchImpl: ObjectBaselineFetchRuntime | null | undefined = browserFetchRuntime()
): Promise<string> {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch unavailable for baseline version marker");
  }
  const res = await fetchImpl(versionPath, { cache: "no-store" });
  if (!res.ok || typeof res.text !== "function") {
    throw new Error(`missing baseline version marker (${versionPath})`);
  }
  return String(await res.text()).trim();
}

export async function loadObjectBaselineFromPathRuntime(
  args: {
    baseTiles: ArrayLike<number> | null | undefined;
    fetchImpl?: ObjectBaselineFetchRuntime | null;
    isObjectRemoved?: U6ObjectRemovedLookupRuntime;
    objectPath: string;
  }
): Promise<ObjectBaselineLoadResultRuntime> {
  const fetchImpl = args.fetchImpl || browserFetchRuntime();
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch unavailable for object baseline");
  }
  if (!args.baseTiles || args.baseTiles.length < 0x400) {
    throw new Error("invalid base tile table for object baseline");
  }
  const objectPath = String(args.objectPath || "").trim();
  const objectLayer = new U6ObjectLayerRuntime(
    args.baseTiles,
    args.isObjectRemoved || ((_obj: U6ObjectEntryRuntime) => false)
  );
  await objectLayer.loadOutdoor((name) => fetchImpl(`${objectPath}/${name}`, { cache: "no-store" }));
  const objListRes = await fetchImpl(`${objectPath}/objlist`, { cache: "no-store" });
  if (objectLayer.filesLoaded < 64 || !objListRes.ok) {
    throw new Error(`missing object baseline at ${objectPath}`);
  }
  const objListBuf = await objListRes.arrayBuffer();
  const entityLayer = new U6EntityLayerRuntime(args.baseTiles);
  if (objListBuf.byteLength >= 0x0900) {
    entityLayer.load(new Uint8Array(objListBuf));
  }
  return { objectLayer, entityLayer, objectPath };
}

export async function loadPristineObjectBaselineRuntime(
  args: {
    baseTiles: ArrayLike<number>;
    fetchImpl?: ObjectBaselineFetchRuntime | null;
    isObjectRemoved?: U6ObjectRemovedLookupRuntime;
    paths: ReadonlyArray<unknown>;
  }
): Promise<ObjectBaselineLoadResultRuntime> {
  let lastErr: unknown = null;
  for (const rawPath of Array.isArray(args.paths) ? args.paths : []) {
    const objectPath = String(rawPath || "").trim();
    if (!objectPath) {
      continue;
    }
    try {
      return await loadObjectBaselineFromPathRuntime({
        baseTiles: args.baseTiles,
        fetchImpl: args.fetchImpl,
        isObjectRemoved: args.isObjectRemoved,
        objectPath
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw (lastErr || new Error("no valid object baseline path"));
}

export function pristineBaselineReloadedDiagRuntime(version: unknown): ObjectBaselineDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Pristine baseline reloaded (version ${String(version || "unknown")}).`
  };
}

export function pristineBaselineReloadFailedDiagRuntime(reason: unknown): ObjectBaselineDiagRuntime {
  return {
    diagClass: "diag warn",
    diagText: `Pristine baseline reload failed: ${String(reason || "unknown error")}`
  };
}

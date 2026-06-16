"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_MASK
} = require("../common/u6_object_constants.ts");

type AssocBridgeObject = {
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  object_key?: unknown;
  status?: unknown;
};

type AssocBridgeKeyMap = {
  bridgeToKey: Map<string, string>;
  keyToBridge: Map<string, number>;
};

type AssocBridgeParsed = {
  assoc_chain: string[];
  blocked_by_key: number;
  chain_accessible: boolean;
  code: number;
  cycle_detected: boolean;
  missing_parent: boolean;
  parent_owned: boolean;
  root_anchor_key: number;
};

type AssocBridgeDiagnostics = {
  assoc_chain: string[];
  blocked_by: string;
  chain_accessible: boolean;
  root_anchor_key: string;
};

function coordUseOfStatus(status: unknown): number {
  return (Number(status) & OBJ_COORD_USE_MASK) >>> 0;
}

function assocBinPath(): string {
  if (process.env.VM_SIM_CORE_ASSOC_BIN) {
    return String(process.env.VM_SIM_CORE_ASSOC_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_assoc_chain_bridge");
}

function assocBatchBinPath(): string {
  if (process.env.VM_SIM_CORE_ASSOC_BATCH_BIN) {
    return String(process.env.VM_SIM_CORE_ASSOC_BATCH_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_assoc_chain_batch_bridge");
}

const ASSOC_REQUIRED = String(process.env.VM_SIM_CORE_ASSOC_REQUIRED || "on").trim().toLowerCase() !== "off";

function assertAssocBridgeReady(): string | null {
  const bin = assocBinPath();
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    return bin;
  } catch (_err) {
    if (ASSOC_REQUIRED) {
      throw new Error(
        `sim-core assoc-chain bridge binary is required but missing/unexecutable: ${bin}. `
        + "Build target `sim_core_assoc_chain_bridge` or set VM_SIM_CORE_ASSOC_BIN."
      );
    }
    return null;
  }
}

const ASSOC_BIN = assertAssocBridgeReady();
const ASSOC_BATCH_BIN = (() => {
  const bin = assocBatchBinPath();
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    return bin;
  } catch (_err) {
    if (ASSOC_REQUIRED) {
      throw new Error(
        `sim-core assoc-chain batch bridge binary is required but missing/unexecutable: ${bin}. `
        + "Build target `sim_core_assoc_chain_batch_bridge` or set VM_SIM_CORE_ASSOC_BATCH_BIN."
      );
    }
    return null;
  }
})();

function holderKindName(v: unknown): "none" | "npc" | "object" {
  const k = String(v || "").toLowerCase();
  if (k === "object" || k === "npc") {
    return k;
  }
  return "none";
}

function buildBridgeKeyMap(objects: unknown): AssocBridgeKeyMap {
  const keyToBridge = new Map<string, number>();
  const bridgeToKey = new Map<string, string>();
  let next = 1;
  for (const obj of Array.isArray(objects) ? objects as AssocBridgeObject[] : []) {
    const key = String(obj?.object_key || "").trim();
    if (!key || keyToBridge.has(key)) {
      continue;
    }
    keyToBridge.set(key, next);
    bridgeToKey.set(String(next), key);
    next += 1;
  }
  return { keyToBridge, bridgeToKey };
}

function bridgeKeyForObject(map: AssocBridgeKeyMap, obj: AssocBridgeObject | null | undefined): number {
  const key = String(obj?.object_key || "").trim();
  return key ? (Number(map?.keyToBridge?.get(key)) | 0) : 0;
}

function bridgeHolderKey(map: AssocBridgeKeyMap, obj: AssocBridgeObject | null | undefined): number {
  if (holderKindName(obj?.holder_kind) !== "object") {
    return 0;
  }
  const key = String(obj?.holder_key || obj?.holder_id || "").trim();
  return key ? (Number(map?.keyToBridge?.get(key)) | 0) : 0;
}

function publicKeyForBridge(map: AssocBridgeKeyMap, bridgeKey: unknown): string {
  const k = Number(bridgeKey) | 0;
  if (k === 0) {
    return "";
  }
  return String(map?.bridgeToKey?.get(String(k)) || k);
}

function objectNodeArg(obj: AssocBridgeObject, map: AssocBridgeKeyMap): string {
  const key = bridgeKeyForObject(map, obj);
  const status = Number(obj?.status) & 0xff;
  const holderKind = holderKindName(obj?.holder_kind);
  const holderKey = bridgeHolderKey(map, obj);
  return `${key}:${status}:${holderKind}:${holderKey}`;
}

function parseBridgeOutput(stdout: unknown, map: AssocBridgeKeyMap): AssocBridgeParsed | null {
  const text = String(stdout || "").trim();
  const re = /^code=(-?\d+)\s+root_anchor_key=(-?\d+)\s+blocked_by_key=(-?\d+)\s+chain_accessible=(\d+)\s+cycle_detected=(\d+)\s+missing_parent=(\d+)\s+parent_owned=(\d+)\s+chain=(.*)$/i;
  const m = re.exec(text);
  if (!m) {
    return null;
  }
  const rawChain = String(m[8] || "").trim();
  const chain = rawChain
    ? rawChain.split(";").map((v) => publicKeyForBridge(map, Number.parseInt(v, 10))).filter(Boolean)
    : [];
  return {
    code: Number(m[1]) | 0,
    root_anchor_key: Number(m[2]) | 0,
    blocked_by_key: Number(m[3]) | 0,
    chain_accessible: Number(m[4]) !== 0,
    cycle_detected: Number(m[5]) !== 0,
    missing_parent: Number(m[6]) !== 0,
    parent_owned: Number(m[7]) !== 0,
    assoc_chain: chain
  };
}

function blockedByLabel(parsed: AssocBridgeParsed | null | undefined, map: AssocBridgeKeyMap): string {
  if (!parsed || parsed.chain_accessible) {
    return "";
  }
  if (parsed.cycle_detected) {
    return `cycle:${publicKeyForBridge(map, parsed.blocked_by_key)}`;
  }
  if (parsed.missing_parent) {
    if ((parsed.blocked_by_key | 0) !== 0) {
      return `missing-parent:${publicKeyForBridge(map, parsed.blocked_by_key)}`;
    }
    return "missing-parent-ref";
  }
  if (parsed.parent_owned) {
    return `parent-owned:${publicKeyForBridge(map, parsed.blocked_by_key)}`;
  }
  return "max-depth";
}

function parseBatchBridgeOutput(stdout: unknown, map: AssocBridgeKeyMap): Map<string, AssocBridgeParsed> | null {
  const lines = String(stdout || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const byTarget = new Map<string, AssocBridgeParsed>();
  const re = /^target=(-?\d+)\s+code=(-?\d+)\s+root_anchor_key=(-?\d+)\s+blocked_by_key=(-?\d+)\s+chain_accessible=(\d+)\s+cycle_detected=(\d+)\s+missing_parent=(\d+)\s+parent_owned=(\d+)\s+chain=(.*)$/i;
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) {
      return null;
    }
    const target = Number(m[1]) | 0;
    const rawChain = String(m[9] || "").trim();
    const chain = rawChain
      ? rawChain.split(";").map((v) => publicKeyForBridge(map, Number.parseInt(v, 10))).filter(Boolean)
      : [];
    byTarget.set(publicKeyForBridge(map, target), {
      code: Number(m[2]) | 0,
      root_anchor_key: Number(m[3]) | 0,
      blocked_by_key: Number(m[4]) | 0,
      chain_accessible: Number(m[5]) !== 0,
      cycle_detected: Number(m[6]) !== 0,
      missing_parent: Number(m[7]) !== 0,
      parent_owned: Number(m[8]) !== 0,
      assoc_chain: chain
    });
  }
  return byTarget;
}

function diagnosticsFromParsed(
  targetObject: AssocBridgeObject,
  parsed: AssocBridgeParsed | null | undefined,
  map: AssocBridgeKeyMap
): AssocBridgeDiagnostics {
  if (!parsed || (parsed.code | 0) !== 0) {
    return {
      assoc_chain: [],
      root_anchor_key: "",
      blocked_by: "invalid-object",
      chain_accessible: false
    };
  }
  let chainAccessible = parsed.chain_accessible;
  const use = coordUseOfStatus(targetObject.status);
  if (use !== OBJ_COORD_USE_CONTAINED) {
    chainAccessible = use === OBJ_COORD_USE_LOCXYZ;
  }
  return {
    assoc_chain: parsed.assoc_chain,
    root_anchor_key: parsed.root_anchor_key ? publicKeyForBridge(map, parsed.root_anchor_key) : String(targetObject.object_key || ""),
    blocked_by: blockedByLabel(parsed, map),
    chain_accessible: chainAccessible
  };
}

function analyzeContainmentChainViaSimCore(objects: unknown, targetObject: AssocBridgeObject | null | undefined) {
  const bridgeMap = buildBridgeKeyMap(objects);
  const targetKey = bridgeKeyForObject(bridgeMap, targetObject);
  if (!targetObject || targetKey === 0) {
    return { ok: false, code: "invalid-object", message: "invalid target object" };
  }
  if (!Array.isArray(objects) || objects.length === 0) {
    return { ok: false, code: "empty-world-objects", message: "no world objects provided for assoc-chain analysis" };
  }
  if (!ASSOC_BIN) {
    return { ok: false, code: "assoc_bridge_unavailable", message: "sim-core assoc-chain bridge unavailable" };
  }

  const objectList = Array.isArray(objects) ? objects as AssocBridgeObject[] : [];
  const args = [String(targetKey), ...objectList.map((obj) => objectNodeArg(obj, bridgeMap))];
  const proc = spawnSync(ASSOC_BIN, args, { encoding: "utf8", timeout: 4000, maxBuffer: 8 * 1024 * 1024 });
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "assoc_bridge_failed", message: "sim-core assoc-chain bridge execution failed" };
  }
  const parsed = parseBridgeOutput(proc.stdout, bridgeMap);
  if (!parsed) {
    return { ok: false, code: "assoc_bridge_parse_failed", message: "sim-core assoc-chain bridge emitted invalid output" };
  }
  if ((parsed.code | 0) !== 0) {
    return { ok: true, value: diagnosticsFromParsed(targetObject, parsed, bridgeMap) };
  }
  return { ok: true, value: diagnosticsFromParsed(targetObject, parsed, bridgeMap) };
}

function analyzeContainmentChainsBatchViaSimCore(objects: unknown, targetObjects: unknown) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return { ok: false, code: "empty-world-objects", message: "no world objects provided for assoc-chain analysis" };
  }
  if (!Array.isArray(targetObjects) || targetObjects.length === 0) {
    return { ok: true, byKey: new Map() };
  }
  if (!ASSOC_BATCH_BIN) {
    return { ok: false, code: "assoc_batch_bridge_unavailable", message: "sim-core assoc-chain batch bridge unavailable" };
  }
  const bridgeMap = buildBridgeKeyMap(objects);
  const targetList = targetObjects as AssocBridgeObject[];
  const objectList = objects as AssocBridgeObject[];
  const targetKeys = targetList
    .map((o) => bridgeKeyForObject(bridgeMap, o))
    .filter((k) => k !== 0);
  if (targetKeys.length === 0) {
    return { ok: false, code: "invalid-targets", message: "no valid target keys" };
  }
  const args = [targetKeys.join(","), ...objectList.map((obj) => objectNodeArg(obj, bridgeMap))];
  const proc = spawnSync(ASSOC_BATCH_BIN, args, { encoding: "utf8", timeout: 8000, maxBuffer: 16 * 1024 * 1024 });
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "assoc_batch_bridge_failed", message: "sim-core assoc-chain batch bridge execution failed" };
  }
  const parsedMap = parseBatchBridgeOutput(proc.stdout, bridgeMap);
  if (!parsedMap) {
    return { ok: false, code: "assoc_batch_bridge_parse_failed", message: "sim-core assoc-chain batch bridge emitted invalid output" };
  }
  const byKey = new Map<string, AssocBridgeDiagnostics>();
  for (const obj of targetList) {
    const key = String(obj?.object_key || "");
    if (!key) continue;
    byKey.set(key, diagnosticsFromParsed(obj, parsedMap.get(key), bridgeMap));
  }
  return { ok: true, byKey };
}

module.exports = {
  analyzeContainmentChainViaSimCore,
  analyzeContainmentChainsBatchViaSimCore
};

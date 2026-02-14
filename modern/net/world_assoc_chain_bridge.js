"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const OBJ_COORD_USE_LOCXYZ = 0x00;
const OBJ_COORD_USE_CONTAINED = 0x08;

function coordUseOfStatus(status) {
  return (Number(status) & 0x18) >>> 0;
}

function assocBinPath() {
  if (process.env.VM_SIM_CORE_ASSOC_BIN) {
    return String(process.env.VM_SIM_CORE_ASSOC_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_assoc_chain_bridge");
}

function assocBatchBinPath() {
  if (process.env.VM_SIM_CORE_ASSOC_BATCH_BIN) {
    return String(process.env.VM_SIM_CORE_ASSOC_BATCH_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_assoc_chain_batch_bridge");
}

const ASSOC_REQUIRED = String(process.env.VM_SIM_CORE_ASSOC_REQUIRED || "on").trim().toLowerCase() !== "off";

function assertAssocBridgeReady() {
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

function holderKindName(v) {
  const k = String(v || "").toLowerCase();
  if (k === "object" || k === "npc") {
    return k;
  }
  return "none";
}

function objectNodeArg(obj) {
  const key = Number.parseInt(String(obj?.object_key || "0"), 10) | 0;
  const status = Number(obj?.status) & 0xff;
  const holderKind = holderKindName(obj?.holder_kind);
  const holderKey = Number.parseInt(String(obj?.holder_key || obj?.holder_id || "0"), 10) | 0;
  return `${key}:${status}:${holderKind}:${holderKey}`;
}

function parseBridgeOutput(stdout) {
  const text = String(stdout || "").trim();
  const re = /^code=(-?\d+)\s+root_anchor_key=(-?\d+)\s+blocked_by_key=(-?\d+)\s+chain_accessible=(\d+)\s+cycle_detected=(\d+)\s+missing_parent=(\d+)\s+parent_owned=(\d+)\s+chain=(.*)$/i;
  const m = re.exec(text);
  if (!m) {
    return null;
  }
  const rawChain = String(m[8] || "").trim();
  const chain = rawChain
    ? rawChain.split(";").map((v) => String(Number.parseInt(v, 10))).filter((v) => v !== "NaN" && v !== "0")
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

function blockedByLabel(parsed) {
  if (!parsed || parsed.chain_accessible) {
    return "";
  }
  if (parsed.cycle_detected) {
    return `cycle:${parsed.blocked_by_key}`;
  }
  if (parsed.missing_parent) {
    if ((parsed.blocked_by_key | 0) !== 0) {
      return `missing-parent:${parsed.blocked_by_key}`;
    }
    return "missing-parent-ref";
  }
  if (parsed.parent_owned) {
    return `parent-owned:${parsed.blocked_by_key}`;
  }
  return "max-depth";
}

function parseBatchBridgeOutput(stdout) {
  const lines = String(stdout || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const byTarget = new Map();
  const re = /^target=(-?\d+)\s+code=(-?\d+)\s+root_anchor_key=(-?\d+)\s+blocked_by_key=(-?\d+)\s+chain_accessible=(\d+)\s+cycle_detected=(\d+)\s+missing_parent=(\d+)\s+parent_owned=(\d+)\s+chain=(.*)$/i;
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) {
      return null;
    }
    const target = Number(m[1]) | 0;
    const rawChain = String(m[9] || "").trim();
    const chain = rawChain
      ? rawChain.split(";").map((v) => String(Number.parseInt(v, 10))).filter((v) => v !== "NaN" && v !== "0")
      : [];
    byTarget.set(String(target), {
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

function diagnosticsFromParsed(targetObject, parsed) {
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
    root_anchor_key: parsed.root_anchor_key ? String(parsed.root_anchor_key) : String(targetObject.object_key || ""),
    blocked_by: blockedByLabel(parsed),
    chain_accessible: chainAccessible
  };
}

function analyzeContainmentChainViaSimCore(objects, targetObject) {
  const targetKey = Number.parseInt(String(targetObject?.object_key || "0"), 10) | 0;
  if (!targetObject || targetKey === 0) {
    return { ok: false, code: "invalid-object", message: "invalid target object" };
  }
  if (!Array.isArray(objects) || objects.length === 0) {
    return { ok: false, code: "empty-world-objects", message: "no world objects provided for assoc-chain analysis" };
  }
  if (!ASSOC_BIN) {
    return { ok: false, code: "assoc_bridge_unavailable", message: "sim-core assoc-chain bridge unavailable" };
  }

  const args = [String(targetKey), ...objects.map((obj) => objectNodeArg(obj))];
  const proc = spawnSync(ASSOC_BIN, args, { encoding: "utf8", timeout: 4000, maxBuffer: 8 * 1024 * 1024 });
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "assoc_bridge_failed", message: "sim-core assoc-chain bridge execution failed" };
  }
  const parsed = parseBridgeOutput(proc.stdout);
  if (!parsed) {
    return { ok: false, code: "assoc_bridge_parse_failed", message: "sim-core assoc-chain bridge emitted invalid output" };
  }
  if ((parsed.code | 0) !== 0) {
    return { ok: true, value: diagnosticsFromParsed(targetObject, parsed) };
  }
  return { ok: true, value: diagnosticsFromParsed(targetObject, parsed) };
}

function analyzeContainmentChainsBatchViaSimCore(objects, targetObjects) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return { ok: false, code: "empty-world-objects", message: "no world objects provided for assoc-chain analysis" };
  }
  if (!Array.isArray(targetObjects) || targetObjects.length === 0) {
    return { ok: true, byKey: new Map() };
  }
  if (!ASSOC_BATCH_BIN) {
    return { ok: false, code: "assoc_batch_bridge_unavailable", message: "sim-core assoc-chain batch bridge unavailable" };
  }
  const targetKeys = targetObjects
    .map((o) => Number.parseInt(String(o?.object_key || "0"), 10) | 0)
    .filter((k) => k !== 0);
  if (targetKeys.length === 0) {
    return { ok: false, code: "invalid-targets", message: "no valid target keys" };
  }
  const args = [targetKeys.join(","), ...objects.map((obj) => objectNodeArg(obj))];
  const proc = spawnSync(ASSOC_BATCH_BIN, args, { encoding: "utf8", timeout: 8000, maxBuffer: 16 * 1024 * 1024 });
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "assoc_batch_bridge_failed", message: "sim-core assoc-chain batch bridge execution failed" };
  }
  const parsedMap = parseBatchBridgeOutput(proc.stdout);
  if (!parsedMap) {
    return { ok: false, code: "assoc_batch_bridge_parse_failed", message: "sim-core assoc-chain batch bridge emitted invalid output" };
  }
  const byKey = new Map();
  for (const obj of targetObjects) {
    const key = String(obj?.object_key || "");
    if (!key) continue;
    byKey.set(key, diagnosticsFromParsed(obj, parsedMap.get(key)));
  }
  return { ok: true, byKey };
}

module.exports = {
  analyzeContainmentChainViaSimCore,
  analyzeContainmentChainsBatchViaSimCore
};

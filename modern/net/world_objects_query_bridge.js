"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function queryBinPath() {
  if (process.env.VM_SIM_CORE_WORLD_QUERY_BIN) {
    return String(process.env.VM_SIM_CORE_WORLD_QUERY_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_world_objects_query_bridge");
}

const QUERY_REQUIRED = String(process.env.VM_SIM_CORE_WORLD_QUERY_REQUIRED || "on").trim().toLowerCase() !== "off";

function assertQueryBridgeReady() {
  const bin = queryBinPath();
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    return bin;
  } catch (_err) {
    if (QUERY_REQUIRED) {
      throw new Error(
        `sim-core world query bridge binary is required but missing/unexecutable: ${bin}. `
        + "Build target `sim_core_world_objects_query_bridge` or set VM_SIM_CORE_WORLD_QUERY_BIN."
      );
    }
    return null;
  }
}

const QUERY_BIN = assertQueryBridgeReady();

function objectArg(obj, tileFlags) {
  const key = String(obj?.object_key || "");
  const status = Number(obj?.status) & 0xff;
  const tileId = Number(obj?.tile_id) & 0xffff;
  const tf = tileFlags ? (Number(tileFlags[tileId & 0x07ff]) & 0xff) : 0;
  return [
    key,
    Number(obj?.x) | 0,
    Number(obj?.y) | 0,
    Number(obj?.z) | 0,
    status,
    tileId,
    Number(obj?.source_area) | 0,
    Number(obj?.source_index) | 0,
    tf
  ].join(":");
}

function parseKeysOutput(stdout) {
  const text = String(stdout || "").trim();
  const m = /^keys=(.*)$/i.exec(text);
  if (!m) {
    return null;
  }
  const csv = String(m[1] || "").trim();
  if (!csv) {
    return [];
  }
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

function selectWorldObjectsViaSimCore(input) {
  const objects = Array.isArray(input?.objects) ? input.objects : [];
  const tileFlags = input?.tileFlags || null;
  if (!QUERY_BIN) {
    return { ok: false, code: "world_query_bridge_unavailable", message: "sim-core world query bridge unavailable" };
  }
  const args = [
    input?.hasX ? "1" : "0",
    String(Number(input?.x) | 0),
    input?.hasY ? "1" : "0",
    String(Number(input?.y) | 0),
    input?.hasZ ? "1" : "0",
    String(Number(input?.z) | 0),
    String(Number(input?.radius) | 0),
    String(input?.projection === "footprint" ? "footprint" : "anchor"),
    String(Math.max(1, Number(input?.limit) | 0)),
    ...objects.map((obj) => objectArg(obj, tileFlags))
  ];
  const proc = spawnSync(QUERY_BIN, args, { encoding: "utf8", timeout: 8000, maxBuffer: 16 * 1024 * 1024 });
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "world_query_bridge_failed", message: "sim-core world query bridge execution failed" };
  }
  const keys = parseKeysOutput(proc.stdout);
  if (!keys) {
    return { ok: false, code: "world_query_bridge_parse_failed", message: "sim-core world query bridge emitted invalid output" };
  }
  return { ok: true, keys };
}

module.exports = {
  selectWorldObjectsViaSimCore
};

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const OBJ_COORD_USE_LOCXYZ = 0x00;
const OBJ_COORD_USE_CONTAINED = 0x08;
const OBJ_COORD_USE_INVEN = 0x10;
const OBJ_COORD_USE_EQUIP = 0x18;

function coordUseOfStatus(status) {
  return (Number(status) & 0x18) >>> 0;
}

function holderKindCode(name) {
  const v = String(name || "").toLowerCase();
  if (v === "object") return 1;
  if (v === "npc") return 2;
  return 0;
}

function holderKindName(code) {
  const k = Number(code) | 0;
  if (k === 1) return "object";
  if (k === 2) return "npc";
  return "none";
}

function bridgeBinPath() {
  if (process.env.VM_SIM_CORE_INTERACT_BIN) {
    return String(process.env.VM_SIM_CORE_INTERACT_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_world_interact_bridge");
}

const BRIDGE_REQUIRED = String(process.env.VM_SIM_CORE_INTERACT_REQUIRED || "on").trim().toLowerCase() !== "off";

function assertBridgeReady() {
  const bin = bridgeBinPath();
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    return bin;
  } catch (_err) {
    if (BRIDGE_REQUIRED) {
      throw new Error(
        `sim-core interaction bridge binary is required but missing/unexecutable: ${bin}. `
        + "Build target `sim_core_world_interact_bridge` or set VM_SIM_CORE_INTERACT_BIN."
      );
    }
    return null;
  }
}

const BRIDGE_BIN = assertBridgeReady();

function parseBridgeOutput(stdout) {
  const text = String(stdout || "").trim();
  const m = /^code=(-?\d+)\s+status=(\d+)\s+holder_kind=(none|object|npc)$/i.exec(text);
  if (!m) {
    return null;
  }
  return {
    code: Number(m[1]) | 0,
    status: Number(m[2]) & 0xff,
    holder_kind: String(m[3]).toLowerCase()
  };
}

function mapBridgeCode(code) {
  if ((code | 0) === -1) return { http: 400, code: "bad_verb", message: "verb must be one of: take, drop, put, equip" };
  if ((code | 0) === -3) return { http: 404, code: "container_not_found", message: "container is required for put" };
  if ((code | 0) === -2) return { http: 409, code: "interaction_blocked", message: "interaction blocked by canonical rules" };
  return { http: 500, code: "interaction_failed", message: "canonical interaction bridge failed" };
}

function invokeSimCoreBridge(input) {
  const verb = String(input?.verb || "").trim().toLowerCase();
  const target = input?.target || {};
  const actorId = String(input?.actorId || "");
  const ownerMatches = String(target.holder_kind || "") === "npc" && String(target.holder_id || "") === actorId ? 1 : 0;
  const hasContainer = input?.container ? 1 : 0;
  if (!BRIDGE_BIN) {
    return { ok: false, code: "interaction_bridge_unavailable", message: "sim-core interaction bridge unavailable", http: 500 };
  }

  const proc = spawnSync(
    BRIDGE_BIN,
    [
      verb,
      String(Number(target.status) & 0xff),
      String(String(target.holder_kind || "none").toLowerCase()),
      String(ownerMatches),
      String(hasContainer)
    ],
    { encoding: "utf8", timeout: 3000 }
  );
  if (proc.error || (proc.status | 0) !== 0) {
    return { ok: false, code: "interaction_bridge_failed", message: "sim-core interaction bridge execution failed", http: 500 };
  }
  const parsed = parseBridgeOutput(proc.stdout);
  if (!parsed) {
    return { ok: false, code: "interaction_bridge_failed", message: "sim-core interaction bridge emitted invalid output", http: 500 };
  }
  return { ok: true, parsed };
}

function applyCanonicalWorldInteractionCommand(input) {
  const verb = String(input?.verb || "").trim().toLowerCase();
  const target = input?.target || null;
  const container = input?.container || null;
  const actorId = String(input?.actorId || "").trim();
  const actorPos = input?.actorPos || { x: 0, y: 0, z: 0 };
  if (!target || !actorId) {
    return { ok: false, code: "bad_input", http: 400, message: "target and actor are required" };
  }

  const call = invokeSimCoreBridge(input);
  if (!call.ok) {
    return {
      ok: false,
      http: Number(call.http) || 500,
      code: String(call.code || "interaction_bridge_failed"),
      message: String(call.message || "sim-core interaction bridge failed")
    };
  }

  const canonical = call.parsed;
  if ((canonical.code | 0) !== 0) {
    return { ok: false, ...mapBridgeCode(canonical.code) };
  }

  const patch = {
    status: Number(canonical.status) & 0xff,
    holder_kind: String(canonical.holder_kind || "none")
  };

  if (verb === "take") {
    patch.holder_id = actorId;
    patch.holder_key = "";
    patch.x = actorPos.x | 0;
    patch.y = actorPos.y | 0;
    patch.z = actorPos.z | 0;
  } else if (verb === "drop") {
    patch.holder_id = "";
    patch.holder_key = "";
    patch.x = actorPos.x | 0;
    patch.y = actorPos.y | 0;
    patch.z = actorPos.z | 0;
  } else if (verb === "put") {
    patch.holder_id = String(container?.object_key || "");
    patch.holder_key = String(container?.object_key || "");
    patch.x = Number(container?.x) | 0;
    patch.y = Number(container?.y) | 0;
    patch.z = Number(container?.z) | 0;
  }

  return { ok: true, patch };
}

module.exports = {
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_INVEN,
  OBJ_COORD_USE_EQUIP,
  coordUseOfStatus,
  applyCanonicalWorldInteractionCommand,
  holderKindCode,
  holderKindName
};

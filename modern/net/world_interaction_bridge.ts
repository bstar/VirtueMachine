"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_INVEN,
  OBJ_COORD_USE_LOCXYZ,
  coordUseOfStatus
} = require("../common/u6_object_constants.ts");
const {
  normalizeWorldObjectInteractionVerbRuntime,
  worldObjectInteractionVerbListRuntime
} = require("../common/world_interaction_contract.ts");
import type { WorldObjectInteractionVerb } from "../common/world_interaction_contract.ts";

type InteractionHolderKind = "none" | "object" | "npc";

type InteractionBridgeTarget = {
  holder_id?: unknown;
  holder_kind?: unknown;
  object_key?: unknown;
  status?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type InteractionBridgePosition = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type InteractionBridgeInput = {
  actorId?: unknown;
  actorPos?: InteractionBridgePosition | null;
  chainAccessible?: unknown;
  container?: InteractionBridgeTarget | null;
  containerCycle?: unknown;
  target?: InteractionBridgeTarget | null;
  verb?: unknown;
};

type InteractionBridgeParsed = {
  code: number;
  holder_kind: InteractionHolderKind;
  status: number;
};

type InteractionBridgeFailure = {
  ok: false;
  code: string;
  http?: number;
  message: string;
};

type InteractionBridgeErrorDetails = {
  code: string;
  http: number;
  message: string;
};

type InteractionBridgeInvokeResult = InteractionBridgeFailure | {
  ok: true;
  parsed: InteractionBridgeParsed;
};

function holderKindCode(name: unknown): number {
  const v = String(name || "").toLowerCase();
  if (v === "object") return 1;
  if (v === "npc") return 2;
  return 0;
}

function holderKindName(code: unknown): InteractionHolderKind {
  const k = Number(code) | 0;
  if (k === 1) return "object";
  if (k === 2) return "npc";
  return "none";
}

function bridgeBinPath(): string {
  if (process.env.VM_SIM_CORE_INTERACT_BIN) {
    return String(process.env.VM_SIM_CORE_INTERACT_BIN);
  }
  return path.join(__dirname, "..", "..", "build", "modern", "sim-core", "sim_core_world_interact_bridge");
}

const BRIDGE_REQUIRED = String(process.env.VM_SIM_CORE_INTERACT_REQUIRED || "on").trim().toLowerCase() !== "off";

function assertBridgeReady(): string | null {
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

function parseBridgeOutput(stdout: unknown): InteractionBridgeParsed | null {
  const text = String(stdout || "").trim();
  const m = /^code=(-?\d+)\s+status=(\d+)\s+holder_kind=(none|object|npc)$/i.exec(text);
  if (!m) {
    return null;
  }
  return {
    code: Number(m[1]) | 0,
    status: Number(m[2]) & 0xff,
    holder_kind: holderKindName(holderKindCode(m[3]))
  };
}

function mapBridgeCode(code: unknown): InteractionBridgeErrorDetails {
  const n = Number(code) | 0;
  if (n === -1) {
    return {
      http: 400,
      code: "bad_verb",
      message: `verb must be one of: ${worldObjectInteractionVerbListRuntime()}`
    };
  }
  if (n === -4) return { http: 409, code: "interaction_container_cycle", message: "container cycle blocked interaction" };
  if (n === -3) return { http: 409, code: "interaction_container_blocked", message: "container/assoc chain blocked interaction" };
  if (n === -2) return { http: 409, code: "interaction_blocked", message: "interaction blocked by canonical rules" };
  return { http: 500, code: "interaction_failed", message: "canonical interaction bridge failed" };
}

function invokeSimCoreBridge(input: InteractionBridgeInput | null | undefined): InteractionBridgeInvokeResult {
  const verb = normalizeWorldObjectInteractionVerbRuntime(input?.verb);
  if (!verb) {
    return { ok: false, ...mapBridgeCode(-1) };
  }
  const target = input?.target || {};
  const actorId = String(input?.actorId || "");
  const ownerMatches = String(target.holder_kind || "") === "npc" && String(target.holder_id || "") === actorId ? 1 : 0;
  const hasContainer = input?.container ? 1 : 0;
  const chainAccessible = input?.chainAccessible ? 1 : 0;
  const containerCycle = input?.containerCycle ? 1 : 0;
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
      String(hasContainer),
      String(chainAccessible),
      String(containerCycle)
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

function applyCanonicalWorldInteractionCommand(input: InteractionBridgeInput | null | undefined) {
  const verb = normalizeWorldObjectInteractionVerbRuntime(input?.verb);
  const target = input?.target || null;
  const container = input?.container || null;
  const actorId = String(input?.actorId || "").trim();
  const actorPos = input?.actorPos || { x: 0, y: 0, z: 0 };
  if (!target || !actorId) {
    return { ok: false, code: "bad_input", http: 400, message: "target and actor are required" };
  }
  if (!verb) {
    return { ok: false, ...mapBridgeCode(-1) };
  }

  const call = invokeSimCoreBridge(input);
  if (call.ok !== true) {
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

  interface InteractionPatch {
    status: number;
    holder_kind: string;
    holder_id?: string;
    holder_key?: string;
    x?: number;
    y?: number;
    z?: number;
  }

  const patch: InteractionPatch = {
    status: Number(canonical.status) & 0xff,
    holder_kind: String(canonical.holder_kind || "none")
  };

  const action: WorldObjectInteractionVerb = verb;
  if (action === "take") {
    patch.holder_id = actorId;
    patch.holder_key = "";
    patch.x = Number(actorPos.x) | 0;
    patch.y = Number(actorPos.y) | 0;
    patch.z = Number(actorPos.z) | 0;
  } else if (action === "drop") {
    patch.holder_id = "";
    patch.holder_key = "";
    patch.x = Number(actorPos.x) | 0;
    patch.y = Number(actorPos.y) | 0;
    patch.z = Number(actorPos.z) | 0;
  } else if (action === "put") {
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

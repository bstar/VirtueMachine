import { isWithinChebyshevRangeRuntime } from "./range_runtime.ts";
import {
  objectLayerAnchorKeyRuntime,
  type U6ObjectEntryRuntime
} from "./object_layer_runtime.ts";
import {
  OBJ_COORD_USE_LOCXYZ,
  coordUseOfStatus
} from "../../common/u6_object_constants.ts";

export interface TargetWorldObjectRuntime {
  key?: string;
  object_key?: string;
  type: number;
  frame: number;
  baseTile?: number;
  footprint?: ReadonlyArray<{ x?: unknown; y?: unknown; z?: unknown }>;
  tile_id?: number;
  renderable?: boolean;
  legacyOrder?: number;
  legacy_order?: number;
  order?: number;
  index?: number;
  source_index?: number;
  status?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface TargetObjectLayerRuntime {
  objectsAt: (x: number, y: number, z: number) => TargetWorldObjectRuntime[];
}

export function targetObjectsFromObjectLayerEntriesRuntime(
  objects: readonly U6ObjectEntryRuntime[] | null | undefined
): TargetWorldObjectRuntime[] {
  return (objects || []).map((obj) => {
    const serverKey = String((obj as { object_key?: unknown }).object_key || "").trim();
    const key = String(obj.objectKey || serverKey || objectLayerAnchorKeyRuntime(obj));
    return {
      ...obj,
      key,
      object_key: key,
      legacy_order: obj.legacyOrder,
      tile_id: obj.tileId
    };
  });
}

export interface TargetEntityRuntime {
  id?: number;
  type?: number;
  frame?: number;
  baseTile?: number;
  x?: number;
  y?: number;
  z?: number;
  legacyOrder?: number;
  order?: number;
}

export interface TargetWorldRuntime {
  map_x: number;
  map_y: number;
  map_z: number;
}

export interface TargetSimRuntime {
  removedObjectKeys?: Record<string, number>;
}

export type TargetLookupDepsRuntime = {
  isObjectRemoved: (sim: TargetSimRuntime | null | undefined, obj: TargetWorldObjectRuntime) => boolean;
  isLikelyPickupObjectType: (type: number) => boolean;
};

export function topWorldObjectAtCellRuntime(
  objectLayer: TargetObjectLayerRuntime | null | undefined,
  sim: TargetSimRuntime | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  opts: { pickupOnly?: boolean } | undefined,
  deps: TargetLookupDepsRuntime
): TargetWorldObjectRuntime | null {
  if (!objectLayer) {
    return null;
  }
  const pickupOnly = !!opts?.pickupOnly;
  const list = objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
  const candidates: Array<{ obj: TargetWorldObjectRuntime; sortOrder: number; index: number }> = [];
  for (let i = 0; i < list.length; i += 1) {
    const o = list[i];
    if (!o || o.renderable === false || deps.isObjectRemoved(sim, o)) {
      continue;
    }
    if (pickupOnly && !deps.isLikelyPickupObjectType(o.type)) {
      continue;
    }
    const sortOrder = Number((o.legacyOrder != null) ? o.legacyOrder : o.order) | 0;
    const index = Number((o.index != null) ? o.index : i) | 0;
    candidates.push({ obj: o, sortOrder, index });
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return b.sortOrder - a.sortOrder;
    }
    return b.index - a.index;
  });
  return candidates[0].obj || null;
}

function targetObjectKeyRuntime(obj: TargetWorldObjectRuntime | null | undefined): string {
  return String(obj?.key || obj?.object_key || "").trim();
}

function targetObjectTileRuntime(obj: TargetWorldObjectRuntime | null | undefined): number {
  if (!obj) {
    return 0;
  }
  const tileId = Number(obj.tile_id);
  if (Number.isFinite(tileId)) {
    return tileId & 0xffff;
  }
  return ((Number(obj.baseTile) | 0) + (Number(obj.frame) | 0)) & 0xffff;
}

function targetObjectCoordUseRuntime(obj: TargetWorldObjectRuntime | null | undefined): number {
  return coordUseOfStatus(Number(obj?.status) | 0);
}

function targetObjectOccupiesCellRuntime(obj: TargetWorldObjectRuntime, tx: number, ty: number, tz: number): boolean {
  if (Array.isArray(obj.footprint)) {
    for (const cell of obj.footprint) {
      if ((Number(cell?.x) | 0) === (tx | 0)
        && (Number(cell?.y) | 0) === (ty | 0)
        && (Number(cell?.z) | 0) === (tz | 0)) {
        return true;
      }
    }
  }
  const ox = Number(obj.x);
  const oy = Number(obj.y);
  const oz = Number(obj.z);
  if (Number.isFinite(ox) && (ox | 0) !== (tx | 0)) {
    return false;
  }
  if (Number.isFinite(oy) && (oy | 0) !== (ty | 0)) {
    return false;
  }
  if (Number.isFinite(oz) && (oz | 0) !== (tz | 0)) {
    return false;
  }
  return true;
}

function targetObjectOrderRuntime(obj: TargetWorldObjectRuntime, fallbackIndex: number): number {
  const legacyOrder = Number(obj.legacyOrder ?? obj.legacy_order);
  if (Number.isFinite(legacyOrder)) {
    return legacyOrder | 0;
  }
  const order = Number(obj.order ?? obj.index ?? obj.source_index);
  return Number.isFinite(order) ? (order | 0) : (fallbackIndex | 0);
}

function orderedLegacyLocationObjectsRuntime(
  objects: readonly TargetWorldObjectRuntime[] | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  sim: TargetSimRuntime | null | undefined,
  deps: TargetLookupDepsRuntime
): TargetWorldObjectRuntime[] {
  const out: Array<{ obj: TargetWorldObjectRuntime; order: number; index: number }> = [];
  let index = 0;
  for (const obj of objects || []) {
    const idx = index;
    index += 1;
    if (!obj || obj.renderable === false || deps.isObjectRemoved(sim, obj)) {
      continue;
    }
    if (targetObjectCoordUseRuntime(obj) !== OBJ_COORD_USE_LOCXYZ) {
      continue;
    }
    if (!targetObjectOccupiesCellRuntime(obj, tx, ty, tz)) {
      continue;
    }
    out.push({ obj, order: targetObjectOrderRuntime(obj, idx), index: idx });
  }
  out.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.index - b.index;
  });
  return out.map((entry) => entry.obj);
}

export type LegacyGetSelectionFailureReasonRuntime =
  | "out_of_range"
  | "no_object"
  | "not_locxyz"
  | "terrain_damage"
  | "not_portable";

export type LegacyGetSelectionRuntime = {
  object: null;
  ok: false;
  reason: LegacyGetSelectionFailureReasonRuntime;
  selected?: TargetWorldObjectRuntime | null;
  x: number;
  y: number;
  z: number;
} | {
  object: TargetWorldObjectRuntime;
  ok: true;
  x: number;
  y: number;
  z: number;
};

export function formatLegacyGetFailureTextRuntime(
  reason: LegacyGetSelectionFailureReasonRuntime,
  selected: { type?: number; object_key?: string; key?: string } | null | undefined,
  tx: number,
  ty: number,
  tz: number
): string {
  const selectedKey = String(selected?.object_key || selected?.key || "").trim();
  const label = selected
    ? `0x${(Number(selected.type) & 0x3ff).toString(16)}${selectedKey ? ` ${selectedKey}` : ""}`
    : `cell ${tx},${ty},${tz}`;
  if (reason === "out_of_range") {
    return `Get: target must be adjacent (${tx},${ty}).`;
  }
  if (reason === "terrain_damage") {
    return `Get: ${label} is hazardous.`;
  }
  if (reason === "not_portable") {
    return `Get: ${label} is not portable.`;
  }
  return `Get: nothing selectable at ${tx},${ty},${tz}.`;
}

export function formatLegacyGetTakingTextRuntime(
  obj: { type?: number } | null | undefined,
  tx: number,
  ty: number,
  tz: number
): string {
  return `Get: taking 0x${(Number(obj?.type) & 0x3ff).toString(16)} at ${tx},${ty},${tz}...`;
}

export function formatLegacyGetPickedTextRuntime(
  obj: { type?: number } | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  inventoryKey: unknown,
  count: unknown
): string {
  return `Get: picked 0x${(Number(obj?.type) & 0x3ff).toString(16)} at ${tx},${ty},${tz} (inv ${String(inventoryKey)}=${Number(count) >>> 0}).`;
}

export type LegacyTargetDiagPresentationRuntime = {
  diagClass: "ok" | "warn";
  diagText: string;
};

export function legacyGetFailurePresentationRuntime(
  reason: LegacyGetSelectionFailureReasonRuntime,
  selected: { type?: number; object_key?: string; key?: string } | null | undefined,
  tx: number,
  ty: number,
  tz: number
): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "warn",
    diagText: formatLegacyGetFailureTextRuntime(reason, selected, tx, ty, tz)
  };
}

export function legacyGetTakingPresentationRuntime(
  obj: { type?: number } | null | undefined,
  tx: number,
  ty: number,
  tz: number
): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: formatLegacyGetTakingTextRuntime(obj, tx, ty, tz)
  };
}

export function legacyGetPickedPresentationRuntime(
  obj: { type?: number } | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  inventoryKey: unknown,
  count: unknown
): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: formatLegacyGetPickedTextRuntime(obj, tx, ty, tz, inventoryKey, count)
  };
}

export function legacyGetCheckingPresentationRuntime(
  tx: number,
  ty: number,
  tz: number
): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: `Get: checking ${Number(tx) | 0},${Number(ty) | 0},${Number(tz) | 0}...`
  };
}

export function legacyGetAsyncFailurePresentationRuntime(message: unknown): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "warn",
    diagText: `Get failed: ${String(message || "unknown error")}`
  };
}

export function legacyDropPlacedPresentationRuntime(
  tx: number,
  ty: number,
  tz: number
): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: `Drop: item placed at ${Number(tx) | 0},${Number(ty) | 0},${Number(tz) | 0}.`
  };
}

export function legacyDropAsyncFailurePresentationRuntime(message: unknown): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "warn",
    diagText: `Drop failed: ${String(message || "unknown error")}`
  };
}

export function formatLegacyLookOutOfRangeTextRuntime(tx: number, ty: number): string {
  return `Look: ${Number(tx) | 0},${Number(ty) | 0} is out of range.`;
}

export function formatLegacyLookResultTextRuntime(
  sentence: unknown,
  x: number,
  y: number,
  z: number
): string {
  return `Look: ${String(sentence || "")} @ ${Number(x) | 0},${Number(y) | 0},${Number(z) | 0}`;
}

export type LegacyLookPresentationRuntime = {
  diagClass: "ok" | "warn";
  diagText: string;
  ledgerLines: string[];
  ok: boolean;
};

export function legacyLookPresentationRuntime(
  result: LookTargetResolutionRuntime,
  sentence: unknown
): LegacyLookPresentationRuntime {
  if (!result.ok) {
    return {
      diagClass: "warn",
      diagText: formatLegacyLookOutOfRangeTextRuntime(result.x, result.y),
      ledgerLines: ["Thou dost see nothing."],
      ok: false
    };
  }
  const text = String(sentence || "Thou dost see nothing.");
  return {
    diagClass: "ok",
    diagText: formatLegacyLookResultTextRuntime(text, result.x, result.y, result.z),
    ledgerLines: [text],
    ok: true
  };
}

export function formatLegacyTalkFailureTextRuntime(
  reason: "out_of_range" | "no_actor",
  tx: number,
  ty: number,
  tz: number
): string {
  if (reason === "out_of_range") {
    return `Talk: target must be adjacent (${Number(tx) | 0},${Number(ty) | 0}).`;
  }
  return `Talk: nobody there at ${Number(tx) | 0},${Number(ty) | 0},${Number(tz) | 0}.`;
}

export type LegacyTalkFailurePresentationRuntime = {
  diagClass: "warn";
  diagText: string;
  ledgerLines: string[];
  ok: false;
};

export function legacyTalkFailurePresentationRuntime(
  result: Extract<TalkTargetResolutionRuntime, { ok: false }>
): LegacyTalkFailurePresentationRuntime {
  return {
    diagClass: "warn",
    diagText: formatLegacyTalkFailureTextRuntime(result.reason, result.x, result.y, result.z),
    ledgerLines: ["No one responds."],
    ok: false
  };
}

export function formatLegacyTalkAuthoritativeStartTextRuntime(actorId: unknown): string {
  return `Talk: contacting authoritative conversation service for actor ${Number(actorId) | 0}...`;
}

export function legacyTalkAuthoritativeStartPresentationRuntime(actorId: unknown): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: formatLegacyTalkAuthoritativeStartTextRuntime(actorId)
  };
}

export function legacyTalkAsyncFailurePresentationRuntime(message: unknown): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "warn",
    diagText: `Talk failed: ${String(message || "unknown error")}`
  };
}

export function legacyTalkAuthoritativeStartedPresentationRuntime(args: {
  targetName: unknown;
  tx: number;
  ty: number;
  tz: number;
}): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "ok",
    diagText: `Talk: ${String(args.targetName || "NPC")} (authoritative) at ${Number(args.tx) | 0},${Number(args.ty) | 0},${Number(args.tz) | 0}.`
  };
}

export function legacyTalkFallbackPresentationRuntime(summary: unknown): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: "warn",
    diagText: `Talk fallback: ${String(summary || "")}`
  };
}

export function formatLegacyTalkStartedTextRuntime(args: {
  actorId: unknown;
  converseLoaded: boolean;
  rulesCount: unknown;
  showInventory: boolean;
  targetObjNum: unknown;
  targetType: unknown;
  tx: number;
  ty: number;
  tz: number;
  valid: boolean;
  speaker: unknown;
}): string {
  return `Talk: ${String(args.speaker || "")} (actor id ${Number(args.actorId) | 0}, conv id ${Number(args.targetObjNum) | 0}, type 0x${(Number(args.targetType) & 0x3ff).toString(16)}) at ${Number(args.tx) | 0},${Number(args.ty) | 0},${Number(args.tz) | 0}; valid=${args.valid ? 1 : 0}; rules=${Number(args.rulesCount) | 0}; showInven=${args.showInventory ? 1 : 0}; converse=${args.converseLoaded ? "loaded" : "missing"}.`;
}

export function legacyTalkStartedPresentationRuntime(args: {
  actorId: unknown;
  converseLoaded: boolean;
  rulesCount: unknown;
  showInventory: boolean;
  targetObjNum: unknown;
  targetType: unknown;
  tx: number;
  ty: number;
  tz: number;
  valid: boolean;
  speaker: unknown;
}): LegacyTargetDiagPresentationRuntime {
  return {
    diagClass: args.converseLoaded ? "ok" : "warn",
    diagText: formatLegacyTalkStartedTextRuntime(args)
  };
}

export function legacyGetTileIgnoredRuntime(tileId: unknown, tileFlags2: ArrayLike<number> | null | undefined): boolean {
  return !!tileFlags2 && ((tileFlags2[Number(tileId) & 0x07ff] ?? 0) & 0x10) !== 0;
}

export function legacyGetTerrainDamageTileRuntime(tileId: unknown, terrainType: ArrayLike<number> | null | undefined): boolean {
  return !!terrainType && ((terrainType[Number(tileId) & 0x07ff] ?? 0) & 0x08) !== 0;
}

export function resolveLegacyGetSelectionRuntime(args: {
  world: TargetWorldRuntime;
  objects: readonly TargetWorldObjectRuntime[] | null | undefined;
  sim: TargetSimRuntime | null | undefined;
  tx: number;
  ty: number;
  deps: TargetLookupDepsRuntime & {
    isTerrainDamageTile?: (tileId: number) => boolean;
    isTileIgnored?: (tileId: number) => boolean;
  };
  maxRange?: number;
}): LegacyGetSelectionRuntime {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = targetZRuntime(args.world);
  if (!targetInRangeRuntime(args.world, tx, ty, Number(args.maxRange ?? 1) | 0)) {
    return { object: null, ok: false, reason: "out_of_range", x: tx, y: ty, z: tz };
  }

  const ordered = orderedLegacyLocationObjectsRuntime(args.objects, tx, ty, tz, args.sim, args.deps);
  let selected: TargetWorldObjectRuntime | null = null;
  let firstFallback: TargetWorldObjectRuntime | null = null;
  for (const obj of ordered) {
    const tileId = targetObjectTileRuntime(obj);
    const tileIgnored = Boolean(args.deps.isTileIgnored && args.deps.isTileIgnored(tileId));
    if (!tileIgnored) {
      selected = obj;
      break;
    }
    if (!firstFallback) {
      firstFallback = obj;
    }
  }
  if (!selected) {
    selected = firstFallback;
  }
  if (!selected) {
    return { object: null, ok: false, reason: "no_object", x: tx, y: ty, z: tz };
  }

  const selectedTileId = targetObjectTileRuntime(selected);
  if (args.deps.isTileIgnored && args.deps.isTileIgnored(selectedTileId)) {
    selected = ordered.find((obj) => targetObjectKeyRuntime(obj) !== targetObjectKeyRuntime(selected)
      && !args.deps.isTileIgnored?.(targetObjectTileRuntime(obj))) || selected;
  }

  if (targetObjectCoordUseRuntime(selected) !== OBJ_COORD_USE_LOCXYZ) {
    return { object: null, ok: false, reason: "not_locxyz", selected, x: tx, y: ty, z: tz };
  }
  if (args.deps.isTerrainDamageTile && args.deps.isTerrainDamageTile(targetObjectTileRuntime(selected))) {
    return { object: null, ok: false, reason: "terrain_damage", selected, x: tx, y: ty, z: tz };
  }
  if (!args.deps.isLikelyPickupObjectType(Number(selected.type) & 0x3ff)) {
    return { object: null, ok: false, reason: "not_portable", selected, x: tx, y: ty, z: tz };
  }
  return { object: selected, ok: true, x: tx, y: ty, z: tz };
}

function targetZRuntime(world: TargetWorldRuntime): number {
  return Number(world.map_z) | 0;
}

function targetInRangeRuntime(world: TargetWorldRuntime, tx: number, ty: number, range: number): boolean {
  return isWithinChebyshevRangeRuntime(
    Number(world.map_x) | 0,
    Number(world.map_y) | 0,
    tx | 0,
    ty | 0,
    range | 0
  );
}

export type LookTargetResolutionRuntime = {
  ok: false;
  reason: "out_of_range";
  x: number;
  y: number;
  z: number;
} | {
  ok: true;
  source: "object" | "actor" | "map";
  tileId: number;
  x: number;
  y: number;
  z: number;
};

export function resolveLookTargetAtCellRuntime(args: {
  world: TargetWorldRuntime;
  objectLayer: TargetObjectLayerRuntime | null | undefined;
  entityEntries: TargetEntityRuntime[] | null | undefined;
  mapTileAt: (x: number, y: number, z: number) => number;
  sim: TargetSimRuntime | null | undefined;
  tx: number;
  ty: number;
  avatarEntityId: number;
  deps: TargetLookupDepsRuntime;
  maxRange?: number;
}): LookTargetResolutionRuntime {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = targetZRuntime(args.world);
  if (!targetInRangeRuntime(args.world, tx, ty, Number(args.maxRange ?? 7) | 0)) {
    return { ok: false, reason: "out_of_range", x: tx, y: ty, z: tz };
  }
  const obj = topWorldObjectAtCellRuntime(args.objectLayer, args.sim, tx, ty, tz, {}, args.deps);
  if (obj) {
    return {
      ok: true,
      source: "object",
      tileId: ((Number(obj.baseTile) | 0) + (Number(obj.frame) | 0)) & 0xffff,
      x: tx,
      y: ty,
      z: tz
    };
  }
  const actor = nearestTalkTargetAtCellRuntime(args.entityEntries, tx, ty, tz, args.avatarEntityId);
  if (actor) {
    return {
      ok: true,
      source: "actor",
      tileId: ((Number(actor.baseTile) | 0) + (Number(actor.frame) | 0)) & 0xffff,
      x: tx,
      y: ty,
      z: tz
    };
  }
  return {
    ok: true,
    source: "map",
    tileId: args.mapTileAt(tx, ty, tz) & 0xffff,
    x: tx,
    y: ty,
    z: tz
  };
}

export type TalkTargetResolutionRuntime = {
  actor: null;
  ok: false;
  reason: "out_of_range" | "no_actor";
  x: number;
  y: number;
  z: number;
} | {
  actor: TargetEntityRuntime;
  ok: true;
  x: number;
  y: number;
  z: number;
};

export function resolveTalkTargetAtCellRuntime(args: {
  world: TargetWorldRuntime;
  entityEntries: TargetEntityRuntime[] | null | undefined;
  tx: number;
  ty: number;
  avatarEntityId: number;
  maxRange?: number;
}): TalkTargetResolutionRuntime {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = targetZRuntime(args.world);
  if (!targetInRangeRuntime(args.world, tx, ty, Number(args.maxRange ?? 1) | 0)) {
    return { actor: null, ok: false, reason: "out_of_range", x: tx, y: ty, z: tz };
  }
  const actor = nearestTalkTargetAtCellRuntime(args.entityEntries, tx, ty, tz, args.avatarEntityId);
  if (!actor) {
    return { actor: null, ok: false, reason: "no_actor", x: tx, y: ty, z: tz };
  }
  return { actor, ok: true, x: tx, y: ty, z: tz };
}

export type AttackTargetResolutionRuntime = {
  actor: TargetEntityRuntime | null;
  x: number;
  y: number;
  z: number;
};

export function resolveAttackTargetAtCellRuntime(args: {
  world: TargetWorldRuntime;
  entityEntries: TargetEntityRuntime[] | null | undefined;
  tx: number;
  ty: number;
  avatarEntityId: number;
}): AttackTargetResolutionRuntime {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = targetZRuntime(args.world);
  return {
    actor: nearestTalkTargetAtCellRuntime(args.entityEntries, tx, ty, tz, args.avatarEntityId),
    x: tx,
    y: ty,
    z: tz
  };
}

export type PickupTargetResolutionRuntime = {
  object: null;
  ok: false;
  reason: "out_of_range" | "no_object";
  x: number;
  y: number;
  z: number;
} | {
  object: TargetWorldObjectRuntime;
  ok: true;
  x: number;
  y: number;
  z: number;
};

export function resolvePickupTargetAtCellRuntime(args: {
  world: TargetWorldRuntime;
  objectLayer: TargetObjectLayerRuntime | null | undefined;
  sim: TargetSimRuntime | null | undefined;
  tx: number;
  ty: number;
  deps: TargetLookupDepsRuntime;
  maxRange?: number;
}): PickupTargetResolutionRuntime {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = targetZRuntime(args.world);
  if (!targetInRangeRuntime(args.world, tx, ty, Number(args.maxRange ?? 1) | 0)) {
    return { object: null, ok: false, reason: "out_of_range", x: tx, y: ty, z: tz };
  }
  const object = topWorldObjectAtCellRuntime(
    args.objectLayer,
    args.sim,
    tx,
    ty,
    tz,
    { pickupOnly: true },
    args.deps
  );
  if (!object) {
    return { object: null, ok: false, reason: "no_object", x: tx, y: ty, z: tz };
  }
  return { object, ok: true, x: tx, y: ty, z: tz };
}

export function nearestTalkTargetAtCellRuntime(
  entityEntries: TargetEntityRuntime[] | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  avatarEntityId: number
): TargetEntityRuntime | null {
  if (!Array.isArray(entityEntries)) {
    return null;
  }
  const candidates: Array<{ entity: TargetEntityRuntime; sortOrder: number; index: number }> = [];
  let i = 0;
  for (const e of entityEntries) {
    const idx = i;
    i += 1;
    if ((Number(e.z) | 0) !== (tz | 0)) continue;
    if ((Number(e.x) | 0) !== (tx | 0)) continue;
    if ((Number(e.y) | 0) !== (ty | 0)) continue;
    if ((Number(e.id) | 0) === (avatarEntityId | 0)) continue;
    const sortOrder = Number((e.legacyOrder != null) ? e.legacyOrder : e.order) | 0;
    candidates.push({ entity: e, sortOrder, index: idx });
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return b.sortOrder - a.sortOrder;
    }
    return b.index - a.index;
  });
  return candidates[0].entity || null;
}

export function buildTargetResolverRegressionProbesRuntime(): {
  world_overlap_cases: Array<{ id: string; selected: string | null }>;
  talk_overlap_cases: Array<{ id: string; selected_id: number | null }>;
} {
  const makeLayer = (list: TargetWorldObjectRuntime[]): TargetObjectLayerRuntime => ({
    objectsAt: (_x: number, _y: number, _z: number) => list
  });
  const removedSet = new Set<string>();
  const deps = {
    isObjectRemoved: (_sim: TargetSimRuntime | null | undefined, obj: TargetWorldObjectRuntime) => removedSet.has(String(obj?.key || "")),
    isLikelyPickupObjectType: (type: number) => ((Number(type) & 0x3ff) !== 0x129)
  };

  const world_overlap_cases = [
    {
      id: "highest_legacy_order_wins",
      selected: topWorldObjectAtCellRuntime(
        makeLayer([
          { key: "a", renderable: true, legacyOrder: 10, order: 10, index: 1, type: 0x90, frame: 0 },
          { key: "b", renderable: true, legacyOrder: 40, order: 40, index: 2, type: 0x91, frame: 0 }
        ]),
        {},
        0,
        0,
        0,
        {},
        deps
      )?.key || null
    },
    {
      id: "pickup_filter_skips_non_pickup",
      selected: topWorldObjectAtCellRuntime(
        makeLayer([
          { key: "door", renderable: true, legacyOrder: 99, order: 99, index: 1, type: 0x129, frame: 0 },
          { key: "item", renderable: true, legacyOrder: 10, order: 10, index: 2, type: 0x090, frame: 0 }
        ]),
        {},
        0,
        0,
        0,
        { pickupOnly: true },
        deps
      )?.key || null
    }
  ];

  const talk_overlap_cases = [
    {
      id: "highest_order_non_avatar_wins",
      selected_id: nearestTalkTargetAtCellRuntime(
        [
          { id: 1, x: 10, y: 10, z: 0, legacyOrder: 999, order: 999 },
          { id: 2, x: 10, y: 10, z: 0, legacyOrder: 10, order: 10 },
          { id: 3, x: 10, y: 10, z: 0, legacyOrder: 20, order: 20 }
        ],
        10,
        10,
        0,
        1
      )?.id ?? null
    },
    {
      id: "no_non_avatar_target",
      selected_id: nearestTalkTargetAtCellRuntime(
        [{ id: 1, x: 10, y: 10, z: 0, legacyOrder: 1, order: 1 }],
        10,
        10,
        0,
        1
      )?.id ?? null
    }
  ];

  return {
    world_overlap_cases,
    talk_overlap_cases
  };
}

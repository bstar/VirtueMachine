import type { U6ObjectEntryRuntime } from "../sim/object_layer_runtime.ts";
import type { TargetWorldObjectRuntime } from "../sim/target_runtime.ts";
import {
  OBJ_COORD_USE_LOCXYZ,
  coordUseOfStatus
} from "../../common/u6_object_constants.ts";
import {
  shouldHideServerWorldObjectFromLayerRuntime,
  type WorldRuntimeServerObject
} from "./world_runtime.ts";

export type WorldObjectLayerProjectionActionRuntime =
  | { kind: "remove"; object_key: string }
  | { entry: U6ObjectEntryRuntime; kind: "upsert" };

export function runtimeServerObjectStableIndexRuntime(objectKey: string): number {
  let hash = 0;
  for (let i = 0; i < objectKey.length; i += 1) {
    hash = (((hash << 5) - hash) + objectKey.charCodeAt(i)) | 0;
  }
  return hash & 0xffff;
}

export function runtimeServerObjectLegacyOrderRuntime(objectKey: string, legacyOrder: unknown, sourceIndex: number): number {
  const order = Number(legacyOrder);
  if (Number.isFinite(order)) {
    return Number(order) | 0;
  }
  return 0x7000 + (sourceIndex & 0x0fff) + (objectKey.startsWith("inv:") ? 0x1000 : 0);
}

export function targetObjectsFromServerObjectsRuntime(
  objects: readonly WorldRuntimeServerObject[] | null | undefined
): TargetWorldObjectRuntime[] {
  const out: TargetWorldObjectRuntime[] = [];
  for (const row of objects || []) {
    const objectKey = String(row.object_key || "").trim();
    const type = Number(row.type);
    const frame = Number(row.frame);
    const sourceIndex = Number(row.source_index) >>> 0;
    if (!objectKey || !Number.isFinite(type) || !Number.isFinite(frame)) {
      continue;
    }
    out.push({
      object_key: objectKey,
      key: objectKey,
      type: Number(type) & 0x3ff,
      frame: Number(frame) & 0x3f,
      footprint: Array.isArray(row.footprint) ? row.footprint : undefined,
      tile_id: Number(row.tile_id) & 0xffff,
      status: Number(row.status) & 0xff,
      x: Number(row.x) | 0,
      y: Number(row.y) | 0,
      z: Number(row.z) | 0,
      index: sourceIndex,
      order: sourceIndex,
      source_index: sourceIndex,
      legacy_order: runtimeServerObjectLegacyOrderRuntime(objectKey, row.legacy_order, sourceIndex),
      renderable: true
    });
  }
  return out;
}

export function objectLayerEntryFromServerObjectRuntime(
  row: unknown,
  baseTiles: ArrayLike<number> | null | undefined
): U6ObjectEntryRuntime | null {
  if (!row || typeof row !== "object" || !baseTiles) {
    return null;
  }
  const src = row as {
    frame?: unknown;
    legacy_order?: unknown;
    object_key?: unknown;
    source_area?: unknown;
    source_index?: unknown;
    status?: unknown;
    tile_id?: unknown;
    type?: unknown;
    x?: unknown;
    y?: unknown;
    z?: unknown;
  };
  const objectKey = String(src.object_key || "").trim();
  const type = Number(src.type);
  const frame = Number(src.frame);
  const status = Number(src.status) & 0xff;
  if (!objectKey || !Number.isFinite(type) || !Number.isFinite(frame) || coordUseOfStatus(status) !== OBJ_COORD_USE_LOCXYZ) {
    return null;
  }
  const normalizedType = Number(type) & 0x3ff;
  const normalizedFrame = Number(frame) & 0x3f;
  const baseTile = Number(baseTiles[normalizedType] || 0) & 0xffff;
  const tileId = Number.isFinite(Number(src.tile_id))
    ? Number(src.tile_id) & 0xffff
    : (baseTile + normalizedFrame) & 0xffff;
  const fallbackIndex = runtimeServerObjectStableIndexRuntime(objectKey);
  const sourceIndex = Number.isFinite(Number(src.source_index))
    ? Number(src.source_index) & 0xffff
    : fallbackIndex;
  return {
    assocIndex: 0,
    baseTile,
    coordUse: OBJ_COORD_USE_LOCXYZ,
    frame: normalizedFrame,
    index: sourceIndex,
    legacyOrder: runtimeServerObjectLegacyOrderRuntime(objectKey, src.legacy_order, sourceIndex),
    objectKey,
    order: sourceIndex,
    renderable: true,
    sourceArea: Number.isFinite(Number(src.source_area)) ? Number(src.source_area) & 0x3f : 0x3f,
    sourceIndex,
    status,
    tileId,
    type: normalizedType,
    x: Number(src.x) & 0x3ff,
    y: Number(src.y) & 0x3ff,
    z: Number(src.z) & 0x0f
  };
}

export function objectLayerProjectionActionsFromServerObjectsRuntime(
  objects: readonly unknown[] | null | undefined,
  baseTiles: ArrayLike<number> | null | undefined,
  isHidden: (key: string) => boolean
): WorldObjectLayerProjectionActionRuntime[] {
  if (!Array.isArray(objects)) {
    return [];
  }
  const out: WorldObjectLayerProjectionActionRuntime[] = [];
  for (const row of objects) {
    const record = row && typeof row === "object" ? row as {
      object_key?: unknown;
      source_kind?: unknown;
      source_object_key?: unknown;
    } : null;
    const objectKey = String(record?.object_key || "").trim();
    if (shouldHideServerWorldObjectFromLayerRuntime(record, isHidden)) {
      out.push({ kind: "remove", object_key: objectKey });
      continue;
    }
    const entry = objectLayerEntryFromServerObjectRuntime(row, baseTiles);
    if (entry) {
      out.push({ kind: "upsert", entry });
    }
  }
  return out;
}

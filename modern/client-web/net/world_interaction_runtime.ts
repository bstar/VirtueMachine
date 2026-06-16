import {
  legacyDropPlacedPresentationRuntime,
  legacyGetFailurePresentationRuntime,
  legacyGetTakingPresentationRuntime,
  resolveLegacyGetSelectionRuntime,
  type TargetLookupDepsRuntime,
  type TargetSimRuntime,
  type TargetWorldObjectRuntime,
  type TargetWorldRuntime
} from "../sim/target_runtime.ts";
import {
  inventoryObjectForDropSelectionRuntime,
  requestDropWorldObjectRuntime,
  type WorldRuntimeInventoryObject,
  type WorldRuntimeInventorySelection,
  type WorldRuntimeJson,
  type WorldRuntimeRequest,
  type WorldRuntimeServerObject
} from "./world_runtime.ts";
import { targetObjectsFromServerObjectsRuntime } from "./world_object_projection_runtime.ts";

export type WorldInteractionSimRuntime = TargetSimRuntime & {
  inventoryObjects?: WorldRuntimeInventoryObject[];
  world: TargetWorldRuntime;
};

export type WorldInteractionDiagRuntime = {
  diagClass?: unknown;
  diagText?: unknown;
};

export type WorldInteractionDropEffectRuntime = {
  fromX: number;
  fromY: number;
  landObject: WorldRuntimeJson["target"] | null | undefined;
  toX: number;
  toY: number;
  z: number;
};

export async function performNetGetAtCellRuntime(args: {
  applyDiag: (diag: WorldInteractionDiagRuntime) => void;
  fetchWorldObjectsAtCell: (x: number, y: number, z: number) => Promise<{ objects?: readonly WorldRuntimeServerObject[] | null } | null>;
  isTerrainDamageTile: (tileId: number) => boolean;
  isTileIgnored: (tileId: number) => boolean;
  lookupDeps: TargetLookupDepsRuntime;
  sim: WorldInteractionSimRuntime;
  takeWorldObject: (obj: TargetWorldObjectRuntime, tx: number, ty: number, tz: number) => Promise<unknown>;
  tx: number;
  ty: number;
}): Promise<boolean> {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const tz = Number(args.sim.world.map_z) | 0;
  const out = await args.fetchWorldObjectsAtCell(tx, ty, tz);
  const objects = targetObjectsFromServerObjectsRuntime(out?.objects || []);
  const result = resolveLegacyGetSelectionRuntime({
    world: args.sim.world,
    objects,
    sim: args.sim,
    tx,
    ty,
    deps: {
      ...args.lookupDeps,
      isTerrainDamageTile: args.isTerrainDamageTile,
      isTileIgnored: args.isTileIgnored
    }
  });
  if (result.ok === false) {
    args.applyDiag(legacyGetFailurePresentationRuntime(result.reason, result.selected, tx, ty, tz));
    return false;
  }
  args.applyDiag(legacyGetTakingPresentationRuntime(result.object, tx, ty, tz));
  await args.takeWorldObject(result.object, tx, ty, tz);
  return true;
}

export async function performNetDropInventoryObjectRuntime(args: {
  actorId: string | number;
  applyDiag: (diag: WorldInteractionDiagRuntime) => void;
  legacyHudSelection: WorldRuntimeInventorySelection;
  netRequest: WorldRuntimeRequest;
  queueDropThrowEffect: (effect: WorldInteractionDropEffectRuntime) => void;
  sim: WorldInteractionSimRuntime;
  syncInventoryProjection: () => Promise<unknown>;
  tx: number;
  ty: number;
}): Promise<WorldRuntimeJson | null> {
  const tx = Number(args.tx) | 0;
  const ty = Number(args.ty) | 0;
  const world = args.sim.world;
  let item = inventoryObjectForDropSelectionRuntime(args.sim.inventoryObjects, args.legacyHudSelection);
  if (!item) {
    await args.syncInventoryProjection();
    item = inventoryObjectForDropSelectionRuntime(args.sim.inventoryObjects, args.legacyHudSelection);
  }
  if (!item) {
    throw new Error("inventory is empty");
  }
  const out = await requestDropWorldObjectRuntime({
    actorId: args.actorId,
    actorX: Number(world.map_x) | 0,
    actorY: Number(world.map_y) | 0,
    actorZ: Number(world.map_z) | 0,
    dropX: tx,
    dropY: ty,
    dropZ: Number(world.map_z) | 0,
    targetKey: item.object_key
  }, args.netRequest);
  args.queueDropThrowEffect({
    fromX: Number(world.map_x) | 0,
    fromY: Number(world.map_y) | 0,
    toX: tx,
    toY: ty,
    z: Number(world.map_z) | 0,
    landObject: out?.target || null
  });
  await args.syncInventoryProjection();
  args.applyDiag(legacyDropPlacedPresentationRuntime(tx, ty, Number(world.map_z) | 0));
  return out;
}

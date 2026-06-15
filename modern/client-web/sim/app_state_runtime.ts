import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";
import type { WorldRuntimeInventoryObject } from "../net/world_runtime.ts";
import { normalizePartyMemberIdsRuntime } from "./party_runtime.ts";

export type AppSimState = Omit<SimSnapshotRuntime, "doorOpenStates"> & {
  doorOpenStates: Record<string, number>;
  inventoryObjects?: WorldRuntimeInventoryObject[];
  inventoryTiles?: Record<string, number>;
  partySize: number;
};

export function createInitialAppSimState(
  initialWorld: SimSnapshotRuntime["world"],
  initialSeed: number
): AppSimState {
  return {
    tick: 0,
    rngState: initialSeed >>> 0,
    worldFlags: 0,
    commandsApplied: 0,
    doorOpenStates: {},
    removedObjectKeys: {},
    removedObjectAtTick: {},
    removedObjectCount: 0,
    inventory: {},
    inventoryObjects: [],
    inventoryTiles: {},
    spawnedWorldObjects: [],
    spawnedWorldSeq: 0,
    partyMembers: [1],
    avatarPose: "stand",
    avatarPoseSetTick: -1,
    avatarPoseAnchor: null,
    partySize: 1,
    world: { ...initialWorld }
  };
}

export function toAppSimStateRuntime(
  snapshot: SimSnapshotRuntime,
  fallbackPartySize = 1
): AppSimState {
  const maybePartySize = Number((snapshot as { partySize?: number }).partySize);
  const partyMembers = normalizePartyMemberIdsRuntime(snapshot.partyMembers, 1);
  return {
    ...snapshot,
    doorOpenStates: Object.fromEntries(
      Object.entries(snapshot.doorOpenStates ?? {}).map(([key, value]) => [key, Number(value) | 0])
    ),
    partyMembers,
    partySize: Math.max(partyMembers.length, Number.isFinite(maybePartySize) && maybePartySize > 0
      ? maybePartySize
      : Number(fallbackPartySize) || 1)
  };
}

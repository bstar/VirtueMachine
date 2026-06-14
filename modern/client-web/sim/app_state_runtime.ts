import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";

export type AppSimState = Omit<SimSnapshotRuntime, "doorOpenStates"> & {
  doorOpenStates: Record<string, number>;
  partySize: number;
};

function normalizePartyMembersRuntime(raw: unknown): number[] {
  const src = Array.isArray(raw) ? raw : [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of src) {
    const id = Number(value) >>> 0;
    if (id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
    if (out.length >= 10) {
      break;
    }
  }
  if (!out.length) {
    out.push(1);
  }
  return out;
}

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
  const partyMembers = normalizePartyMembersRuntime(snapshot.partyMembers);
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

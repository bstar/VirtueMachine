import { U6_SFX } from "./sfx_ids_runtime.ts";

export const U6_AMBIENT_OBJECT_TYPE_RUNTIME = Object.freeze({
  CLOCK: 0x09f,
  FIREPLACE: 0x0a4,
  COOK_FIRE: 0x0c9,
  FOUNTAIN: 0x0ea,
  WATER_WHEEL: 0x11f,
  FIRE_FIELD: 0x130,
  FIRE: 0x13d,
  PROTECTION_FIELD: 0x13f
});

export type AmbientSfxObjectRuntime = {
  type?: unknown;
  x?: unknown;
  y?: unknown;
};

export type AmbientSfxCandidateRuntime<TObject extends AmbientSfxObjectRuntime = AmbientSfxObjectRuntime> = {
  dist: number;
  obj: TObject;
  priority: number;
  sfxId: number;
};

export type AmbientSfxPlaybackPlanRuntime<TObject extends AmbientSfxObjectRuntime = AmbientSfxObjectRuntime> = {
  candidate: AmbientSfxCandidateRuntime<TObject>;
  distance: number;
  label: string;
  seed: number;
  tick: number;
  tickPhase: number;
  volume: number;
};

export function ambientSfxForObjectTypeRuntime(type: unknown): number | null {
  switch ((Number(type) | 0) & 0x3ff) {
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.CLOCK:
      return U6_SFX.CLOCK;
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.FOUNTAIN:
      return U6_SFX.FOUNTAIN;
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIREPLACE:
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.COOK_FIRE:
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIRE_FIELD:
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.FIRE:
      return U6_SFX.FIRE;
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.PROTECTION_FIELD:
      return U6_SFX.PROTECTION_FIELD;
    case U6_AMBIENT_OBJECT_TYPE_RUNTIME.WATER_WHEEL:
      return U6_SFX.WATER_WHEEL;
    default:
      return null;
  }
}

export function ambientSfxCooldownTicksRuntime(sfxId: unknown): number {
  const id = Number(sfxId) | 0;
  if (id === U6_SFX.CLOCK) {
    return 8;
  }
  if (id === U6_SFX.FOUNTAIN || id === U6_SFX.WATER_WHEEL) {
    return 2;
  }
  return 4;
}

export function ambientSfxVolumeRuntime(dist: unknown): number {
  return Math.max(0.35, Math.min(1, (9 - (Number(dist) | 0)) / 8));
}

export function ambientSfxSeedRuntime(args: {
  tick: unknown;
  type: unknown;
  x: unknown;
  y: unknown;
}): number {
  const tick = Number(args.tick) | 0;
  return (((tick * 1103515245)
    ^ (((Number(args.x) | 0) & 0xff) << 16)
    ^ (((Number(args.y) | 0) & 0xff) << 8)
    ^ ((Number(args.type) | 0) & 0x3ff)) >>> 0);
}

export function ambientSfxLastLabelRuntime(type: unknown, sfxId: unknown): string {
  return `0x${(((Number(type) | 0) & 0x3ff)).toString(16)}:${Number(sfxId) | 0}`;
}

export function buildAmbientSfxCandidatesRuntime<TObject extends AmbientSfxObjectRuntime>(args: {
  avatarX: unknown;
  avatarY: unknown;
  objects: readonly TObject[];
}): AmbientSfxCandidateRuntime<TObject>[] {
  const ax = Number(args.avatarX) | 0;
  const ay = Number(args.avatarY) | 0;
  const candidates: AmbientSfxCandidateRuntime<TObject>[] = [];
  for (const obj of args.objects) {
    const sfxId = ambientSfxForObjectTypeRuntime(obj?.type);
    if (sfxId == null) {
      continue;
    }
    const dist = Math.max(Math.abs((Number(obj.x) | 0) - ax), Math.abs((Number(obj.y) | 0) - ay));
    candidates.push({
      obj,
      sfxId,
      dist,
      priority: sfxId === U6_SFX.FOUNTAIN ? 0 : 1
    });
  }
  return candidates.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (((Number(a.obj?.type) | 0) & 0x3ff) - ((Number(b.obj?.type) | 0) & 0x3ff));
  });
}

export function ambientSfxIsReadyRuntime(args: {
  lastTick: unknown;
  sfxId: unknown;
  tick: unknown;
}): boolean {
  const tick = Number(args.tick) >>> 0;
  const lastTick = Number(args.lastTick) >>> 0;
  return (tick - lastTick) >= ambientSfxCooldownTicksRuntime(args.sfxId);
}

export function nextAmbientSfxPlaybackPlanRuntime<TObject extends AmbientSfxObjectRuntime>(args: {
  candidates: readonly AmbientSfxCandidateRuntime<TObject>[];
  lastTickBySfx?: Record<string, unknown> | null;
  tick: unknown;
}): AmbientSfxPlaybackPlanRuntime<TObject> | null {
  const tick = Number(args.tick) >>> 0;
  const tickPhase = tick & 0x0f;
  const lastTickBySfx = args.lastTickBySfx || {};
  for (const candidate of args.candidates) {
    const sfxId = Number(candidate.sfxId) | 0;
    const lastTick = Number(lastTickBySfx[String(sfxId)] || 0) >>> 0;
    if (!ambientSfxIsReadyRuntime({ tick, lastTick, sfxId })) {
      continue;
    }
    return {
      candidate,
      distance: Math.min(7, Number(candidate.dist) | 0),
      label: ambientSfxLastLabelRuntime(candidate.obj?.type, sfxId),
      seed: ambientSfxSeedRuntime({
        tick,
        x: candidate.obj?.x,
        y: candidate.obj?.y,
        type: candidate.obj?.type
      }),
      tick,
      tickPhase,
      volume: ambientSfxVolumeRuntime(candidate.dist)
    };
  }
  return null;
}

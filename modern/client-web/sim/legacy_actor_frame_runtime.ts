export const NPC_FLAG_DIRECTION_MASK_RUNTIME = 0x07;

export type LegacyActorFrameEntityRuntime = {
  authoritativeDirection?: unknown;
  baseTile: number;
  direction?: unknown;
  frame: number;
  type: number;
};

export function isLegacyFourFrameActorTypeRuntime(type: number): boolean {
  const t = type & 0x03ff;
  return (t >= 0x178 && t <= 0x183) || (t >= 0x199 && t <= 0x19a);
}

export function isLegacyTwoFrameActorTypeRuntime(type: number): boolean {
  const t = type & 0x03ff;
  return (
    t === 0x15a
    || t === 0x15c
    || t === 0x15d
    || t === 0x15e
    || t === 0x15f
    || t === 0x156
    || t === 0x166
    || t === 0x169
    || (t >= 0x16f && t <= 0x174)
    || t === 0x188
    || t >= 0x1aa
  );
}

export function legacyActorFrameForDirectionRuntime(
  type: number,
  dirGroup: number,
  moving: boolean,
  tick: number
): number | null {
  const direction = ((dirGroup | 0) & 0x03);
  if (isLegacyFourFrameActorTypeRuntime(type)) {
    const cadence = moving ? 1 : 4;
    const phase = (tick >> cadence) & 0x03;
    const step = [1, 2, 1, 0][phase] | 0;
    return (direction << 2) + step;
  }
  if ((type & 0x03ff) === 0x16b) {
    const cadence = moving ? 1 : 4;
    const phase = (tick >> cadence) & 0x03;
    const step = [1, 2, 1, 0][phase] | 0;
    return (direction * 3) + step;
  }
  if (isLegacyTwoFrameActorTypeRuntime(type)) {
    const cadence = moving ? 1 : 4;
    const step = (tick >> cadence) & 0x01;
    return (direction << 1) + step;
  }
  return null;
}

export function legacyActorDirectionGroupRuntime(entity: Partial<LegacyActorFrameEntityRuntime> | null | undefined): number {
  if (Number.isInteger(entity?.authoritativeDirection)) {
    return ((Number(entity?.authoritativeDirection) & NPC_FLAG_DIRECTION_MASK_RUNTIME) >> 1) & 0x03;
  }
  if (Number.isInteger(entity?.direction)) {
    return ((Number(entity?.direction) & NPC_FLAG_DIRECTION_MASK_RUNTIME) >> 1) & 0x03;
  }
  return (((Number(entity?.frame) | 0) >> 2) & 0x03);
}

export function legacyActorStandingTileIdRuntime(
  entity: LegacyActorFrameEntityRuntime,
  dirGroup: number,
  moving: boolean,
  tick: number
): number {
  const frame = legacyActorFrameForDirectionRuntime(entity.type | 0, dirGroup, moving, tick >>> 0);
  if (frame == null) {
    return ((entity.baseTile | 0) + (entity.frame | 0)) & 0xffff;
  }
  return ((entity.baseTile | 0) + frame) & 0xffff;
}

export function directionGroupFromDxDyRuntime(dx: number, dy: number): number {
  if ((dy | 0) < 0) return 0;
  if ((dx | 0) > 0) return 1;
  if ((dy | 0) > 0) return 2;
  return 3;
}

export function remotePlayerFrameOffsetRuntime(facingDx: number, facingDy: number): number {
  const dirGroup = directionGroupFromDxDyRuntime(facingDx | 0, facingDy | 0);
  return (dirGroup << 2) + 1;
}

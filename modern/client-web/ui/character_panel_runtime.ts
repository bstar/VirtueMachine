export type CharacterPanelSlotRuntime = {
  h: number;
  w: number;
  x: number;
  y: number;
};

export type CharacterPanelEntityRuntime = {
  baseTile?: number;
  frame?: number;
  id: number;
  x: number;
  y: number;
  z: number;
};

export type CharacterPanelPickRuntime = {
  label: string;
  tileId: number | null;
};

export const CHARACTER_PANEL_SLOTS_RUNTIME: readonly CharacterPanelSlotRuntime[] = Object.freeze([
  { x: 8, y: 8, w: 76, h: 96 },
  { x: 90, y: 8, w: 76, h: 96 },
  { x: 172, y: 8, w: 76, h: 96 },
  { x: 254, y: 8, w: 76, h: 96 }
]);

export function projectCharacterPanelPicksRuntime(args: {
  avatarEntityId: number;
  avatarTileId: number | null;
  entities: readonly CharacterPanelEntityRuntime[] | null | undefined;
  playerX: number;
  playerY: number;
  playerZ: number;
  resolveAnimatedTile: (entity: CharacterPanelEntityRuntime & { tileId: number }) => number;
  slotCount?: number;
}): CharacterPanelPickRuntime[] {
  const slotCount = Math.max(1, Number(args.slotCount || CHARACTER_PANEL_SLOTS_RUNTIME.length) | 0);
  const px = Number(args.playerX) | 0;
  const py = Number(args.playerY) | 0;
  const pz = Number(args.playerZ) | 0;
  const avatarEntityId = Number(args.avatarEntityId) | 0;
  const entities = Array.isArray(args.entities) ? args.entities : [];
  const nearest = entities
    .filter((entity) => (Number(entity.z) | 0) === pz && (Number(entity.id) | 0) !== avatarEntityId)
    .map((entity) => ({
      entity,
      dist: Math.abs((Number(entity.x) | 0) - px) + Math.abs((Number(entity.y) | 0) - py)
    }))
    .sort((a, b) => {
      if (a.dist !== b.dist) {
        return a.dist - b.dist;
      }
      return (Number(a.entity.id) | 0) - (Number(b.entity.id) | 0);
    })
    .slice(0, Math.max(0, slotCount - 1));

  const picks: CharacterPanelPickRuntime[] = [{ label: "AVATAR", tileId: args.avatarTileId }];
  for (const row of nearest) {
    const baseTile = Number(row.entity.baseTile) | 0;
    const frame = Number(row.entity.frame) | 0;
    const tileId = (baseTile + frame) & 0xffff;
    picks.push({
      label: `NPC ${Number(row.entity.id) | 0}`,
      tileId: args.resolveAnimatedTile({ ...row.entity, tileId })
    });
  }
  while (picks.length < slotCount) {
    picks.push({ label: "EMPTY", tileId: null });
  }
  return picks.slice(0, slotCount);
}

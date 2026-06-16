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

export type CharacterPanelRectRuntime = {
  fillStyle: string;
  h: number;
  w: number;
  x: number;
  y: number;
};

export type CharacterPanelStrokeRuntime = {
  h: number;
  strokeStyle: string;
  w: number;
  x: number;
  y: number;
};

export type CharacterPanelTextRuntime = {
  color: string;
  font: string;
  text: string;
  x: number;
  y: number;
};

export type CharacterPanelSpriteRuntime = {
  destH: number;
  destW: number;
  destX: number;
  destY: number;
  sourceH: 16;
  sourceW: 16;
  sourceX: 0;
  sourceY: 0;
  tileId: number;
};

export type CharacterPanelRenderPlanRuntime = {
  background: CharacterPanelRectRuntime;
  message: CharacterPanelTextRuntime | null;
  slotRects: CharacterPanelRectRuntime[];
  slotStrokes: CharacterPanelStrokeRuntime[];
  sprites: CharacterPanelSpriteRuntime[];
  texts: CharacterPanelTextRuntime[];
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

export function buildCharacterPanelRenderPlanRuntime(args: {
  canvasH: unknown;
  canvasW: unknown;
  dataReady: boolean;
  picks?: readonly CharacterPanelPickRuntime[] | null;
  slots?: readonly CharacterPanelSlotRuntime[] | null;
}): CharacterPanelRenderPlanRuntime {
  const slots = args.slots && args.slots.length ? args.slots : CHARACTER_PANEL_SLOTS_RUNTIME;
  const plan: CharacterPanelRenderPlanRuntime = {
    background: {
      fillStyle: "#090909",
      h: Number(args.canvasH) | 0,
      w: Number(args.canvasW) | 0,
      x: 0,
      y: 0
    },
    message: null,
    slotRects: [],
    slotStrokes: [],
    sprites: [],
    texts: []
  };
  for (const slot of slots) {
    plan.slotRects.push({ fillStyle: "#111827", x: slot.x, y: slot.y, w: slot.w, h: slot.h });
    plan.slotStrokes.push({
      h: slot.h - 1,
      strokeStyle: "#334155",
      w: slot.w - 1,
      x: slot.x + 0.5,
      y: slot.y + 0.5
    });
  }
  if (!args.dataReady) {
    plan.message = {
      color: "#94a3b8",
      font: "11px var(--vm-ui-font), monospace",
      text: "Awaiting actor sprite data...",
      x: 12,
      y: 22
    };
    return plan;
  }
  const picks = Array.isArray(args.picks) ? args.picks : [];
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const pick = picks[i] || { label: "EMPTY", tileId: null };
    plan.texts.push({
      color: "#9ca3af",
      font: "10px var(--vm-ui-font), monospace",
      text: pick.label,
      x: slot.x + 6,
      y: slot.y + 12
    });
    if (pick.tileId == null) {
      continue;
    }
    const scale = 3;
    const destW = 16 * scale;
    const destH = 16 * scale;
    plan.sprites.push({
      destH,
      destW,
      destX: slot.x + Math.floor((slot.w - destW) / 2),
      destY: slot.y + 20,
      sourceH: 16,
      sourceW: 16,
      sourceX: 0,
      sourceY: 0,
      tileId: pick.tileId & 0xffff
    });
    plan.texts.push({
      color: "#64748b",
      font: "9px var(--vm-ui-font), monospace",
      text: `0x${(pick.tileId & 0xffff).toString(16)}`,
      x: slot.x + 6,
      y: slot.y + slot.h - 8
    });
  }
  return plan;
}

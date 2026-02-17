export type LegacyHudPanelHitRuntime =
  | { kind: "inventory"; index: number }
  | { kind: "portrait"; index: 0 }
  | { kind: "equip"; slot: number };

type LegacyHudRectRuntime = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type LegacyInventoryCellRuntime = LegacyHudRectRuntime & {
  index: number;
  row: number;
  col: number;
};

type LegacyEquipSlotRuntime = LegacyHudRectRuntime & {
  slot: number;
  key: string;
};

export type LegacyInventoryPaperdollLayoutRuntime = {
  inTalkPanel: boolean;
  showEquipment: boolean;
  showBagGrid: boolean;
  equipOffsetY: number;
  portrait: LegacyHudRectRuntime;
  inventoryCells: LegacyInventoryCellRuntime[];
  equipSlots: LegacyEquipSlotRuntime[];
  anchors: {
    inventory_hitbox: string;
    equip_hitbox: string;
    inventory_draw: string;
    equip_draw: string;
  };
};

type LayoutInputRuntime = {
  statusDisplay: number;
  talkStatusDisplay: number;
  talkShowInventory: boolean;
};

type EquipSlotSeed = {
  slot: number;
  key: string;
  x: number;
  y: number;
};

const INVENTORY_GRID = Object.freeze({
  x: 248,
  y: 32,
  cols: 4,
  rows: 3,
  cellW: 16,
  cellH: 16
});

const EQUIP_SLOT_SEEDS: ReadonlyArray<EquipSlotSeed> = Object.freeze([
  { slot: 0, key: "head", x: 200, y: 16 },
  { slot: 1, key: "neck", x: 176, y: 24 },
  { slot: 4, key: "chest", x: 224, y: 24 },
  { slot: 2, key: "right_hand", x: 176, y: 40 },
  { slot: 5, key: "left_hand", x: 224, y: 40 },
  { slot: 3, key: "right_finger", x: 176, y: 56 },
  { slot: 6, key: "left_finger", x: 224, y: 56 },
  { slot: 7, key: "feet", x: 200, y: 64 }
]);

function rectContains(r: LegacyHudRectRuntime, x: number, y: number): boolean {
  return x >= r.x && x < (r.x + r.w) && y >= r.y && y < (r.y + r.h);
}

export function buildLegacyInventoryPaperdollLayoutRuntime(
  input: LayoutInputRuntime
): LegacyInventoryPaperdollLayoutRuntime {
  const statusDisplay = Number(input?.statusDisplay) | 0;
  const talkStatusDisplay = Number(input?.talkStatusDisplay) | 0;
  const inTalkPanel = statusDisplay === talkStatusDisplay;
  const showEquipment = inTalkPanel ? !!input?.talkShowInventory : true;
  const showBagGrid = !inTalkPanel;
  const equipOffsetY = (inTalkPanel && showEquipment) ? 8 : 0;

  const portrait = inTalkPanel
    ? {
      x: showEquipment ? 248 : 216,
      y: 24,
      w: 56,
      h: 64
    }
    : {
      x: 272,
      y: 16,
      w: 16,
      h: 16
    };

  const inventoryCells: LegacyInventoryCellRuntime[] = [];
  if (showBagGrid) {
    for (let row = 0; row < INVENTORY_GRID.rows; row += 1) {
      for (let col = 0; col < INVENTORY_GRID.cols; col += 1) {
        inventoryCells.push({
          index: (row * INVENTORY_GRID.cols) + col,
          row,
          col,
          x: INVENTORY_GRID.x + (col * INVENTORY_GRID.cellW),
          y: INVENTORY_GRID.y + (row * INVENTORY_GRID.cellH),
          w: INVENTORY_GRID.cellW,
          h: INVENTORY_GRID.cellH
        });
      }
    }
  }

  const equipSlots: LegacyEquipSlotRuntime[] = showEquipment
    ? EQUIP_SLOT_SEEDS.map((seed) => ({
      slot: seed.slot,
      key: seed.key,
      x: seed.x,
      y: seed.y + equipOffsetY,
      w: 16,
      h: 16
    }))
    : [];

  return {
    inTalkPanel,
    showEquipment,
    showBagGrid,
    equipOffsetY,
    portrait,
    inventoryCells,
    equipSlots,
    anchors: {
      inventory_hitbox: "C_155D_1267",
      equip_hitbox: "C_155D_130E",
      inventory_draw: "C_155D_0CF5",
      equip_draw: "C_155D_08F4"
    }
  };
}

export function legacyInventoryPaperdollHitTestRuntime(
  layout: LegacyInventoryPaperdollLayoutRuntime,
  logicalX: number,
  logicalY: number
): LegacyHudPanelHitRuntime | null {
  const x = Number(logicalX) | 0;
  const y = Number(logicalY) | 0;
  for (const cell of layout.inventoryCells) {
    if (rectContains(cell, x, y)) {
      return { kind: "inventory", index: cell.index | 0 };
    }
  }
  if (rectContains(layout.portrait, x, y)) {
    return { kind: "portrait", index: 0 };
  }
  for (const slot of layout.equipSlots) {
    if (rectContains(slot, x, y)) {
      return { kind: "equip", slot: slot.slot | 0 };
    }
  }
  return null;
}

export function buildInventoryEquipRegressionProbesRuntime(
  layout: LegacyInventoryPaperdollLayoutRuntime
): {
  inventory_to_equip: Array<{ source_index: number; target_slot: number; action: "equip_attempt" }>;
  equip_to_inventory: Array<{ source_slot: number; target_index: number; action: "unequip_attempt" }>;
} {
  const inventory_to_equip: Array<{ source_index: number; target_slot: number; action: "equip_attempt" }> = [];
  const equip_to_inventory: Array<{ source_slot: number; target_index: number; action: "unequip_attempt" }> = [];

  for (const cell of layout.inventoryCells) {
    for (const slot of layout.equipSlots) {
      inventory_to_equip.push({
        source_index: cell.index | 0,
        target_slot: slot.slot | 0,
        action: "equip_attempt"
      });
    }
  }

  for (const slot of layout.equipSlots) {
    for (const cell of layout.inventoryCells) {
      equip_to_inventory.push({
        source_slot: slot.slot | 0,
        target_index: cell.index | 0,
        action: "unequip_attempt"
      });
    }
  }

  return {
    inventory_to_equip,
    equip_to_inventory
  };
}

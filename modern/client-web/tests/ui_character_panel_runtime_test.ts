import assert from "node:assert/strict";
import {
  buildCharacterPanelRenderPlanRuntime,
  CHARACTER_PANEL_SLOTS_RUNTIME,
  projectCharacterPanelPicksRuntime
} from "../ui/character_panel_runtime.ts";

assert.deepEqual(CHARACTER_PANEL_SLOTS_RUNTIME, [
  { x: 8, y: 8, w: 76, h: 96 },
  { x: 90, y: 8, w: 76, h: 96 },
  { x: 172, y: 8, w: 76, h: 96 },
  { x: 254, y: 8, w: 76, h: 96 }
]);

{
  const plan = buildCharacterPanelRenderPlanRuntime({
    canvasH: 120,
    canvasW: 340,
    dataReady: false
  });
  assert.deepEqual(plan.background, { fillStyle: "#090909", x: 0, y: 0, w: 340, h: 120 });
  assert.equal(plan.slotRects.length, 4);
  assert.deepEqual(plan.slotRects[0], { fillStyle: "#111827", x: 8, y: 8, w: 76, h: 96 });
  assert.deepEqual(plan.slotStrokes[0], { strokeStyle: "#334155", x: 8.5, y: 8.5, w: 75, h: 95 });
  assert.deepEqual(plan.message, {
    color: "#94a3b8",
    font: "11px var(--vm-ui-font), monospace",
    text: "Awaiting actor sprite data...",
    x: 12,
    y: 22
  });
  assert.deepEqual(plan.sprites, []);
  assert.deepEqual(plan.texts, []);
}

{
  const plan = buildCharacterPanelRenderPlanRuntime({
    canvasH: 120,
    canvasW: 340,
    dataReady: true,
    picks: [
      { label: "AVATAR", tileId: 0x123 },
      { label: "NPC 4", tileId: null }
    ],
    slots: [
      { x: 8, y: 8, w: 76, h: 96 },
      { x: 90, y: 8, w: 76, h: 96 }
    ]
  });
  assert.equal(plan.message, null);
  assert.deepEqual(plan.texts, [
    { color: "#9ca3af", font: "10px var(--vm-ui-font), monospace", text: "AVATAR", x: 14, y: 20 },
    { color: "#64748b", font: "9px var(--vm-ui-font), monospace", text: "0x123", x: 14, y: 96 },
    { color: "#9ca3af", font: "10px var(--vm-ui-font), monospace", text: "NPC 4", x: 96, y: 20 }
  ]);
  assert.deepEqual(plan.sprites, [{
    destH: 48,
    destW: 48,
    destX: 22,
    destY: 28,
    sourceH: 16,
    sourceW: 16,
    sourceX: 0,
    sourceY: 0,
    tileId: 0x123
  }]);
}

{
  const animatedInputs: number[] = [];
  const picks = projectCharacterPanelPicksRuntime({
    avatarEntityId: 1,
    avatarTileId: 0x123,
    entities: [
      { id: 1, x: 10, y: 10, z: 0, baseTile: 0x100, frame: 0 },
      { id: 6, x: 12, y: 10, z: 0, baseTile: 0x200, frame: 2 },
      { id: 3, x: 9, y: 10, z: 0, baseTile: 0x300, frame: 1 },
      { id: 4, x: 10, y: 12, z: 1, baseTile: 0x400, frame: 0 },
      { id: 2, x: 11, y: 10, z: 0, baseTile: 0x500, frame: 3 },
      { id: 5, x: 14, y: 10, z: 0, baseTile: 0x600, frame: 4 }
    ],
    playerX: 10,
    playerY: 10,
    playerZ: 0,
    resolveAnimatedTile: (entity) => {
      animatedInputs.push(entity.tileId);
      return (entity.tileId + 0x10) & 0xffff;
    },
    slotCount: 4
  });
  assert.deepEqual(animatedInputs, [0x503, 0x301, 0x202]);
  assert.deepEqual(picks, [
    { label: "AVATAR", tileId: 0x123 },
    { label: "NPC 2", tileId: 0x513 },
    { label: "NPC 3", tileId: 0x311 },
    { label: "NPC 6", tileId: 0x212 }
  ]);
}

{
  const picks = projectCharacterPanelPicksRuntime({
    avatarEntityId: 1,
    avatarTileId: null,
    entities: null,
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    resolveAnimatedTile: (entity) => entity.tileId,
    slotCount: 3
  });
  assert.deepEqual(picks, [
    { label: "AVATAR", tileId: null },
    { label: "EMPTY", tileId: null },
    { label: "EMPTY", tileId: null }
  ]);
}

console.log("ui_character_panel_runtime_test: ok");

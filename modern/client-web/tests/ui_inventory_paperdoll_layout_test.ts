import assert from "node:assert/strict";
import {
  buildInventoryEquipRegressionProbesRuntime,
  buildLegacyInventoryPaperdollLayoutRuntime,
  legacyInventoryPaperdollHitTestRuntime
} from "../ui/inventory_paperdoll_layout_runtime.ts";

function testCmd92Layout() {
  const layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x92,
    talkStatusDisplay: 0x9e,
    talkShowInventory: true
  });
  assert.equal(layout.inTalkPanel, false, "CMD_92 should not be talk panel");
  assert.equal(layout.showEquipment, true, "CMD_92 should show equipment");
  assert.equal(layout.showBagGrid, true, "CMD_92 should show bag grid");
  assert.equal(layout.equipOffsetY, 0, "CMD_92 equip offset mismatch");
  assert.deepEqual(layout.portrait, { x: 272, y: 16, w: 16, h: 16 }, "CMD_92 portrait mismatch");
  assert.equal(layout.inventoryCells.length, 12, "inventory cell count mismatch");
  assert.equal(layout.equipSlots.length, 8, "equip slot count mismatch");
  assert.equal(layout.anchors.inventory_hitbox, "C_155D_1267", "inventory anchor mismatch");
  assert.equal(layout.anchors.equip_hitbox, "C_155D_130E", "equip anchor mismatch");
}

function testTalkLayoutWithInventory() {
  const layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x9e,
    talkStatusDisplay: 0x9e,
    talkShowInventory: true
  });
  assert.equal(layout.inTalkPanel, true, "talk panel expected");
  assert.equal(layout.showEquipment, true, "talk+inventory should show equipment");
  assert.equal(layout.showBagGrid, false, "talk panel should hide bag grid");
  assert.equal(layout.equipOffsetY, 8, "talk equip offset mismatch");
  assert.deepEqual(layout.portrait, { x: 248, y: 24, w: 56, h: 64 }, "talk portrait mismatch");
}

function testTalkLayoutPortraitOnly() {
  const layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x9e,
    talkStatusDisplay: 0x9e,
    talkShowInventory: false
  });
  assert.equal(layout.showEquipment, false, "talk portrait-only should hide equipment");
  assert.equal(layout.showBagGrid, false, "talk portrait-only should hide bag grid");
  assert.equal(layout.equipSlots.length, 0, "talk portrait-only should have no equip slots");
  assert.deepEqual(layout.portrait, { x: 216, y: 24, w: 56, h: 64 }, "portrait-only location mismatch");
}

function testHitboxes() {
  const cmd92 = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x92,
    talkStatusDisplay: 0x9e,
    talkShowInventory: true
  });
  assert.deepEqual(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 249, 33),
    { kind: "inventory", index: 0 },
    "inventory slot 0 hit mismatch"
  );
  assert.deepEqual(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 304, 72),
    { kind: "inventory", index: 11 },
    "inventory slot 11 hit mismatch"
  );
  assert.deepEqual(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 200, 16),
    { kind: "equip", slot: 0 },
    "head slot hit mismatch"
  );
  assert.deepEqual(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 224, 40),
    { kind: "equip", slot: 5 },
    "left hand slot hit mismatch"
  );
  assert.deepEqual(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 273, 17),
    { kind: "portrait", index: 0 },
    "portrait hit mismatch"
  );
  assert.equal(
    legacyInventoryPaperdollHitTestRuntime(cmd92, 320, 199),
    null,
    "out-of-range hit should be null"
  );
}

function testRegressionProbeMatrix() {
  const layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x92,
    talkStatusDisplay: 0x9e,
    talkShowInventory: true
  });
  const probes = buildInventoryEquipRegressionProbesRuntime(layout);
  assert.equal(probes.inventory_to_equip.length, 96, "inventory->equip probe count mismatch");
  assert.equal(probes.equip_to_inventory.length, 96, "equip->inventory probe count mismatch");
  assert.deepEqual(
    probes.inventory_to_equip[0],
    { source_index: 0, target_slot: 0, action: "equip_attempt" },
    "first equip probe mismatch"
  );
  assert.deepEqual(
    probes.equip_to_inventory[0],
    { source_slot: 0, target_index: 0, action: "unequip_attempt" },
    "first unequip probe mismatch"
  );
}

testCmd92Layout();
testTalkLayoutWithInventory();
testTalkLayoutPortraitOnly();
testHitboxes();
testRegressionProbeMatrix();

console.log("ui_inventory_paperdoll_layout_test: ok");

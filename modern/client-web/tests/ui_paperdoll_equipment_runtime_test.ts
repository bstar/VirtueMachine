import assert from "node:assert/strict";
import {
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_LOCXYZ
} from "../../common/u6_object_constants.ts";
import {
  buildLegacyEquipmentResolutionRegressionProbesRuntime,
  legacyEquipmentSlotsForTalkActorRuntime,
  legacyEquipSlotForTileRuntime,
  projectLegacyEquipmentSlotsRuntime,
  resolveLegacyEquipmentCandidatesRuntime,
  selectLegacyEquipmentAssocRowsRuntime
} from "../ui/paperdoll_equipment_runtime.ts";

function testTileToSlotMap() {
  assert.equal(legacyEquipSlotForTileRuntime(0x200), 0, "head slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x250), 1, "neck slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x220), 2, "right-hand slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x208), 5, "left-hand slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x228), 8, "two-handed pseudo-slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x258), 9, "ring pseudo-slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x21a), 7, "feet slot mapping mismatch");
  assert.equal(legacyEquipSlotForTileRuntime(0x111), -1, "unknown tile should be unmapped");
}

function testSlotOverlapResolution() {
  const resolution = resolveLegacyEquipmentCandidatesRuntime([
    { slot_hint: 2, tile_id: 0x220, object_key: "rh_0" },
    { slot_hint: 8, tile_id: 0x228, object_key: "2h_0" },
    { slot_hint: 9, tile_id: 0x258, object_key: "ring_0" },
    { slot_hint: 9, tile_id: 0x37d, object_key: "ring_1" },
    { slot_hint: 9, tile_id: 0x37e, object_key: "ring_2" }
  ]);
  const slots = resolution.placed.map((p) => p.slot | 0);
  assert.deepEqual(slots, [2, 3, 5, 6], "resolved slot occupancy mismatch");
  assert.equal(resolution.dropped.length, 1, "expected one dropped ring due to occupied fingers");
  assert.equal(resolution.dropped[0].reason, "slot_occupied", "drop reason mismatch");
}

function testProjectionOrdering() {
  const projected = projectLegacyEquipmentSlotsRuntime([
    { tileId: 0x228, object_key: "2h_0" },
    { tileId: 0x220, object_key: "rh_0" },
    { tileId: 0x258, object_key: "ring_0" }
  ]);
  assert.deepEqual(
    projected.map((p) => ({ slot: p.slot, key: p.object_key })),
    [
      { slot: 2, key: "2h_0" },
      { slot: 3, key: "ring_0" },
      { slot: 5, key: "rh_0" }
    ],
    "projection should preserve canonical first-fit slot semantics"
  );
}

function testAssocRowSelection() {
  const actor = { id: 12, type: 0x18f, x: 40, y: 50, z: 0 };
  const rows = [
    { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 99, index: 4, tileId: 0x200, type: 0x200, order: 4 },
    { coordUse: OBJ_COORD_USE_LOCXYZ, assocIndex: 12, index: 5, tileId: 0x200, type: 0x200, order: 5 },
    { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 12, index: 6, tileId: 0x150, type: 0x150, order: 6 },
    { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 12, index: 7, tileId: 0x220, type: 0x220, order: 20 },
    { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 12, index: 8, tileId: 0x258, type: 0x258, legacyOrder: 10, order: 30 }
  ];
  const selected = selectLegacyEquipmentAssocRowsRuntime({
    actor,
    rows,
    useObjblkOwnerFallback: false
  });
  assert.deepEqual(selected.map((row) => row.index), [8, 7], "entity equipment rows should filter and sort canonically");
}

function testTalkActorEquipmentEntityWinsOverFallback() {
  const actor = { id: 12, type: 0x18f, x: 40, y: 50, z: 0 };
  const projected = legacyEquipmentSlotsForTalkActorRuntime({
    actor,
    entityAssocEntries: [
      { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 12, index: 7, sourceArea: 3, tileId: 0x220, type: 0x220, order: 0 }
    ],
    objectAssocEntries: [
      { coordUse: OBJ_COORD_USE_EQUIP, assocIndex: 12, index: 9, sourceArea: 5, tileId: 0x200, type: 0x200, order: 0 }
    ]
  });
  assert.deepEqual(
    projected.map((p) => ({ slot: p.slot, key: p.object_key })),
    [{ slot: 2, key: "objblk:3:7" }],
    "entity assoc equipment should be canonical before objblk fallback"
  );
}

function testTalkActorEquipmentObjblkOwnerFallback() {
  const actor = { id: 12, type: 0x18f, x: 40, y: 50, z: 0 };
  const owner = { coordUse: OBJ_COORD_USE_LOCXYZ, index: 1, type: 0x18f, x: 40, y: 50, z: 0 };
  const container = { coordUse: OBJ_COORD_USE_EQUIP, index: 2, assocObj: owner, type: 0x100 };
  const projected = legacyEquipmentSlotsForTalkActorRuntime({
    actor,
    entityAssocEntries: [],
    objectAssocEntries: [
      {
        coordUse: OBJ_COORD_USE_EQUIP,
        assocIndex: 99,
        assocObj: container,
        index: 11,
        sourceArea: 6,
        tileId: 0x258,
        type: 0x258,
        order: 0
      }
    ]
  });
  assert.deepEqual(
    projected.map((p) => ({ slot: p.slot, key: p.object_key })),
    [{ slot: 3, key: "objblk:6:11" }],
    "objblk fallback should follow assoc owner chain back to the actor"
  );
}

function testDeterministicRegressionCases() {
  const probes = buildLegacyEquipmentResolutionRegressionProbesRuntime();
  assert.equal(probes.cases.length, 6, "probe scenario count mismatch");
  assert.deepEqual(
    probes.cases[0],
    {
      id: "two_handed_prefers_right",
      placed_slots: [2],
      dropped_count: 0,
      dropped_reasons: []
    },
    "first probe scenario mismatch"
  );
  const overflow = probes.cases.find((c) => c.id === "ring_and_two_handed_with_overflow_drop");
  assert.ok(overflow, "overflow probe missing");
  assert.equal(overflow!.dropped_count, 2, "overflow probe dropped count mismatch");
}

testTileToSlotMap();
testSlotOverlapResolution();
testProjectionOrdering();
testAssocRowSelection();
testTalkActorEquipmentEntityWinsOverFallback();
testTalkActorEquipmentObjblkOwnerFallback();
testDeterministicRegressionCases();

console.log("ui_paperdoll_equipment_runtime_test: ok");

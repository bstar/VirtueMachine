import assert from "node:assert/strict";
import {
  buildLegacyEquipmentResolutionRegressionProbesRuntime,
  legacyEquipSlotForTileRuntime,
  projectLegacyEquipmentSlotsRuntime,
  resolveLegacyEquipmentCandidatesRuntime
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
testDeterministicRegressionCases();

console.log("ui_paperdoll_equipment_runtime_test: ok");

import assert from "node:assert/strict";
import {
  buildTargetResolverRegressionProbesRuntime,
  nearestTalkTargetAtCellRuntime,
  topWorldObjectAtCellRuntime
} from "../sim/target_runtime.ts";

function testTopWorldObjectSelection() {
  const objectLayer = {
    objectsAt: (_x: number, _y: number, _z: number) => ([
      { key: "low", renderable: true, legacyOrder: 3, order: 3, index: 1, type: 0x90 },
      { key: "high", renderable: true, legacyOrder: 30, order: 30, index: 2, type: 0x91 }
    ])
  };
  const deps = {
    isObjectRemoved: (_sim: any, _obj: any) => false,
    isLikelyPickupObjectType: (_type: number) => true
  };
  const pick = topWorldObjectAtCellRuntime(objectLayer as any, {}, 0, 0, 0, {}, deps);
  assert.equal(pick?.key, "high", "highest legacy order should be selected");
}

function testTalkTargetSelection() {
  const pick = nearestTalkTargetAtCellRuntime(
    [
      { id: 1, x: 10, y: 10, z: 0, legacyOrder: 100, order: 100 },
      { id: 2, x: 10, y: 10, z: 0, legacyOrder: 2, order: 2 },
      { id: 3, x: 10, y: 10, z: 0, legacyOrder: 5, order: 5 }
    ],
    10,
    10,
    0,
    1
  );
  assert.equal(pick?.id, 3, "talk target should ignore avatar and pick highest-order overlap");
}

function testRegressionProbes() {
  const probes = buildTargetResolverRegressionProbesRuntime();
  assert.equal(probes.world_overlap_cases.length, 2, "world overlap probe count mismatch");
  assert.equal(probes.talk_overlap_cases.length, 2, "talk overlap probe count mismatch");
  assert.deepEqual(
    probes.world_overlap_cases[0],
    { id: "highest_legacy_order_wins", selected: "b" },
    "world overlap probe mismatch"
  );
  assert.deepEqual(
    probes.talk_overlap_cases[0],
    { id: "highest_order_non_avatar_wins", selected_id: 3 },
    "talk overlap probe mismatch"
  );
}

testTopWorldObjectSelection();
testTalkTargetSelection();
testRegressionProbes();

console.log("ui_target_runtime_test: ok");

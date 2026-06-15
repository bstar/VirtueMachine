import assert from "node:assert/strict";
import {
  buildTargetResolverRegressionProbesRuntime,
  nearestTalkTargetAtCellRuntime,
  resolveAttackTargetAtCellRuntime,
  resolveLegacyGetSelectionRuntime,
  resolveLookTargetAtCellRuntime,
  resolvePickupTargetAtCellRuntime,
  resolveTalkTargetAtCellRuntime,
  topWorldObjectAtCellRuntime,
  type TargetObjectLayerRuntime,
  type TargetWorldObjectRuntime
} from "../sim/target_runtime.ts";
import { isLikelyPickupObjectTypeRuntime } from "../sim/object_types_runtime.ts";

function testTopWorldObjectSelection() {
  const objectLayer: TargetObjectLayerRuntime = {
    objectsAt: (_x: number, _y: number, _z: number) => ([
      { key: "low", renderable: true, legacyOrder: 3, order: 3, index: 1, type: 0x90, frame: 0 },
      { key: "high", renderable: true, legacyOrder: 30, order: 30, index: 2, type: 0x91, frame: 0 }
    ])
  };
  const deps = {
    isObjectRemoved: (_sim: unknown, _obj: TargetWorldObjectRuntime) => false,
    isLikelyPickupObjectType: (_type: number) => true
  };
  const pick = topWorldObjectAtCellRuntime(objectLayer, {}, 0, 0, 0, {}, deps);
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

function testLookTargetResolution() {
  const objectLayer: TargetObjectLayerRuntime = {
    objectsAt: () => [{ key: "item", renderable: true, baseTile: 0x300, frame: 2, type: 0x90 }]
  };
  const deps = {
    isObjectRemoved: (_sim: unknown, _obj: TargetWorldObjectRuntime) => false,
    isLikelyPickupObjectType: (_type: number) => true
  };
  assert.deepEqual(resolveLookTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    objectLayer,
    entityEntries: [],
    mapTileAt: () => 0x111,
    sim: {},
    tx: 12,
    ty: 10,
    avatarEntityId: 1,
    deps
  }), { ok: true, source: "object", tileId: 0x302, x: 12, y: 10, z: 0 });
  assert.deepEqual(resolveLookTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    objectLayer: null,
    entityEntries: [],
    mapTileAt: () => 0x111,
    sim: {},
    tx: 30,
    ty: 10,
    avatarEntityId: 1,
    deps
  }), { ok: false, reason: "out_of_range", x: 30, y: 10, z: 0 });
}

function testTalkTargetResolution() {
  assert.deepEqual(resolveTalkTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    entityEntries: [{ id: 2, x: 11, y: 10, z: 0, legacyOrder: 1 }],
    tx: 11,
    ty: 10,
    avatarEntityId: 1
  }), { actor: { id: 2, x: 11, y: 10, z: 0, legacyOrder: 1 }, ok: true, x: 11, y: 10, z: 0 });
  assert.deepEqual(resolveTalkTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    entityEntries: [],
    tx: 12,
    ty: 10,
    avatarEntityId: 1
  }), { actor: null, ok: false, reason: "out_of_range", x: 12, y: 10, z: 0 });
}

function testPickupTargetResolution() {
  const objectLayer: TargetObjectLayerRuntime = {
    objectsAt: (x: number, y: number) => (x === 11 && y === 10 ? [
      { key: "door", renderable: true, legacyOrder: 50, type: 0x129, frame: 0 },
      { key: "shadow", renderable: true, legacyOrder: 40, type: 0x104, frame: 0 },
      { key: "sign", renderable: true, legacyOrder: 30, type: 0x14c, frame: 3 },
      { key: "item", renderable: true, legacyOrder: 10, type: 0x90, frame: 0 }
    ] : [])
  };
  const deps = {
    isObjectRemoved: (_sim: unknown, _obj: TargetWorldObjectRuntime) => false,
    isLikelyPickupObjectType: isLikelyPickupObjectTypeRuntime
  };
  const result = resolvePickupTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    objectLayer,
    sim: {},
    tx: 11,
    ty: 10,
    deps
  });
  assert.equal(result.ok && result.object.key, "item");
  assert.deepEqual(resolvePickupTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 0 },
    objectLayer: null,
    sim: {},
    tx: 11,
    ty: 10,
    deps
  }), { object: null, ok: false, reason: "no_object", x: 11, y: 10, z: 0 });
}

function testLegacyGetSelectionResolution() {
  const deps = {
    isObjectRemoved: (_sim: unknown, _obj: TargetWorldObjectRuntime) => false,
    isLikelyPickupObjectType: isLikelyPickupObjectTypeRuntime,
    isTileIgnored: (tileId: number) => tileId === 0x777,
    isTerrainDamageTile: (_tileId: number) => false
  };
  const world = { map_x: 10, map_y: 10, map_z: 0 };
  const stack = [
    { object_key: "mug", renderable: true, legacy_order: 443, type: 0x078, frame: 0, tile_id: 0x285, status: 0, x: 11, y: 10, z: 0 },
    { object_key: "table", renderable: true, legacy_order: 444, type: 0x117, frame: 1, tile_id: 0x3c1, status: 0, x: 11, y: 10, z: 0 }
  ];
  const mug = resolveLegacyGetSelectionRuntime({
    world,
    objects: stack,
    sim: {},
    tx: 11,
    ty: 10,
    deps
  });
  assert.equal(mug.ok && mug.object.object_key, "mug", "legacy get should select the first visible stack object before validating portability");

  const fixture = resolveLegacyGetSelectionRuntime({
    world,
    objects: [{ object_key: "table", renderable: true, legacy_order: 1, type: 0x117, frame: 1, tile_id: 0x3c1, status: 0, x: 11, y: 10, z: 0 }],
    sim: {},
    tx: 11,
    ty: 10,
    deps
  });
  assert.equal(fixture.ok, false);
  assert.equal(!fixture.ok && fixture.reason, "not_portable", "selected fixtures should fail instead of scanning for unrelated objects");

  const ignored = resolveLegacyGetSelectionRuntime({
    world,
    objects: [
      { object_key: "ignored", renderable: true, legacy_order: 1, type: 0x090, frame: 0, tile_id: 0x777, status: 0, x: 11, y: 10, z: 0 },
      { object_key: "real", renderable: true, legacy_order: 2, type: 0x090, frame: 0, tile_id: 0x300, status: 0, x: 11, y: 10, z: 0 }
    ],
    sim: {},
    tx: 11,
    ty: 10,
    deps
  });
  assert.equal(ignored.ok && ignored.object.object_key, "real", "tile-ignored selections should fall back like C_27A1_0919");
}

function testAttackTargetResolution() {
  const result = resolveAttackTargetAtCellRuntime({
    world: { map_x: 10, map_y: 10, map_z: 1 },
    entityEntries: [
      { id: 1, x: 12, y: 10, z: 1, legacyOrder: 999 },
      { id: 2, x: 12, y: 10, z: 0, legacyOrder: 999 },
      { id: 3, x: 12, y: 10, z: 1, legacyOrder: 5 },
      { id: 4, x: 12, y: 10, z: 1, legacyOrder: 9 }
    ],
    tx: 12,
    ty: 10,
    avatarEntityId: 1
  });
  assert.equal(result.actor?.id, 4);
  assert.deepEqual(
    resolveAttackTargetAtCellRuntime({
      world: { map_x: 10, map_y: 10, map_z: 1 },
      entityEntries: [{ id: 1, x: 12, y: 10, z: 1, legacyOrder: 999 }],
      tx: 12,
      ty: 10,
      avatarEntityId: 1
    }),
    { actor: null, x: 12, y: 10, z: 1 }
  );
}

testTopWorldObjectSelection();
testTalkTargetSelection();
testRegressionProbes();
testLookTargetResolution();
testTalkTargetResolution();
testPickupTargetResolution();
testLegacyGetSelectionResolution();
testAttackTargetResolution();

console.log("ui_target_runtime_test: ok");

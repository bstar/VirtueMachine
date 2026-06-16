import assert from "node:assert/strict";
import {
  buildTargetResolverRegressionProbesRuntime,
  formatLegacyGetFailureTextRuntime,
  formatLegacyGetPickedTextRuntime,
  formatLegacyGetTakingTextRuntime,
  formatLegacyLookOutOfRangeTextRuntime,
  formatLegacyLookResultTextRuntime,
  formatLegacyTalkAuthoritativeStartTextRuntime,
  formatLegacyTalkFailureTextRuntime,
  formatLegacyTalkStartedTextRuntime,
  legacyDropAsyncFailurePresentationRuntime,
  legacyDropPlacedPresentationRuntime,
  legacyGetTerrainDamageTileRuntime,
  legacyGetAsyncFailurePresentationRuntime,
  legacyGetCheckingPresentationRuntime,
  legacyGetFailurePresentationRuntime,
  legacyGetPickedPresentationRuntime,
  legacyGetTakingPresentationRuntime,
  legacyGetTileIgnoredRuntime,
  legacyLookPresentationRuntime,
  legacyTalkAsyncFailurePresentationRuntime,
  legacyTalkAuthoritativeStartedPresentationRuntime,
  legacyTalkAuthoritativeStartPresentationRuntime,
  legacyTalkFallbackPresentationRuntime,
  legacyTalkFailurePresentationRuntime,
  legacyTalkStartedPresentationRuntime,
  nearestTalkTargetAtCellRuntime,
  resolveAttackTargetAtCellRuntime,
  resolveLegacyGetSelectionRuntime,
  resolveLookTargetAtCellRuntime,
  resolvePickupTargetAtCellRuntime,
  resolveTalkTargetAtCellRuntime,
  targetObjectsFromObjectLayerEntriesRuntime,
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

  const footprintObject = resolveLegacyGetSelectionRuntime({
    world,
    objects: [
      { object_key: "foot_rail", renderable: true, legacy_order: 568, type: 0x0e0, frame: 2, tile_id: 0x349, status: 0, x: 11, y: 10, z: 0 },
      {
        object_key: "jug",
        renderable: true,
        legacy_order: 567,
        type: 0x078,
        frame: 0,
        tile_id: 0x285,
        status: 0,
        x: 12,
        y: 10,
        z: 0,
        footprint: [{ x: 11, y: 10, z: 0 }]
      }
    ],
    sim: {},
    tx: 11,
    ty: 10,
    deps
  });
  assert.equal(footprintObject.ok && footprintObject.object.object_key, "jug", "server footprint objects should be selectable at occupied cells");
}

function testLegacyGetTileFlagPredicates() {
  assert.equal(legacyGetTileIgnoredRuntime(0x123, null), false);
  assert.equal(legacyGetTerrainDamageTileRuntime(0x123, null), false);

  const tileFlags2 = new Uint8Array(0x800);
  const terrainType = new Uint8Array(0x800);
  tileFlags2[0x123] = 0x10;
  terrainType[0x123] = 0x08;

  assert.equal(legacyGetTileIgnoredRuntime(0x123, tileFlags2), true);
  assert.equal(legacyGetTileIgnoredRuntime(0x923, tileFlags2), true);
  assert.equal(legacyGetTileIgnoredRuntime(0x124, tileFlags2), false);

  assert.equal(legacyGetTerrainDamageTileRuntime(0x123, terrainType), true);
  assert.equal(legacyGetTerrainDamageTileRuntime(0x923, terrainType), true);
  assert.equal(legacyGetTerrainDamageTileRuntime(0x124, terrainType), false);

  tileFlags2[0x125] = 0x08;
  terrainType[0x125] = 0x10;
  assert.equal(legacyGetTileIgnoredRuntime(0x125, tileFlags2), false);
  assert.equal(legacyGetTerrainDamageTileRuntime(0x125, terrainType), false);
}

function testObjectLayerTargetProjection() {
  assert.deepEqual(targetObjectsFromObjectLayerEntriesRuntime([
    {
      assocIndex: 0,
      baseTile: 0x280,
      coordUse: 0,
      frame: 5,
      index: 12,
      legacyOrder: 44,
      order: 33,
      renderable: true,
      sourceArea: 0x1a,
      sourceIndex: 0x123,
      status: 0,
      tileId: 0x285,
      type: 0x078,
      x: 11,
      y: 10,
      z: 0
    },
    {
      assocIndex: 0,
      baseTile: 0x300,
      coordUse: 0,
      frame: 1,
      index: 13,
      legacyOrder: 45,
      objectKey: "auth-key",
      order: 34,
      renderable: true,
      sourceArea: 0x1a,
      sourceIndex: 0x124,
      status: 0,
      tileId: 0x301,
      type: 0x090,
      x: 12,
      y: 10,
      z: 0
    }
  ]).map((obj) => ({
    key: obj.key,
    legacy_order: obj.legacy_order,
    object_key: obj.object_key,
    tile_id: obj.tile_id
  })), [
    {
      key: "11,10,0,33,120",
      legacy_order: 44,
      object_key: "11,10,0,33,120",
      tile_id: 0x285
    },
    {
      key: "auth-key",
      legacy_order: 45,
      object_key: "auth-key",
      tile_id: 0x301
    }
  ]);
}

function testLegacyGetFailureTextFormatting() {
  assert.equal(
    formatLegacyGetFailureTextRuntime("out_of_range", null, 12, 13, 0),
    "Get: target must be adjacent (12,13)."
  );
  assert.equal(
    formatLegacyGetFailureTextRuntime("terrain_damage", { object_key: "lava", type: 0x055 }, 12, 13, 0),
    "Get: 0x55 lava is hazardous."
  );
  assert.equal(
    formatLegacyGetFailureTextRuntime("not_portable", { object_key: "table", type: 0x117 }, 12, 13, 0),
    "Get: 0x117 table is not portable."
  );
  assert.equal(
    formatLegacyGetFailureTextRuntime("no_object", null, 12, 13, 0),
    "Get: nothing selectable at 12,13,0."
  );
  assert.equal(
    formatLegacyGetTakingTextRuntime({ type: 0x123 }, 12, 13, 0),
    "Get: taking 0x123 at 12,13,0..."
  );
  assert.equal(
    formatLegacyGetPickedTextRuntime({ type: 0x123 }, 12, 13, 0, "0x123:0x00", 2),
    "Get: picked 0x123 at 12,13,0 (inv 0x123:0x00=2)."
  );
  assert.deepEqual(
    legacyGetFailurePresentationRuntime("not_portable", { object_key: "table", type: 0x117 }, 12, 13, 0),
    {
      diagClass: "warn",
      diagText: "Get: 0x117 table is not portable."
    }
  );
  assert.deepEqual(legacyGetTakingPresentationRuntime({ type: 0x123 }, 12, 13, 0), {
    diagClass: "ok",
    diagText: "Get: taking 0x123 at 12,13,0..."
  });
  assert.deepEqual(legacyGetPickedPresentationRuntime({ type: 0x123 }, 12, 13, 0, "0x123:0x00", 2), {
    diagClass: "ok",
    diagText: "Get: picked 0x123 at 12,13,0 (inv 0x123:0x00=2)."
  });
  assert.deepEqual(legacyGetCheckingPresentationRuntime(12.9, 13.2, 0.8), {
    diagClass: "ok",
    diagText: "Get: checking 12,13,0..."
  });
  assert.deepEqual(legacyGetAsyncFailurePresentationRuntime("offline"), {
    diagClass: "warn",
    diagText: "Get failed: offline"
  });
  assert.deepEqual(legacyDropPlacedPresentationRuntime(12.9, 13.2, 0.8), {
    diagClass: "ok",
    diagText: "Drop: item placed at 12,13,0."
  });
  assert.deepEqual(legacyDropAsyncFailurePresentationRuntime("offline"), {
    diagClass: "warn",
    diagText: "Drop failed: offline"
  });
}

function testLegacyLookTalkTextFormatting() {
  assert.equal(formatLegacyLookOutOfRangeTextRuntime(12.9, 13.2), "Look: 12,13 is out of range.");
  assert.equal(
    formatLegacyLookResultTextRuntime("Thou dost see a cup.", 12, 13, 0),
    "Look: Thou dost see a cup. @ 12,13,0"
  );
  assert.deepEqual(legacyLookPresentationRuntime({
    ok: false,
    reason: "out_of_range",
    x: 12,
    y: 13,
    z: 0
  }, ""), {
    diagClass: "warn",
    diagText: "Look: 12,13 is out of range.",
    ledgerLines: ["Thou dost see nothing."],
    ok: false
  });
  assert.deepEqual(legacyLookPresentationRuntime({
    ok: true,
    source: "object",
    tileId: 0x120,
    x: 12,
    y: 13,
    z: 0
  }, "Thou dost see a cup."), {
    diagClass: "ok",
    diagText: "Look: Thou dost see a cup. @ 12,13,0",
    ledgerLines: ["Thou dost see a cup."],
    ok: true
  });
  assert.equal(
    formatLegacyTalkFailureTextRuntime("out_of_range", 12, 13, 0),
    "Talk: target must be adjacent (12,13)."
  );
  assert.equal(
    formatLegacyTalkFailureTextRuntime("no_actor", 12, 13, 0),
    "Talk: nobody there at 12,13,0."
  );
  assert.deepEqual(legacyTalkFailurePresentationRuntime({
    actor: null,
    ok: false,
    reason: "no_actor",
    x: 12,
    y: 13,
    z: 0
  }), {
    diagClass: "warn",
    diagText: "Talk: nobody there at 12,13,0.",
    ledgerLines: ["No one responds."],
    ok: false
  });
  assert.equal(
    formatLegacyTalkAuthoritativeStartTextRuntime(42),
    "Talk: contacting authoritative conversation service for actor 42..."
  );
  assert.deepEqual(legacyTalkAuthoritativeStartPresentationRuntime(42), {
    diagClass: "ok",
    diagText: "Talk: contacting authoritative conversation service for actor 42..."
  });
  assert.deepEqual(legacyTalkAsyncFailurePresentationRuntime("offline"), {
    diagClass: "warn",
    diagText: "Talk failed: offline"
  });
  assert.deepEqual(legacyTalkAuthoritativeStartedPresentationRuntime({
    targetName: "Dupre",
    tx: 12.9,
    ty: 13.2,
    tz: 0.8
  }), {
    diagClass: "ok",
    diagText: "Talk: Dupre (authoritative) at 12,13,0."
  });
  assert.deepEqual(legacyTalkFallbackPresentationRuntime("missing script"), {
    diagClass: "warn",
    diagText: "Talk fallback: missing script"
  });
  assert.equal(
    formatLegacyTalkStartedTextRuntime({
      actorId: 42,
      converseLoaded: true,
      rulesCount: 9,
      showInventory: false,
      speaker: "Dupre",
      targetObjNum: 7,
      targetType: 0x15f,
      tx: 12,
      ty: 13,
      tz: 0,
      valid: true
    }),
    "Talk: Dupre (actor id 42, conv id 7, type 0x15f) at 12,13,0; valid=1; rules=9; showInven=0; converse=loaded."
  );
  assert.deepEqual(legacyTalkStartedPresentationRuntime({
    actorId: 42,
    converseLoaded: true,
    rulesCount: 9,
    showInventory: false,
    speaker: "Dupre",
    targetObjNum: 7,
    targetType: 0x15f,
    tx: 12,
    ty: 13,
    tz: 0,
    valid: true
  }), {
    diagClass: "ok",
    diagText: "Talk: Dupre (actor id 42, conv id 7, type 0x15f) at 12,13,0; valid=1; rules=9; showInven=0; converse=loaded."
  });
  assert.deepEqual(legacyTalkStartedPresentationRuntime({
    actorId: 42,
    converseLoaded: false,
    rulesCount: 0,
    showInventory: true,
    speaker: "Dupre",
    targetObjNum: 7,
    targetType: 0x15f,
    tx: 12,
    ty: 13,
    tz: 0,
    valid: false
  }), {
    diagClass: "warn",
    diagText: "Talk: Dupre (actor id 42, conv id 7, type 0x15f) at 12,13,0; valid=0; rules=0; showInven=1; converse=missing."
  });
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
testLegacyGetTileFlagPredicates();
testObjectLayerTargetProjection();
testLegacyGetFailureTextFormatting();
testLegacyLookTalkTextFormatting();
testAttackTargetResolution();

console.log("ui_target_runtime_test: ok");

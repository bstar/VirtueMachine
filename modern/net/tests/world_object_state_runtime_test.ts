import assert from "node:assert/strict";
import {
  compareLegacyWorldObjectOrder,
  buildWorldObjectStateRuntime,
  findActiveObjectByKey,
  normalizeWorldObjectDeltas,
  parseBaseTileMapRuntime,
  parseObjBlkRecordsRuntime,
  persistPatchedObject,
  worldObjectMeta
} from "../world_object_state_runtime.ts";
import type { WorldObjectStateContainer } from "../world_object_types.ts";

function writeU16LE(bytes: Uint8Array, off: number, value: number) {
  bytes[off] = value & 0xff;
  bytes[off + 1] = (value >> 8) & 0xff;
}

function encodePackedCoord(x: number, y: number, z: number): [number, number, number] {
  return [
    x & 0xff,
    ((x >> 8) & 0x03) | ((y & 0x3f) << 2),
    ((y >> 6) & 0x0f) | ((z & 0x0f) << 4)
  ];
}

function writeObjRecord(bytes: Uint8Array, index: number, args: {
  amount?: number;
  assocIndex?: number;
  frame?: number;
  status: number;
  type: number;
  x?: number;
  y?: number;
  z?: number;
}) {
  const off = 2 + (index * 8);
  bytes[off] = args.status & 0xff;
  if ((args.status & 0x18) !== 0) {
    writeU16LE(bytes, off + 1, args.assocIndex ?? 0);
    bytes[off + 3] = 0;
  } else {
    const [raw0, raw1, raw2] = encodePackedCoord(args.x ?? 0, args.y ?? 0, args.z ?? 0);
    bytes[off + 1] = raw0;
    bytes[off + 2] = raw1;
    bytes[off + 3] = raw2;
  }
  writeU16LE(bytes, off + 4, ((args.frame ?? 0) << 10) | (args.type & 0x3ff));
  writeU16LE(bytes, off + 6, args.amount ?? 0);
}

const baseTileMap = parseBaseTileMapRuntime(new Uint8Array([0x00, 0x02, 0x34, 0x12]));
assert.equal(baseTileMap.length, 0x400);
assert.equal(baseTileMap[0], 0x0200);
assert.equal(baseTileMap[1], 0x1234);
assert.equal(parseBaseTileMapRuntime(null)[0], 0);

const objblk = new Uint8Array(2 + (3 * 8));
writeU16LE(objblk, 0, 5);
writeObjRecord(objblk, 0, { status: 0, type: 10, frame: 2, amount: 7, x: 5, y: 6, z: 0 });
writeObjRecord(objblk, 1, { status: 0x10, type: 11, assocIndex: 0 });
writeObjRecord(objblk, 2, { status: 0, type: 12, x: 3, y: 4, z: 0 });
const objectBaseTiles = new Uint16Array(0x400);
objectBaseTiles[10] = 0x200;
objectBaseTiles[11] = 0x300;
objectBaseTiles[12] = 0x400;
const parsedObjblk = parseObjBlkRecordsRuntime(objblk, 0x2a, objectBaseTiles);
assert.equal(parsedObjblk.length, 2);
assert.equal(parsedObjblk[0].object_key, "a2ai000");
assert.equal(parsedObjblk[0].type, 10);
assert.equal(parsedObjblk[0].frame, 2);
assert.equal(parsedObjblk[0].tile_id, 0x202);
assert.equal(parsedObjblk[0].amount, 7);
assert.equal(parsedObjblk[0].x, 5);
assert.equal(parsedObjblk[0].y, 6);
assert.equal(parsedObjblk[0].assoc_child_count, 1);
assert.equal(parsedObjblk[0].assoc_child_0010_count, 1);
assert.equal(parsedObjblk[0].legacy_order, 2);
assert.equal(parsedObjblk[1].object_key, "a2ai002");
assert.equal(parsedObjblk[1].legacy_order, 1);
assert.deepEqual(parseObjBlkRecordsRuntime(new Uint8Array([0]), 0, objectBaseTiles), []);

const deltas = normalizeWorldObjectDeltas({
  schema_version: 1,
  removed: {
    a00i001: true,
    a00i002: false
  },
  moved: {
    a00i003: {
      x: 10,
      y: 11,
      z: 0,
      status: 0x10,
      holder_kind: "npc",
      holder_id: "avatar"
    }
  },
  spawned: [
    {
      object_key: "inv:a00i001:avatar:1",
      type: 88,
      frame: 1,
      tile_id: 0x220,
      x: 4,
      y: 5,
      z: 0
    }
  ],
  respawns: {
    a00i001: {
      due_at_ms: 2000,
      taken_at_ms: 1000,
      respawn_ms: 600000,
      policy: "default"
    },
    invalid: {
      due_at_ms: -1
    }
  }
});

assert.equal(deltas.schema_version, 1);
assert.deepEqual(deltas.removed, { a00i001: true });
assert.equal(deltas.moved.a00i003.x, 10);
assert.equal(deltas.spawned[0].object_key, "inv:a00i001:avatar:1");
assert.equal(deltas.spawned[0].type, 88);
assert.equal(deltas.respawns.a00i001.due_at_ms, 2000);
assert.equal(deltas.respawns.invalid, undefined);

const builtWorldState = buildWorldObjectStateRuntime({
  baseline: {
    source_dir: "/baseline",
    objects: [
      { object_key: "hidden", status: 0, x: 1, y: 1, z: 0, legacy_order: 2 },
      { object_key: "respawned", status: 0, x: 2, y: 2, z: 0, legacy_order: 3 },
      { object_key: "moved", status: 0, x: 3, y: 3, z: 0, legacy_order: 1 }
    ]
  },
  buildObjectAnchorIndex: (objects) => new Map([["all", objects]]),
  nowMs: 1000,
  rawDeltas: {
    removed: {
      hidden: true,
      respawned: true
    },
    moved: {
      moved: {
        x: 30,
        y: 31,
        z: 1,
        status: null,
        holder_kind: "npc",
        holder_id: "avatar",
        holder_key: "k"
      }
    },
    respawns: {
      respawned: {
        due_at_ms: 999,
        taken_at_ms: 1,
        respawn_ms: 10,
        policy: "default"
      }
    },
    spawned: [
      {
        object_key: "spawned",
        x: 9,
        y: 9,
        z: 0,
        status: 0,
        type: 88,
        frame: 0,
        tile_id: 0x200
      }
    ]
  },
  terrainType: new Uint8Array([1]),
  tileFlags: new Uint8Array([2])
});
assert.deepEqual(builtWorldState.active.map((obj) => obj.object_key), ["spawned", "moved", "respawned"]);
assert.equal(builtWorldState.active[1].source_kind, "baseline_moved");
assert.equal(builtWorldState.active[1].x, 30);
assert.equal(builtWorldState.active[1].status, 0);
assert.equal(builtWorldState.active[2].source_kind, "baseline");
assert.equal(builtWorldState.active[0].source_kind, "spawned");
assert.equal(builtWorldState.activeByAnchor?.get("all")?.length, 3);
assert.equal(builtWorldState.tileFlags?.[0], 2);
assert.equal(builtWorldState.terrainType?.[0], 1);

assert.equal(
  compareLegacyWorldObjectOrder(
    { object_key: "b", legacy_order: 2, status: 0, x: 0, y: 0, z: 0 },
    { object_key: "a", legacy_order: 1, status: 0, x: 0, y: 0, z: 0 }
  ) > 0,
  true
);

const state: WorldObjectStateContainer = {
  worldObjects: {
    baseline: {
      source_dir: "/runtime/savegame",
      loaded_at: "2026-01-01T00:00:00.000Z",
      files_loaded: 64,
      baseline_count: 2
    },
    active: [
      {
        object_key: "a00i003",
        source_kind: "baseline",
        x: 1,
        y: 2,
        z: 0,
        status: 0,
        holder_kind: "none"
      },
      {
        object_key: "inv:a00i001:avatar:1",
        source_kind: "spawned",
        x: 4,
        y: 5,
        z: 0,
        status: 0x10,
        holder_kind: "npc",
        holder_id: "avatar"
      }
    ],
    deltas
  }
};

assert.equal(findActiveObjectByKey(state, "a00i003")?.x, 1);
persistPatchedObject(state, {
  object_key: "a00i003",
  source_kind: "baseline",
  x: 20,
  y: 21,
  z: 0,
  status: 0x10,
  holder_kind: "npc",
  holder_id: "avatar"
});
assert.equal(state.worldObjects.deltas.moved.a00i003.x, 20);

persistPatchedObject(state, {
  object_key: "inv:a00i001:avatar:1",
  source_kind: "spawned",
  x: 30,
  y: 31,
  z: 0,
  status: 0x10,
  holder_kind: "npc",
  holder_id: "avatar"
});
assert.equal(state.worldObjects.deltas.spawned[0].x, 30);

assert.deepEqual(worldObjectMeta(state, "savegame"), {
  baseline_dir: "savegame",
  source_dir: "/runtime/savegame",
  loaded_at: "2026-01-01T00:00:00.000Z",
  files_loaded: 64,
  baseline_count: 2,
  active_count: 2,
  delta_removed_count: 1,
  delta_moved_count: 1,
  delta_spawned_count: 1
});

console.log("world_object_state_runtime_test: ok");

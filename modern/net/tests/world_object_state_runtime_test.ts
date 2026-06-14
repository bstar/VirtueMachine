import assert from "node:assert/strict";
import {
  compareLegacyWorldObjectOrder,
  findActiveObjectByKey,
  normalizeWorldObjectDeltas,
  persistPatchedObject,
  worldObjectMeta
} from "../world_object_state_runtime.ts";
import type { WorldObjectStateContainer } from "../world_object_types.ts";

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

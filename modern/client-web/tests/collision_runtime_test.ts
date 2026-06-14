import assert from "node:assert/strict";
import { isBlockedAtRuntime } from "../sim/collision_runtime.ts";
import type { ObjectFootprintTileRuntime } from "../sim/object_footprint_runtime.ts";

type TestObject = {
  door?: boolean;
  open?: boolean;
  renderable?: boolean;
  solid?: boolean;
  type: number;
};

function deps(overrides: {
  entities?: { id: number; x: number; y: number; z: number }[];
  implicitSolid?: boolean;
  mapTile?: number;
  objectsAt?: (x: number, y: number, z: number) => readonly TestObject[];
  terrainFlags?: number;
  tileFlags?: number | ((tileId: number) => number);
  tiles?: readonly ObjectFootprintTileRuntime[];
} = {}) {
  const tileFlags = overrides.tileFlags ?? 0;
  return {
    avatarEntityId: 1,
    entities: overrides.entities ?? [],
    isDoorObject: (obj: TestObject) => obj.door === true,
    isDoorOpen: (obj: TestObject) => obj.open === true,
    isImplicitSolidObjectTile: () => overrides.implicitSolid === true,
    isSolidEnvObject: (obj: TestObject) => obj.solid === true,
    mapTileAt: () => overrides.mapTile ?? 0,
    objectFootprintTiles: () => overrides.tiles ?? [{ x: 10, y: 20, tileId: 0x400 }],
    objectsAt: overrides.objectsAt ?? null,
    terrainFlagsForTile: () => overrides.terrainFlags ?? 0,
    tileFlagsForTile: typeof tileFlags === "function" ? tileFlags : () => tileFlags
  };
}

assert.equal(isBlockedAtRuntime(10, 20, 0, deps({ tileFlags: 0x04 })), true);
assert.equal(isBlockedAtRuntime(10, 20, 0, deps({ terrainFlags: 0x04 })), true);
assert.equal(isBlockedAtRuntime(10, 20, 0, deps()), false);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: () => [{ renderable: true, solid: true, type: 0x100 }]
  })),
  true
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: () => [{ renderable: false, solid: true, type: 0x100 }]
  })),
  false
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    implicitSolid: true,
    objectsAt: () => [{ renderable: true, type: 0x100 }]
  })),
  true
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: () => [{ door: true, open: false, renderable: true, type: 0x12a }]
  })),
  true
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: () => [{ door: true, open: true, renderable: true, type: 0x12a }],
    tileFlags: 0
  })),
  false
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: () => [{ door: true, open: true, renderable: true, type: 0x12a }],
    tileFlags: 0x20
  })),
  true
);

assert.equal(
  isBlockedAtRuntime(10, 20, 0, deps({
    objectsAt: (x, y) => (x === 11 && y === 20 ? [{ renderable: true, solid: true, type: 0x100 }] : []),
    tiles: [{ x: 10, y: 20, tileId: 0x3ff }]
  })),
  true
);

assert.equal(isBlockedAtRuntime(10, 20, 0, deps({
  entities: [{ id: 2, x: 10, y: 20, z: 0 }]
})), true);
assert.equal(isBlockedAtRuntime(10, 20, 0, deps({
  entities: [{ id: 1, x: 10, y: 20, z: 0 }]
})), false);
assert.equal(isBlockedAtRuntime(10, 20, 0, deps({
  entities: [{ id: 2, x: 10, y: 20, z: 1 }]
})), false);

console.log("collision_runtime_test: ok");

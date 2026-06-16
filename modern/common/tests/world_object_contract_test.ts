import assert from "node:assert/strict";
import {
  WORLD_OBJECT_HOLDER_KINDS,
  normalizeWorldObjectHolderKindRuntime
} from "../world_object_contract.ts";

assert.deepEqual(WORLD_OBJECT_HOLDER_KINDS, ["none", "object", "npc"]);
assert.equal(normalizeWorldObjectHolderKindRuntime(" NPC "), "npc");
assert.equal(normalizeWorldObjectHolderKindRuntime("object"), "object");
assert.equal(normalizeWorldObjectHolderKindRuntime("bad"), "none");
assert.equal(normalizeWorldObjectHolderKindRuntime(null), "none");

console.log("world_object_contract_test: ok");

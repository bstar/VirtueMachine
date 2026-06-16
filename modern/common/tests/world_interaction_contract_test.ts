import assert from "node:assert/strict";
import {
  WORLD_OBJECT_INTERACTION_VERBS,
  WORLD_ROUTE_INTERACTION_VERBS,
  normalizeWorldObjectInteractionVerbRuntime,
  normalizeWorldRouteInteractionVerbRuntime,
  worldObjectInteractionVerbListRuntime
} from "../world_interaction_contract.ts";

assert.deepEqual(WORLD_OBJECT_INTERACTION_VERBS, ["take", "drop", "put", "equip"]);
assert.deepEqual(WORLD_ROUTE_INTERACTION_VERBS, ["take", "drop", "put", "equip", "talk"]);
assert.equal(worldObjectInteractionVerbListRuntime(), "take, drop, put, equip");

assert.equal(normalizeWorldObjectInteractionVerbRuntime(" TAKE "), "take");
assert.equal(normalizeWorldObjectInteractionVerbRuntime("talk"), null);
assert.equal(normalizeWorldObjectInteractionVerbRuntime("bad"), null);

assert.equal(normalizeWorldRouteInteractionVerbRuntime(" TALK "), "talk");
assert.equal(normalizeWorldRouteInteractionVerbRuntime("drop"), "drop");
assert.equal(normalizeWorldRouteInteractionVerbRuntime("bad"), null);

console.log("world_interaction_contract_test: ok");

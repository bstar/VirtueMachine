import assert from "node:assert/strict";

const {
  analyzeContainmentChainViaSimCore,
  analyzeContainmentChainsBatchViaSimCore
} = require("../world_assoc_chain_bridge.ts");

const LOCXYZ = 0x00;
const CONTAINED = 0x08;
const INVENTORY = 0x10;

const chest = {
  object_key: "a00i001",
  status: LOCXYZ,
  holder_kind: "none",
  holder_key: "",
  holder_id: ""
};
const apple = {
  object_key: "a00i002",
  status: CONTAINED,
  holder_kind: "object",
  holder_key: "a00i001",
  holder_id: ""
};
const carriedBag = {
  object_key: "inv:a00i003:avatar:1",
  status: INVENTORY,
  holder_kind: "npc",
  holder_key: "",
  holder_id: "avatar"
};
const containedGem = {
  object_key: "inv:a00i004:avatar:1",
  status: CONTAINED,
  holder_kind: "object",
  holder_key: "inv:a00i003:avatar:1",
  holder_id: ""
};

const accessible = analyzeContainmentChainViaSimCore([chest, apple], apple);
assert.equal(accessible.ok, true);
assert.deepEqual(accessible.value.assoc_chain, ["a00i001"]);
assert.equal(accessible.value.root_anchor_key, "a00i001");
assert.equal(accessible.value.blocked_by, "");
assert.equal(accessible.value.chain_accessible, true);

const parentOwned = analyzeContainmentChainViaSimCore([carriedBag, containedGem], containedGem);
assert.equal(parentOwned.ok, true);
assert.deepEqual(parentOwned.value.assoc_chain, ["inv:a00i003:avatar:1"]);
assert.equal(parentOwned.value.root_anchor_key, "inv:a00i003:avatar:1");
assert.equal(parentOwned.value.blocked_by, "parent-owned:inv:a00i003:avatar:1");
assert.equal(parentOwned.value.chain_accessible, false);

const batch = analyzeContainmentChainsBatchViaSimCore([chest, apple, carriedBag, containedGem], [apple, containedGem]);
assert.equal(batch.ok, true);
assert.deepEqual(batch.byKey.get("a00i002").assoc_chain, ["a00i001"]);
assert.equal(batch.byKey.get("a00i002").root_anchor_key, "a00i001");
assert.equal(batch.byKey.get("inv:a00i004:avatar:1").blocked_by, "parent-owned:inv:a00i003:avatar:1");

console.log("world_assoc_chain_bridge_test: ok");

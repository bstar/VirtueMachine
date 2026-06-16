import assert from "node:assert/strict";
import { isU6PortableObjectTypeRuntime } from "../../common/u6_object_constants.ts";

assert.equal(isU6PortableObjectTypeRuntime(0x097), true, "legacy book type should remain portable");
assert.equal(isU6PortableObjectTypeRuntime(0x0fa), false, "square table type must not be portable");
assert.equal(isU6PortableObjectTypeRuntime(0x104), false, "shadow objects must not be portable");
assert.equal(isU6PortableObjectTypeRuntime(0x103), false, "table-leg objects must not be portable");
assert.equal(isU6PortableObjectTypeRuntime(0x14c), false, "sign objects must not be portable");
assert.equal(isU6PortableObjectTypeRuntime(0x0e0), false, "foot rail fixtures must not be portable");
assert.equal(isU6PortableObjectTypeRuntime(0x090), true, "ordinary inventory objects should remain portable");

{
  const typeWeights = new Uint8Array(0x400);
  typeWeights[0x113] = 3;
  typeWeights[0x132] = 0;
  typeWeights[0x058] = 0;
  assert.equal(isU6PortableObjectTypeRuntime(0x113, typeWeights), true, "weighted potions should remain portable");
  assert.equal(isU6PortableObjectTypeRuntime(0x132, typeWeights), false, "zero-weight fixtures must not be portable");
  assert.equal(isU6PortableObjectTypeRuntime(0x058, typeWeights), true, "gold remains portable despite zero-weight exception");
}

console.log("u6_object_policy_common_test: ok");

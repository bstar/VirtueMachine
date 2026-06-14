import assert from "node:assert/strict";
import { errorMessageRuntime } from "../error_runtime.ts";

assert.equal(errorMessageRuntime(new Error("boom")), "boom");
assert.equal(errorMessageRuntime({ message: "plain object" }), "plain object");
assert.equal(errorMessageRuntime("text"), "text");
assert.equal(errorMessageRuntime(null, "fallback"), "fallback");

console.log("error_runtime_test: ok");

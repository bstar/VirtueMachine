import assert from "node:assert/strict";
import {
  conversationArchiveDiagRuntime,
  runtimeAssetFallbackDiagRuntime,
  runtimeAssetStatusTextRuntime
} from "../assets/runtime_asset_status.ts";

assert.deepEqual(runtimeAssetStatusTextRuntime({
  tileSetLoaded: true,
  paletteLoaded: true,
  objectFilesLoaded: 3,
  objectTotalLoaded: 42,
  animEntryCount: 7,
  entityTotalLoaded: 5
}), {
  diagClass: "diag ok",
  sourceText: "runtime assets + tile art",
  diagText: "Runtime assets loaded with tile decoder path. Object overlay active (42 objects from 3 objblk files). Animated tile remaps active (7 entries). Entity layer active (5 objlist actors)."
});

assert.deepEqual(runtimeAssetStatusTextRuntime({
  tileSetLoaded: true,
  paletteLoaded: true,
  objectFilesLoaded: 2,
  objectTotalLoaded: 30,
  animEntryCount: 0,
  entityTotalLoaded: 0
}), {
  diagClass: "diag ok",
  sourceText: "runtime assets + tile art",
  diagText: "Runtime assets loaded with tile decoder path. Object overlay active (30 objects from 2 objblk files)."
});

assert.deepEqual(runtimeAssetStatusTextRuntime({
  tileSetLoaded: true,
  paletteLoaded: true,
  objectFilesLoaded: 0
}), {
  diagClass: "diag ok",
  sourceText: "runtime assets + tile art",
  diagText: "Runtime assets loaded with tile decoder path (tileindx/masktype/maptiles/objtiles). Rendering bitmap tiles."
});

assert.deepEqual(runtimeAssetStatusTextRuntime({
  paletteLoaded: true,
  tileSetLoaded: false
}), {
  diagClass: "diag ok",
  sourceText: "runtime assets + palette",
  diagText: "Runtime assets loaded with u6pal/tileflag decoding. Terrain tint now uses original palette data."
});

assert.deepEqual(runtimeAssetStatusTextRuntime({}), {
  diagClass: "diag ok",
  sourceText: "runtime assets",
  diagText: "Runtime assets loaded. Rendering map/chunk data from local runtime directory."
});

assert.deepEqual(conversationArchiveDiagRuntime({
  converseALoaded: false,
  converseAValidated: false
}), {
  diagClass: "diag warn",
  diagText: "Conversation archive converse.a not loaded; talk falls back to tile strings."
});
assert.deepEqual(conversationArchiveDiagRuntime({
  converseALoaded: true,
  converseAValidated: false
}), {
  diagClass: "diag warn",
  diagText: "Conversation archive loaded but failed canonical validation; scripts are disabled for safety."
});
assert.equal(conversationArchiveDiagRuntime({
  converseALoaded: true,
  converseAValidated: true
}), null);
assert.deepEqual(runtimeAssetFallbackDiagRuntime("missing map"), {
  diagClass: "diag warn",
  diagText: "Fallback active: missing map. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh."
});
assert.deepEqual(runtimeAssetFallbackDiagRuntime(""), {
  diagClass: "diag warn",
  diagText: "Fallback active: unknown error. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh."
});

console.log("runtime_asset_status_test: ok");

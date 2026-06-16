import assert from "node:assert/strict";
import {
  REQUIRED_RUNTIME_ASSET_NAMES,
  RUNTIME_ASSET_BASE_PATH,
  RUNTIME_ASSET_FETCH_MANIFEST,
  RUNTIME_ASSET_NAMES,
  missingRequiredRuntimeAssetsRuntime,
  runtimeAssetPathRuntime
} from "../assets/runtime_asset_manifest.ts";

assert.deepEqual(REQUIRED_RUNTIME_ASSET_NAMES, ["map", "chunks"]);
assert.equal(RUNTIME_ASSET_BASE_PATH, "../assets/runtime");
assert.deepEqual(RUNTIME_ASSET_NAMES, [
  "map",
  "chunks",
  "u6pal",
  "tileflag",
  "tileindx.vga",
  "masktype.vga",
  "maptiles.vga",
  "objtiles.vga",
  "basetile",
  "animdata",
  "paper.bmp",
  "u6.ch",
  "portrait.b",
  "portrait.a",
  "titles.shp",
  "mainmenu.shp",
  "intro_1.shp",
  "intro_2.shp",
  "intro_3.shp",
  "palettes.int",
  "blocks.shp",
  "u6.set",
  "u6mcga.ptr",
  "look.lzd",
  "converse.a",
  "converse.b"
]);
assert.deepEqual(RUNTIME_ASSET_FETCH_MANIFEST.map((entry) => entry.name), RUNTIME_ASSET_NAMES);
assert.deepEqual(RUNTIME_ASSET_FETCH_MANIFEST.map((entry) => entry.path), RUNTIME_ASSET_NAMES.map((name) => `../assets/runtime/${name}`));
assert.equal(runtimeAssetPathRuntime("map", "../assets/runtime///"), "../assets/runtime/map");
assert.deepEqual(missingRequiredRuntimeAssetsRuntime({
  map: { ok: true },
  chunks: { ok: true }
}), []);
assert.deepEqual(missingRequiredRuntimeAssetsRuntime({
  map: { ok: true },
  chunks: { ok: false }
}), ["chunks"]);
assert.deepEqual(missingRequiredRuntimeAssetsRuntime(new Map([
  ["map", { ok: false }],
  ["chunks", { ok: true }]
])), ["map"]);

console.log("runtime_asset_manifest_test: ok");

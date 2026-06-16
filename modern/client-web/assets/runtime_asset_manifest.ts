export type RuntimeAssetName =
  | "map"
  | "chunks"
  | "u6pal"
  | "tileflag"
  | "tileindx.vga"
  | "masktype.vga"
  | "maptiles.vga"
  | "objtiles.vga"
  | "basetile"
  | "animdata"
  | "paper.bmp"
  | "u6.ch"
  | "portrait.b"
  | "portrait.a"
  | "titles.shp"
  | "mainmenu.shp"
  | "intro_1.shp"
  | "intro_2.shp"
  | "intro_3.shp"
  | "palettes.int"
  | "blocks.shp"
  | "u6.set"
  | "u6mcga.ptr"
  | "look.lzd"
  | "converse.a"
  | "converse.b";

export type RuntimeAssetFetchEntry = {
  name: RuntimeAssetName;
  path: string;
};

export const RUNTIME_ASSET_BASE_PATH = "../assets/runtime";

export const REQUIRED_RUNTIME_ASSET_NAMES: readonly RuntimeAssetName[] = Object.freeze([
  "map",
  "chunks"
]);

export const RUNTIME_ASSET_NAMES: readonly RuntimeAssetName[] = Object.freeze([
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

export const RUNTIME_ASSET_FETCH_MANIFEST: readonly RuntimeAssetFetchEntry[] = Object.freeze(RUNTIME_ASSET_NAMES.map((name) => ({
  name,
  path: runtimeAssetPathRuntime(name)
})));

export function runtimeAssetPathRuntime(name: RuntimeAssetName, basePath = RUNTIME_ASSET_BASE_PATH): string {
  return `${String(basePath).replace(/\/+$/g, "")}/${name}`;
}

export function missingRequiredRuntimeAssetsRuntime(
  responsesByName: ReadonlyMap<string, { ok?: unknown }> | Record<string, { ok?: unknown } | undefined>
): RuntimeAssetName[] {
  const responseLookup = responsesByName as {
    get?: (name: string) => { ok?: unknown } | undefined;
  } & Record<string, { ok?: unknown } | undefined>;
  return REQUIRED_RUNTIME_ASSET_NAMES.filter((name) => {
    const response = typeof responseLookup.get === "function"
      ? responseLookup.get(name)
      : responseLookup[name];
    return !response?.ok;
  });
}

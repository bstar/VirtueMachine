import fs from "node:fs";
import path from "node:path";
import { buildObjectAnchorIndex } from "./world_object_collision.ts";
import {
  buildWorldObjectStateRuntime,
  parseBaseTileMapRuntime,
  parseObjBlkRecordsRuntime
} from "./world_object_state_runtime.ts";
import type { WorldObject, WorldObjectState } from "./world_object_types.ts";
import {
  loadTerrainTypeMap,
  loadTileFlagMap
} from "./world_map_runtime.ts";

export type WorldObjectBaselineRuntime = {
  baseline_count: number;
  files_loaded: number;
  loaded_at: string;
  objects: WorldObject[];
  source_dir: string;
};

export function loadBaseTileMapForWorldObjectsRuntime(runtimeDir: string): Uint16Array {
  const basetilePath = path.join(runtimeDir, "basetile");
  try {
    const buf = fs.readFileSync(basetilePath);
    return parseBaseTileMapRuntime(buf);
  } catch (_err) {
    return parseBaseTileMapRuntime(null);
  }
}

export function assertObjectBaselineDirRuntime(dir: string): string {
  const names: string[] = fs.readdirSync(dir);
  const objblkCount = names.filter((name: string) => /^objblk[a-h][a-h]$/i.test(name)).length;
  if (objblkCount < 64) {
    throw new Error(`incomplete object baseline in ${dir}: expected >=64 objblk files, found ${objblkCount}`);
  }
  if (!names.some((name: string) => /^objlist$/i.test(name))) {
    throw new Error(`missing objlist in object baseline dir: ${dir}`);
  }
  return dir;
}

export function loadWorldObjectBaselineRuntime(args: {
  nowIso: () => string;
  objectBaselineDir: string;
  runtimeDir: string;
}): WorldObjectBaselineRuntime {
  const sourceDir = assertObjectBaselineDirRuntime(args.objectBaselineDir);
  const loadedAt = args.nowIso();
  const baseTileMap = loadBaseTileMapForWorldObjectsRuntime(args.runtimeDir);
  const objects: WorldObject[] = [];
  let filesLoaded = 0;
  for (let ay = 0; ay < 8; ay += 1) {
    for (let ax = 0; ax < 8; ax += 1) {
      const name = `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
      const full = path.join(sourceDir, name);
      let bytes: Buffer | null = null;
      try {
        bytes = fs.readFileSync(full);
      } catch (_err) {
        bytes = null;
      }
      if (!bytes) {
        continue;
      }
      const areaId = ((ay << 3) | ax) >>> 0;
      const parsed = parseObjBlkRecordsRuntime(bytes, areaId, baseTileMap);
      for (const row of parsed) {
        objects.push(row);
      }
      filesLoaded += 1;
    }
  }
  return {
    source_dir: sourceDir,
    loaded_at: loadedAt,
    files_loaded: filesLoaded >>> 0,
    baseline_count: objects.length >>> 0,
    objects
  };
}

export function buildWorldObjectStateFromBaselineRuntime(args: {
  nowIso: () => string;
  nowMs: () => number;
  objectBaselineDir: string;
  rawDeltas: unknown;
  runtimeDir: string;
}): WorldObjectState {
  const baseline = loadWorldObjectBaselineRuntime({
    nowIso: args.nowIso,
    objectBaselineDir: args.objectBaselineDir,
    runtimeDir: args.runtimeDir
  });
  return buildWorldObjectStateRuntime({
    baseline,
    buildObjectAnchorIndex,
    nowMs: args.nowMs(),
    rawDeltas: args.rawDeltas,
    tileFlags: loadTileFlagMap(args.runtimeDir),
    terrainType: loadTerrainTypeMap(args.runtimeDir)
  });
}

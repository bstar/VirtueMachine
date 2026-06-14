import type { U6MapRuntime } from "./world_map_runtime.ts";

export interface WorldObject {
  index?: number;
  object_key?: string;
  source_area?: number;
  source_index?: number;
  source_kind?: string;
  legacy_order?: number;
  assoc_child_count?: number;
  assoc_child_0010_count?: number;
  assoc_index?: number;
  assoc_obj?: WorldObject;
  status?: number;
  shape_type?: number;
  amount?: number;
  type?: number;
  frame?: number;
  tile_id?: number;
  coord_use?: number;
  x?: number;
  y?: number;
  z?: number;
  holder_kind?: string;
  holder_id?: string;
  holder_key?: string;
}

export interface SpawnedWorldObjectDelta {
  object_key: string;
  source_area: number;
  source_index: number;
  status: number;
  shape_type: number;
  amount: number;
  type: number;
  frame: number;
  tile_id: number;
  x: number;
  y: number;
  z: number;
  holder_kind: string;
  holder_id: string;
  holder_key: string;
}

export interface MovedWorldObjectDelta {
  x: number;
  y: number;
  z: number;
  status: number | null;
  holder_kind: string;
  holder_id: string;
  holder_key: string;
}

export interface RespawnWorldObjectDelta {
  due_at_ms: number;
  taken_at_ms: number;
  respawn_ms: number;
  policy: string;
}

export interface WorldObjectDeltas {
  schema_version: 1;
  removed: Record<string, boolean>;
  moved: Record<string, MovedWorldObjectDelta>;
  spawned: SpawnedWorldObjectDelta[];
  respawns: Record<string, RespawnWorldObjectDelta>;
}

export interface WorldObjectState {
  baseline?: {
    source_dir?: string;
    loaded_at?: string;
    files_loaded?: number;
    baseline_count?: number;
  };
  terrainType?: Uint8Array;
  tileFlags?: Uint8Array;
  active: WorldObject[];
  activeByAnchor?: Map<string, WorldObject[]>;
  deltas: WorldObjectDeltas;
}

export interface WorldObjectRuntimeState {
  worldObjects?: WorldObjectState;
  mapRuntime?: Pick<U6MapRuntime, "tileAt">;
  worldInteractionLog?: {
    seq?: number;
  };
}

export interface WorldObjectStateContainer {
  worldObjects: WorldObjectState;
}

export interface NpcStepTarget {
  to_x?: number;
  to_y?: number;
  to_z?: number;
}

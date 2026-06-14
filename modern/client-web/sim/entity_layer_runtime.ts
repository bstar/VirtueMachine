import {
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_MASK
} from "../../common/u6_object_constants.ts";

export const ENTITY_TYPE_ACTOR_MIN_RUNTIME = 0x153;
export const ENTITY_TYPE_ACTOR_MAX_RUNTIME = 0x1af;
export const NPC_FLAG_DIRECTION_MASK_RUNTIME = 0x07;
export const NPC_FLAG_WALKING_RUNTIME = 0x80;

export type U6EntityEntryRuntime = {
  [key: string]: unknown;
  assocIndex?: number;
  authoritative?: boolean;
  baseTile: number;
  coordUse?: number;
  direction: number;
  frame: number;
  homeX?: number;
  homeY?: number;
  id: number;
  movable?: boolean;
  npcComMode: number;
  npcFlag: number;
  npcMode: number;
  npcStatus: number;
  order: number;
  origFrame: number;
  origType: number;
  patrolPhase?: number;
  patrolRadius?: number;
  qual?: number;
  status: number;
  tileId: number;
  type: number;
  walkingFlag: boolean;
  x: number;
  y: number;
  z: number;
};

export type U6EntityAssocEntryRuntime = {
  [key: string]: unknown;
  assocIndex: number;
  baseTile: number;
  coordUse: number;
  direction: number;
  frame: number;
  id: number;
  npcComMode: number;
  npcFlag: number;
  npcMode: number;
  npcStatus: number;
  order: number;
  origFrame: number;
  origType: number;
  status: number;
  tileId: number;
  type: number;
  walkingFlag: boolean;
};

export type U6EntityLayerParseResultRuntime = {
  entries: U6EntityEntryRuntime[];
  assocEntries: U6EntityAssocEntryRuntime[];
};

export type EntityLayerMapRuntime = {
  tileAt(x: number, y: number, z: number): number;
};

export type EntityLayerObjectRuntime = {
  tileId: number;
};

export type EntityLayerObjectLayerRuntime = {
  objectsAt(x: number, y: number, z: number): EntityLayerObjectRuntime[];
};

export class U6EntityLayerRuntime {
  baseTiles: ArrayLike<number>;
  entries: U6EntityEntryRuntime[];
  assocEntries: U6EntityAssocEntryRuntime[];
  totalLoaded: number;

  constructor(baseTiles: ArrayLike<number>) {
    this.baseTiles = baseTiles;
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
  }

  isRenderableEntityType(type: number): boolean {
    return type >= ENTITY_TYPE_ACTOR_MIN_RUNTIME && type <= ENTITY_TYPE_ACTOR_MAX_RUNTIME;
  }

  parseObjList(bytes: Uint8Array): U6EntityLayerParseResultRuntime {
    if (!bytes || bytes.length < 0x0900) {
      return { entries: [], assocEntries: [] };
    }
    const objStatusOff = 0x0000;
    const objPosOff = 0x0100;
    const objShapeOff = 0x0400;
    const npcStatusOff = 0x0800;
    const npcModeOff = 0x11f1;
    const npcComModeOff = 0x12f1;
    const origShapeOff = 0x15f1;
    const npcFlagOff = 0x19f1;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out: U6EntityEntryRuntime[] = [];
    const assocEntries: U6EntityAssocEntryRuntime[] = [];
    for (let id = 0; id < 0x100; id += 1) {
      const status = bytes[objStatusOff + id];
      const npcStatus = bytes[npcStatusOff + id];
      const shapeType = dv.getUint16(objShapeOff + (id * 2), true);
      if (shapeType === 0) {
        continue;
      }
      const coordUse = status & OBJ_COORD_USE_MASK;
      const type = shapeType & 0x03ff;
      const frame = shapeType >>> 10;
      const origShapeType = origShapeOff + (id * 2) + 1 < bytes.length
        ? dv.getUint16(origShapeOff + (id * 2), true)
        : shapeType;
      const npcMode = npcModeOff + id < bytes.length ? bytes[npcModeOff + id] : 0;
      const npcComMode = npcComModeOff + id < bytes.length ? bytes[npcComModeOff + id] : 0;
      const npcFlag = npcFlagOff + id < bytes.length ? bytes[npcFlagOff + id] : 0;
      const qual = bytes[0x0700 + id] & 0xff;
      const pos = objPosOff + (id * 3);
      const baseTile = this.baseTiles[type] ?? 0;
      if (baseTile === 0) {
        continue;
      }
      if (coordUse !== OBJ_COORD_USE_LOCXYZ) {
        if (coordUse === OBJ_COORD_USE_EQUIP) {
          const assocIndex = (bytes[pos + 0] | (bytes[pos + 1] << 8)) & 0xffff;
          assocEntries.push({
            id,
            status,
            npcStatus,
            coordUse,
            assocIndex,
            type,
            frame,
            origType: origShapeType & 0x03ff,
            origFrame: origShapeType >>> 10,
            npcMode,
            npcComMode,
            npcFlag,
            direction: npcFlag & NPC_FLAG_DIRECTION_MASK_RUNTIME,
            walkingFlag: (npcFlag & NPC_FLAG_WALKING_RUNTIME) !== 0,
            baseTile,
            tileId: (baseTile + frame) & 0xffff,
            order: id
          });
        }
        continue;
      }
      if (!this.isRenderableEntityType(type)) {
        continue;
      }
      const x = bytes[pos + 0] | ((bytes[pos + 1] & 0x03) << 8);
      const y = (bytes[pos + 1] >> 2) | ((bytes[pos + 2] & 0x0f) << 6);
      const z = (bytes[pos + 2] >> 4) & 0x0f;
      out.push({
        id,
        x,
        y,
        z,
        status,
        npcStatus,
        qual,
        type,
        frame,
        origType: origShapeType & 0x03ff,
        origFrame: origShapeType >>> 10,
        npcMode,
        npcComMode,
        npcFlag,
        direction: npcFlag & NPC_FLAG_DIRECTION_MASK_RUNTIME,
        walkingFlag: (npcFlag & NPC_FLAG_WALKING_RUNTIME) !== 0,
        baseTile,
        tileId: (baseTile + frame) & 0xffff,
        order: id
      });
    }
    out.sort((a, b) => a.order - b.order);
    assocEntries.sort((a, b) => a.order - b.order);
    return { entries: out, assocEntries };
  }

  load(bytes: Uint8Array): void {
    const parsed = this.parseObjList(bytes);
    this.entries = parsed.entries;
    this.assocEntries = parsed.assocEntries;
    for (const e of this.entries) {
      e.homeX = e.x;
      e.homeY = e.y;
      e.authoritative = false;
      e.patrolPhase = e.id & 0x03;
      e.patrolRadius = 2;
      e.movable = false;
    }
    this.totalLoaded = this.entries.length;
  }

  entitiesInView(startX: number, startY: number, z: number, w: number, h: number): U6EntityEntryRuntime[] {
    const endX = startX + w;
    const endY = startY + h;
    const out: U6EntityEntryRuntime[] = [];
    for (const e of this.entries) {
      if (e.z !== z) {
        continue;
      }
      if (e.x < startX || e.x >= endX || e.y < startY || e.y >= endY) {
        continue;
      }
      out.push(e);
    }
    out.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.order - b.order;
    });
    return out;
  }

  tileBlocks(
    x: number,
    y: number,
    z: number,
    mapCtx: EntityLayerMapRuntime | null | undefined,
    tileFlags: ArrayLike<number> | null | undefined,
    terrainType: ArrayLike<number> | null | undefined,
    objectLayer: EntityLayerObjectLayerRuntime | null | undefined
  ): boolean {
    if (!mapCtx) {
      return false;
    }
    const t = mapCtx.tileAt(x, y, z);
    if (tileFlags && ((tileFlags[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (terrainType && ((terrainType[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (objectLayer && tileFlags) {
      const overlays = objectLayer.objectsAt(x, y, z);
      for (const o of overlays) {
        const tf = tileFlags[o.tileId & 0x7ff] ?? 0;
        if (tf & 0x04) {
          return true;
        }
      }
    }
    return false;
  }

  step(
    _tick: number,
    _mapCtx: EntityLayerMapRuntime | null | undefined,
    _tileFlags: ArrayLike<number> | null | undefined,
    _terrainType: ArrayLike<number> | null | undefined,
    _objectLayer: EntityLayerObjectLayerRuntime | null | undefined,
    _visibleAtWorld: unknown
  ): number {
    // Real legacy movement comes from schedule/AI state; do not apply placeholder patrol drift.
    return 0;
  }
}

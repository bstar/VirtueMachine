import {
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_MASK
} from "../../common/u6_object_constants.ts";
import { compareLegacyObjectOrderStable } from "../legacy_object_order.ts";

const OBJ_STATUS_INVISIBLE_RUNTIME = 0x02;
const ENTITY_TYPE_ACTOR_MIN_RUNTIME = 0x153;
const ENTITY_TYPE_ACTOR_MAX_RUNTIME = 0x1af;

export type U6ObjectEntryRuntime = {
  assocChild0010Count?: number;
  assocChildCount?: number;
  assocIndex: number;
  assocObj?: U6ObjectEntryRuntime;
  baseTile: number;
  coordUse: number;
  frame: number;
  index: number;
  legacyOrder?: number;
  order: number;
  renderable: boolean;
  objectKey?: string;
  sourceArea: number;
  sourceIndex: number;
  status: number;
  tileId: number;
  type: number;
  x: number;
  y: number;
  z: number;
};

export type U6ObjectLayerParseResultRuntime = {
  entries: U6ObjectEntryRuntime[];
  assocEntries: U6ObjectEntryRuntime[];
};

export type U6ObjectLayerFetchResponseRuntime = {
  ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type U6ObjectLayerFetchRuntime = (name: string) => Promise<U6ObjectLayerFetchResponseRuntime | null | undefined>;
export type U6ObjectRemovedLookupRuntime = (obj: U6ObjectEntryRuntime) => boolean;

export function isRenderableWorldObjectTypeRuntime(type: number): boolean {
  const t = type & 0x03ff;
  if (t >= ENTITY_TYPE_ACTOR_MIN_RUNTIME && t <= ENTITY_TYPE_ACTOR_MAX_RUNTIME) {
    return false;
  }
  /* Legacy ShowObject short-circuits this base tile family. */
  if (t === 0x14f) {
    return false;
  }
  return true;
}

export function objectLayerAnchorKeyRuntime(obj: U6ObjectEntryRuntime): string {
  return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff},${obj.type & 0x3ff}`;
}

export class U6ObjectLayerRuntime {
  baseTiles: ArrayLike<number>;
  byCoord: Map<string, U6ObjectEntryRuntime[]>;
  entries: U6ObjectEntryRuntime[];
  assocEntries: U6ObjectEntryRuntime[];
  totalLoaded: number;
  filesLoaded: number;
  private readonly isObjectRemoved: U6ObjectRemovedLookupRuntime;

  constructor(baseTiles: ArrayLike<number>, isObjectRemoved: U6ObjectRemovedLookupRuntime = () => false) {
    this.baseTiles = baseTiles;
    this.byCoord = new Map();
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
    this.filesLoaded = 0;
    this.isObjectRemoved = isObjectRemoved;
  }

  decodeCoord(raw0: number, raw1: number, raw2: number): { x: number; y: number; z: number } {
    const x = raw0 | ((raw1 & 0x03) << 8);
    const y = (raw1 >> 2) | ((raw2 & 0x0f) << 6);
    const z = (raw2 >> 4) & 0x0f;
    return { x, y, z };
  }

  coordKey(x: number, y: number, z: number): string {
    return `${x & 0x3ff},${y & 0x3ff},${z & 0x0f}`;
  }

  compareLegacyRenderOrder(a: U6ObjectEntryRuntime, b: U6ObjectEntryRuntime): number {
    const ao = Number(a?.legacyOrder);
    const bo = Number(b?.legacyOrder);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) {
      return ao - bo;
    }
    return compareLegacyObjectOrderStable(a, b);
  }

  parseObjBlk(bytes: Uint8Array, areaId = 0): U6ObjectLayerParseResultRuntime {
    if (!bytes || bytes.length < 2) {
      return { entries: [], assocEntries: [] };
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let count = dv.getUint16(0, true);
    const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
    if (count > maxCount) {
      count = maxCount;
    }

    const decoded: U6ObjectEntryRuntime[] = [];
    for (let i = 0; i < count; i += 1) {
      const off = 2 + (i * 8);
      const status = bytes[off + 0];
      const { x, y, z } = this.decodeCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
      const shapeType = dv.getUint16(off + 4, true);
      const type = shapeType & 0x3ff;
      const frame = shapeType >>> 10;
      const base = this.baseTiles[type] ?? 0;
      const tileId = (base + frame) & 0xffff;
      const coordUse = status & OBJ_COORD_USE_MASK;
      const assocIndex = (bytes[off + 1] | (bytes[off + 2] << 8)) & 0xffff;
      decoded.push({
        index: i,
        assocIndex,
        x,
        y,
        z,
        status,
        coordUse,
        type,
        baseTile: base,
        frame,
        tileId,
        order: i,
        sourceArea: areaId & 0x3f,
        sourceIndex: i,
        renderable: isRenderableWorldObjectTypeRuntime(type)
      });
    }
    for (const row of decoded) {
      const ai = row.assocIndex | 0;
      if (ai >= 0 && ai < decoded.length) {
        row.assocObj = decoded[ai];
      }
    }
    const childCounts = new Uint16Array(count);
    const child0010Counts = new Uint16Array(count);
    for (const row of decoded) {
      if ((row.coordUse | 0) === OBJ_COORD_USE_LOCXYZ) {
        continue;
      }
      const ai = row.assocIndex | 0;
      if (ai < 0 || ai >= count) {
        continue;
      }
      childCounts[ai] = (childCounts[ai] + 1) & 0xffff;
      if ((row.status & 0x10) !== 0) {
        child0010Counts[ai] = (child0010Counts[ai] + 1) & 0xffff;
      }
    }
    const ordered = decoded.slice().sort((a, b) => {
      const cmp = compareLegacyObjectOrderStable(a, b);
      if (cmp !== 0) {
        return cmp;
      }
      return (a.index | 0) - (b.index | 0);
    });
    const legacyOrderByIndex = new Int32Array(count);
    legacyOrderByIndex.fill(-1);
    for (let i = 0; i < ordered.length; i += 1) {
      const idx = ordered[i].index | 0;
      if (idx >= 0 && idx < count) {
        legacyOrderByIndex[idx] = i;
      }
    }
    const entries: U6ObjectEntryRuntime[] = [];
    const assocEntries: U6ObjectEntryRuntime[] = [];
    for (const row of decoded) {
      const normalized = {
        ...row,
        legacyOrder: legacyOrderByIndex[row.index] | 0,
        assocChildCount: Number(childCounts[row.index] || 0),
        assocChild0010Count: Number(child0010Counts[row.index] || 0)
      };
      if ((row.coordUse | 0) !== OBJ_COORD_USE_LOCXYZ) {
        assocEntries.push(normalized);
        continue;
      }
      if (row.status & OBJ_STATUS_INVISIBLE_RUNTIME) {
        continue;
      }
      entries.push(normalized);
    }
    return { entries, assocEntries };
  }

  addEntries(parsed: U6ObjectLayerParseResultRuntime): void {
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    const assocEntries = Array.isArray(parsed?.assocEntries) ? parsed.assocEntries : [];
    for (const e of entries) {
      const key = this.coordKey(e.x, e.y, e.z);
      if (!this.byCoord.has(key)) {
        this.byCoord.set(key, []);
      }
      this.byCoord.get(key)?.push(e);
      this.entries.push(e);
      this.totalLoaded += 1;
    }
    for (const e of assocEntries) {
      this.assocEntries.push(e);
    }
  }

  removeRuntimeEntryByObjectKey(objectKey: unknown): void {
    const key = String(objectKey || "").trim();
    if (!key) {
      return;
    }
    this.entries = this.entries.filter((entry) => String(entry.objectKey || "") !== key);
    for (const [coordKey, list] of this.byCoord.entries()) {
      const next = list.filter((entry) => String(entry.objectKey || "") !== key);
      if (next.length === 0) {
        this.byCoord.delete(coordKey);
      } else if (next.length !== list.length) {
        this.byCoord.set(coordKey, next);
      }
    }
  }

  removeRuntimeEntryByAuthoritativeKey(objectKey: unknown): void {
    const key = String(objectKey || "").trim();
    if (!key) {
      return;
    }
    const match = /^a([0-9a-f]+)i([0-9a-f]+)$/i.exec(key);
    const sourceArea = match ? parseInt(match[1], 16) : Number.NaN;
    const sourceIndex = match ? parseInt(match[2], 16) : Number.NaN;
    const matches = (entry: U6ObjectEntryRuntime): boolean => (
      String(entry.objectKey || "") === key
      || (
        Number.isFinite(sourceArea)
        && Number.isFinite(sourceIndex)
        && (Number(entry.sourceArea) >>> 0) === (sourceArea >>> 0)
        && (Number(entry.sourceIndex) >>> 0) === (sourceIndex >>> 0)
      )
    );
    this.entries = this.entries.filter((entry) => !matches(entry));
    for (const [coordKey, list] of this.byCoord.entries()) {
      const next = list.filter((entry) => !matches(entry));
      if (next.length === 0) {
        this.byCoord.delete(coordKey);
      } else if (next.length !== list.length) {
        this.byCoord.set(coordKey, next);
      }
    }
  }

  upsertRuntimeEntry(entry: U6ObjectEntryRuntime): void {
    const key = String(entry.objectKey || "").trim();
    if (key) {
      this.removeRuntimeEntryByAuthoritativeKey(key);
    }
    const coordKey = this.coordKey(entry.x, entry.y, entry.z);
    const normalized = this.applyLegacyRuntimeFixes(entry);
    const bucket = this.byCoord.get(coordKey) || [];
    bucket.push(normalized);
    bucket.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    this.byCoord.set(coordKey, bucket);
    this.entries.push(normalized);
    this.entries.sort((a, b) => this.compareLegacyRenderOrder(a, b));
  }

  hasMirrorReflector(obj: U6ObjectEntryRuntime): boolean {
    const key = this.coordKey(obj.x | 0, ((obj.y | 0) + 1) & 0x3ff, obj.z | 0);
    const below = this.byCoord.get(key) ?? [];
    for (const candidate of below) {
      if (!candidate || !candidate.renderable) {
        continue;
      }
      if ((candidate.order | 0) === (obj.order | 0) && (candidate.type | 0) === (obj.type | 0)) {
        continue;
      }
      if (this.isObjectRemoved(candidate)) {
        continue;
      }
      return true;
    }
    return false;
  }

  applyLegacyRuntimeFixes(obj: U6ObjectEntryRuntime): U6ObjectEntryRuntime {
    if ((obj.type & 0x03ff) !== 0x07b || (obj.frame | 0) >= 2) {
      return obj;
    }
    const nextFrame = this.hasMirrorReflector(obj) ? 1 : 0;
    if ((obj.frame | 0) === nextFrame) {
      return obj;
    }
    return {
      ...obj,
      frame: nextFrame,
      tileId: ((obj.baseTile | 0) + nextFrame) & 0xffff
    };
  }

  async loadOutdoor(fetcher: U6ObjectLayerFetchRuntime): Promise<void> {
    this.byCoord.clear();
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
    this.filesLoaded = 0;

    for (let ay = 0; ay < 8; ay += 1) {
      for (let ax = 0; ax < 8; ax += 1) {
        const name = `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
        const res = await fetcher(name);
        if (!res || !res.ok) {
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        const areaId = ((ay & 0x7) << 3) | (ax & 0x7);
        this.addEntries(this.parseObjBlk(buf, areaId));
        this.filesLoaded += 1;
      }
    }
    this.entries.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    for (const list of this.byCoord.values()) {
      list.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    }
  }

  objectsAt(x: number, y: number, z: number): U6ObjectEntryRuntime[] {
    const list = this.byCoord.get(this.coordKey(x, y, z)) ?? [];
    return list
      .filter((o) => !this.isObjectRemoved(o))
      .map((o) => this.applyLegacyRuntimeFixes(o));
  }

  objectsInWindowLegacyOrder(startX: number, startY: number, viewW: number, viewH: number, z: number): U6ObjectEntryRuntime[] {
    const endX = (startX + viewW) | 0;
    const endY = (startY + viewH) | 0;
    const targetZ = z | 0;
    const out: U6ObjectEntryRuntime[] = [];
    for (const o of this.entries) {
      if ((o.z | 0) !== targetZ) {
        continue;
      }
      const ox = o.x | 0;
      const oy = o.y | 0;
      if (ox < startX || ox >= endX || oy < startY || oy >= endY) {
        continue;
      }
      if (this.isObjectRemoved(o)) {
        continue;
      }
      out.push(this.applyLegacyRuntimeFixes(o));
    }
    return out;
  }
}

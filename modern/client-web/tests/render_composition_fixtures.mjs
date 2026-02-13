import assert from "node:assert/strict";
import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel
} from "../render_composition.js";

const VIEW_W = 5;
const VIEW_H = 5;

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function makeObjectLayer(entries) {
  const by = new Map();
  const stream = entries.slice().sort((a, b) => {
    if ((a.y | 0) !== (b.y | 0)) return (a.y | 0) - (b.y | 0);
    if ((a.x | 0) !== (b.x | 0)) return (a.x | 0) - (b.x | 0);
    if ((a.z | 0) !== (b.z | 0)) return (b.z | 0) - (a.z | 0);
    if (((a.sourceArea ?? 0) | 0) !== ((b.sourceArea ?? 0) | 0)) {
      return ((a.sourceArea ?? 0) | 0) - ((b.sourceArea ?? 0) | 0);
    }
    return ((a.sourceIndex ?? a.order ?? 0) | 0) - ((b.sourceIndex ?? b.order ?? 0) | 0);
  });
  for (const e of entries) {
    const k = key(e.x, e.y, e.z);
    if (!by.has(k)) {
      by.set(k, []);
    }
    by.get(k).push(e);
  }
  return {
    objectsAt(x, y, z) {
      return by.get(key(x, y, z)) ?? [];
    },
    objectsInWindowLegacyOrder(startX, startY, viewW, viewH, wz) {
      const endX = startX + viewW;
      const endY = startY + viewH;
      return stream.filter((o) => (
        (o.z | 0) === (wz | 0)
        && (o.x | 0) >= startX
        && (o.x | 0) < endX
        && (o.y | 0) >= startY
        && (o.y | 0) < endY
      ));
    }
  };
}

function runSpillOrderingFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x200 & 0x7ff] = 0xc0; /* double-h + double-v */
  tileFlags[(0x200 - 1) & 0x7ff] = 0x04; /* occluder spill */

  const objectLayer = makeObjectLayer([
    {
      x: 302,
      y: 342,
      z: 0,
      type: 0x110,
      renderable: true,
      drawPri: 1,
      order: 7,
      tileId: 0x200
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: {
      visibleAtWorld() { return true; }
    },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  assert.equal(out.overlayCount, 1, "expected one source overlay record");
  assert.equal(out.parity.unsortedSourceCount, 0, "sorted source order expected");

  const main = topInteractiveOverlayAtModel(out.overlayCells, VIEW_W, VIEW_H, startX, startY, 302, 342);
  assert(main, "main interactive overlay should exist");
  assert.equal(main.tileId, 0x200, "main interactive overlay tile mismatch");

  const spillLeftCell = out.overlayCells[((342 - startY) * VIEW_W) + (301 - startX)];
  assert(spillLeftCell.length > 0, "left spill cell should be populated");
  assert.equal(spillLeftCell[0].tileId, 0x1ff, "left spill tile mismatch");
  assert.equal(spillLeftCell[0].occluder, true, "left spill should be marked occluder");
}

function runVisibilitySuppressionFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x210 & 0x7ff] = 0x80;
  const objectLayer = makeObjectLayer([
    {
      x: 302,
      y: 342,
      z: 0,
      type: 0x111,
      renderable: true,
      drawPri: 1,
      order: 1,
      tileId: 0x210
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: {
      visibleAtWorld(wx, wy) {
        return !(wx === 302 && wy === 342);
      }
    },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  assert.equal(out.parity.hiddenSuppressedCount >= 1, true, "hidden suppression should be counted");
  const hiddenCell = out.overlayCells[((342 - startY) * VIEW_W) + (302 - startX)];
  assert.equal(hiddenCell.length, 0, "hidden source cell should not contain overlays");
}

function runActorOcclusionParityFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x222 & 0x7ff] = 0x04; /* opaque */
  const objectLayer = makeObjectLayer([
    {
      x: 301,
      y: 341,
      z: 0,
      type: 0x117,
      renderable: true,
      drawPri: 0,
      order: 0,
      tileId: 0x222
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: {
      visibleAtWorld() { return true; }
    },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  const mismatches = measureActorOcclusionParityModel(
    out.overlayCells,
    VIEW_W,
    VIEW_H,
    startX,
    startY,
    {
      visibleAtWorld() { return true; },
      openAtWorld() { return true; }
    },
    [{ x: 301, y: 341 }]
  );
  assert.equal(mismatches, 1, "expected one actor-vs-occluder parity mismatch");
}

function runTransparencyFixture() {
  assert.equal(isLegacyPixelTransparent(10, 0x010, 0xff), true, "mask10 0xff should be transparent");
  assert.equal(isLegacyPixelTransparent(10, 0x010, 0x00), true, "mask10 zero should be transparent for <=0x1ff");
  assert.equal(isLegacyPixelTransparent(10, 0x10a, 0x00), true, "mask10 zero should stay transparent for <=0x1ff");
  assert.equal(isLegacyPixelTransparent(10, 0x20a, 0x00), false, "mask10 zero should stay opaque for >0x1ff");
  assert.equal(isLegacyPixelTransparent(5, 0x050, 0xff), true, "mask5 0xff should be transparent");
  assert.equal(isLegacyPixelTransparent(0, 0x050, 0xff), false, "non-mask tiles should not auto-transparent");
}

function runLegacyStreamOrderingFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  const objectLayer = makeObjectLayer([
    {
      x: 301, y: 341, z: 0,
      type: 0x114, renderable: true, order: 4, sourceArea: 0, sourceIndex: 4, tileId: 0x3b4
    },
    {
      x: 300, y: 341, z: 0,
      type: 0x114, renderable: true, order: 3, sourceArea: 0, sourceIndex: 3, tileId: 0x3b3
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: {
      visibleAtWorld() { return true; }
    },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  assert.equal(out.parity.unsortedSourceCount, 0, "legacy stream order should be monotonic");
  const left = topInteractiveOverlayAtModel(out.overlayCells, VIEW_W, VIEW_H, startX, startY, 300, 341);
  const right = topInteractiveOverlayAtModel(out.overlayCells, VIEW_W, VIEW_H, startX, startY, 301, 341);
  assert.equal(left.tileId, 0x3b3, "left tile mismatch");
  assert.equal(right.tileId, 0x3b4, "right tile mismatch");
}

function runLegacyInjectionHookFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  const objectLayer = makeObjectLayer([]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: {
      visibleAtWorld() { return true; }
    },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; },
    injectLegacyOverlays({ insertWorldTile }) {
      insertWorldTile(301, 341, 0x1ba, 1, { x: 301, y: 341, type: "legacy-test", objType: 0x18a }, "0x1ba");
      return 1;
    }
  });

  assert.equal(out.overlayCount, 1, "legacy inject hook should contribute overlay count");
  const list = out.overlayCells[((341 - startY) * VIEW_W) + (301 - startX)];
  assert(Array.isArray(list) && list.length > 0, "injected overlay should exist at world cell");
  assert.equal(list[0].tileId, 0x1ba, "injected tile mismatch");
}

runSpillOrderingFixture();
runVisibilitySuppressionFixture();
runActorOcclusionParityFixture();
runTransparencyFixture();
runLegacyStreamOrderingFixture();
runLegacyInjectionHookFixture();

console.log("render_composition_fixtures: ok");

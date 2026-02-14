import assert from "node:assert/strict";
import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel
} from "../render_composition.js";
import {
  compareLegacyObjectOrderStrict,
  compareLegacyObjectOrderStable
} from "../legacy_object_order.js";

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

function runFloorInsertionOrderFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x300 & 0x7ff] = 0x00; /* non-floor */
  tileFlags[0x301 & 0x7ff] = 0x10; /* floor */
  tileFlags[0x302 & 0x7ff] = 0x00; /* non-floor */
  const objectLayer = makeObjectLayer([
    { x: 301, y: 341, z: 0, type: 0x100, renderable: true, order: 1, sourceArea: 0, sourceIndex: 1, tileId: 0x300 },
    { x: 301, y: 341, z: 0, type: 0x101, renderable: true, order: 2, sourceArea: 0, sourceIndex: 2, tileId: 0x301 },
    { x: 301, y: 341, z: 0, type: 0x102, renderable: true, order: 3, sourceArea: 0, sourceIndex: 3, tileId: 0x302 }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: { visibleAtWorld() { return true; } },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  const list = out.overlayCells[((341 - startY) * VIEW_W) + (301 - startX)];
  assert.equal(list.length, 3, "expected three entries");
  // Legacy: floor entry is inserted after non-floor chain, not before it.
  assert.equal(list[0].tileId, 0x302, "newest non-floor should be at head");
  assert.equal(list[1].tileId, 0x300, "older non-floor should remain before floor");
  assert.equal(list[2].tileId, 0x301, "floor entry should be after non-floor chain");
}

function runRightFringeSpillFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x220 & 0x7ff] = 0x80; /* spill-left */
  const objectLayer = makeObjectLayer([
    {
      x: 305, y: 342, z: 0,
      type: 0x111, renderable: true, order: 10, sourceArea: 0, sourceIndex: 10, tileId: 0x220
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: { visibleAtWorld() { return true; } },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  // Source anchor is outside view (x=305), but +1 source-window should still
  // process it so the left spill (x=304) lands in-view.
  assert.equal(out.overlayCount, 1, "right fringe source should be processed via +1 window");
  const inViewSpill = out.overlayCells[((342 - startY) * VIEW_W) + (304 - startX)];
  assert.equal(inViewSpill.length > 0, true, "right fringe left-spill should land in-view");
  assert.equal(inViewSpill[0].tileId, 0x21f, "right fringe left-spill tile mismatch");
  assert.equal(inViewSpill[0].sourceType, "spill-left", "right fringe should record spill-left source type");
}

function runBottomFringeSpillFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  tileFlags[0x240 & 0x7ff] = 0x40; /* spill-up */
  const objectLayer = makeObjectLayer([
    {
      x: 302, y: 345, z: 0,
      type: 0x112, renderable: true, order: 11, sourceArea: 0, sourceIndex: 11, tileId: 0x240
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: { visibleAtWorld() { return true; } },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  // Source anchor is outside view (y=345), but +1 source-window should still
  // process it so the up spill (y=344) lands in-view.
  assert.equal(out.overlayCount, 1, "bottom fringe source should be processed via +1 window");
  const inViewSpill = out.overlayCells[((344 - startY) * VIEW_W) + (302 - startX)];
  assert.equal(inViewSpill.length > 0, true, "bottom fringe up-spill should land in-view");
  assert.equal(inViewSpill[0].tileId, 0x23f, "bottom fringe up-spill tile mismatch");
  assert.equal(inViewSpill[0].sourceType, "spill-up", "bottom fringe should record spill-up source type");
}

function runSameCellStreamDeterminismFixture() {
  const startX = 300;
  const startY = 340;
  const wz = 0;
  const tileFlags = new Uint8Array(0x800);
  const objectLayer = makeObjectLayer([
    {
      x: 301, y: 341, z: 0,
      type: 0x150, renderable: true, order: 2, sourceArea: 0, sourceIndex: 2, tileId: 0x350
    },
    {
      x: 301, y: 341, z: 0,
      type: 0x151, renderable: true, order: 3, sourceArea: 1, sourceIndex: 0, tileId: 0x351
    }
  ]);

  const out = buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx: { visibleAtWorld() { return true; } },
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile(o) { return o.tileId; },
    hasWallTerrain() { return false; }
  });

  const list = out.overlayCells[((341 - startY) * VIEW_W) + (301 - startX)];
  assert.equal(list.length, 2, "same-cell stream fixture should produce two overlays");
  // Deterministic expectation with current canonical stream + insertion model:
  // later stream entries unshift to head, earlier entries remain at tail.
  assert.equal(list[0].tileId, 0x351, "later stream entry should unshift to head");
  assert.equal(list[1].tileId, 0x350, "earlier stream entry should remain tail");
}

function runLegacyComparatorFixture() {
  const loc = { x: 10, y: 10, z: 0, coordUse: 0, status: 0 };
  const inv = { x: 10, y: 10, z: 0, coordUse: 0x08, status: 0x08 };
  assert.equal(
    compareLegacyObjectOrderStrict(inv, loc) < 0,
    true,
    "non-LOCXYZ anchor should sort before LOCXYZ when compared against LOCXYZ object"
  );
  assert.equal(
    compareLegacyObjectOrderStrict(loc, inv) > 0,
    true,
    "LOCXYZ should sort after non-LOCXYZ anchor in reverse comparison"
  );

  const a = { x: 100, y: 100, z: 0, coordUse: 0, status: 0, sourceArea: 0, sourceIndex: 10, order: 10 };
  const b = { x: 100, y: 100, z: 0, coordUse: 0, status: 0, sourceArea: 0, sourceIndex: 11, order: 11 };
  assert.equal(compareLegacyObjectOrderStrict(a, b), 0, "strict legacy comparator should tie same-cell LOCXYZ objects");
  assert.equal(compareLegacyObjectOrderStable(a, b) < 0, true, "stable comparator should break strict ties by source order");
}

runSpillOrderingFixture();
runVisibilitySuppressionFixture();
runActorOcclusionParityFixture();
runTransparencyFixture();
runLegacyStreamOrderingFixture();
runLegacyInjectionHookFixture();
runFloorInsertionOrderFixture();
runRightFringeSpillFixture();
runBottomFringeSpillFixture();
runSameCellStreamDeterminismFixture();
runLegacyComparatorFixture();

console.log("render_composition_fixtures: ok");

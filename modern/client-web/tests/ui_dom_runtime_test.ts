import assert from "node:assert/strict";
import {
  canvas2dContextRuntime,
  legacyFrameLayoutModelRuntime,
  requiredElementRuntime
} from "../ui/dom_runtime.ts";

{
  const element = { id: "viewport" } as HTMLElement;
  const doc = {
    getElementById: (id: string) => id === "viewport" ? element : null
  };
  assert.equal(requiredElementRuntime(doc, "viewport"), element);
  assert.throws(
    () => requiredElementRuntime(doc, "missing"),
    /Missing required element #missing/
  );
}

{
  const context = { imageSmoothingEnabled: false } as CanvasRenderingContext2D;
  const canvas = {
    getContext: (kind: "2d") => kind === "2d" ? context : null
  };
  assert.equal(canvas2dContextRuntime(canvas, "viewport"), context);
  assert.throws(
    () => canvas2dContextRuntime({ getContext: () => null }, "legacy"),
    /legacy 2D context is unavailable/
  );
}

{
  assert.deepEqual(legacyFrameLayoutModelRuntime({
    hostH: 900,
    hostW: 1400,
    legacyScaleMode: "fit",
    mapRect: { x: 8, y: 8, w: 160, h: 160 },
    srcH: 200,
    srcW: 320
  }), {
    mapRect: { x: 32, y: 32, w: 640, h: 640 },
    outH: 800,
    outW: 1280,
    scale: 4
  });
  assert.deepEqual(legacyFrameLayoutModelRuntime({
    hostH: 900,
    hostW: 1400,
    legacyScaleMode: "2x",
    mapRect: { x: 8, y: 8, w: 160, h: 160 },
    srcH: 200,
    srcW: 320
  }), {
    mapRect: { x: 16, y: 16, w: 320, h: 320 },
    outH: 400,
    outW: 640,
    scale: 2
  });
  assert.deepEqual(legacyFrameLayoutModelRuntime({
    hostH: 0,
    hostW: 0,
    legacyScaleMode: "bad",
    mapRect: { x: 8, y: 8, w: 160, h: 160 },
    srcH: 200,
    srcW: 320
  }), {
    mapRect: { x: 8, y: 8, w: 160, h: 160 },
    outH: 200,
    outW: 320,
    scale: 1
  });
}

console.log("ui_dom_runtime_test: ok");

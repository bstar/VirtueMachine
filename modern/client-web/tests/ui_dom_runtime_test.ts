import assert from "node:assert/strict";
import {
  canvas2dContextRuntime,
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

console.log("ui_dom_runtime_test: ok");

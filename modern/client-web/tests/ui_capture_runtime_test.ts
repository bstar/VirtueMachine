import assert from "node:assert/strict";
import {
  CAPTURE_PRESETS_RUNTIME,
  activeCapturePresetFromSelectRuntime,
  bindCaptureControlButtonsRuntime,
  cameraPresetPatchRuntime,
  captureFilePlanRuntime,
  capturePresetByIdRuntime,
  capturePresetFilenameRuntime,
  capturePresetOptionsRuntime,
  captureSuccessDiagRuntime,
  captureViewportStatusRowsFromElementsRuntime,
  captureViewportStatusRowsRuntime,
  movedCameraFocusTextRuntime,
  populateCapturePresetSelectRuntime
} from "../ui/capture_runtime.ts";

assert.equal(CAPTURE_PRESETS_RUNTIME[0].id, "avatar_start");
assert.equal(capturePresetByIdRuntime(CAPTURE_PRESETS_RUNTIME, "farmland")?.label, "Farmland Props (292,431,0)");
assert.equal(capturePresetByIdRuntime(CAPTURE_PRESETS_RUNTIME, "missing")?.id, "avatar_start");
assert.equal(capturePresetByIdRuntime([], "missing"), undefined);
assert.deepEqual(capturePresetOptionsRuntime(CAPTURE_PRESETS_RUNTIME.slice(0, 2)), [
  { value: "avatar_start", label: "Avatar Start (307,352,0)" },
  { value: "lb_throne", label: "Lord British Throne (307,347,0)" }
]);
assert.deepEqual(capturePresetOptionsRuntime([]), []);
assert.equal(activeCapturePresetFromSelectRuntime(CAPTURE_PRESETS_RUNTIME, { value: "farmland" })?.id, "farmland");
assert.equal(activeCapturePresetFromSelectRuntime(CAPTURE_PRESETS_RUNTIME, null)?.id, "avatar_start");
assert.deepEqual(cameraPresetPatchRuntime(CAPTURE_PRESETS_RUNTIME[1]), {
  diagClass: "diag ok",
  diagText: "Moved camera focus to preset Lord British Throne (307,347,0).",
  map_x: 307,
  map_y: 347,
  map_z: 0,
  queue: [],
  selectValue: "lb_throne"
});
assert.equal(cameraPresetPatchRuntime(null), null);

{
  const created: Array<{ value: string; textContent: string | null }> = [];
  const appended: Array<{ value: string; textContent: string | null }> = [];
  const doc = {
    createElement(tag: string) {
      assert.equal(tag, "option");
      const option = { value: "", textContent: "" };
      created.push(option);
      return option;
    }
  } as unknown as Pick<Document, "createElement">;
  const select = {
    innerHTML: "stale",
    appendChild(node: { value: string; textContent: string | null }) {
      appended.push(node);
      return node;
    }
  } as unknown as HTMLSelectElement;
  populateCapturePresetSelectRuntime({
    document: doc,
    select,
    presets: CAPTURE_PRESETS_RUNTIME.slice(0, 2)
  });
  assert.equal(select.innerHTML, "");
  assert.equal(created.length, 2);
  assert.deepEqual(appended, [
    { value: "avatar_start", textContent: "Avatar Start (307,352,0)" },
    { value: "lb_throne", textContent: "Lord British Throne (307,347,0)" }
  ]);
}

populateCapturePresetSelectRuntime({
  document: { createElement: () => ({}) as HTMLElement } as unknown as Pick<Document, "createElement">,
  select: null,
  presets: CAPTURE_PRESETS_RUNTIME
});

assert.equal(capturePresetFilenameRuntime({
  kind: "viewport",
  preset: CAPTURE_PRESETS_RUNTIME[1],
  x: 307.9,
  y: 347.2,
  z: 0
}), "virtuemachine-lb_throne-307-347-0.png");
assert.equal(capturePresetFilenameRuntime({
  kind: "worldhud",
  preset: CAPTURE_PRESETS_RUNTIME[0],
  x: 307,
  y: 352,
  z: 0
}), "virtuemachine-worldhud-avatar_start-307-352-0.png");
assert.equal(capturePresetFilenameRuntime({
  preset: null,
  x: "10",
  y: "20",
  z: "1"
}), "virtuemachine-custom-10-20-1.png");
assert.deepEqual(captureFilePlanRuntime({
  kind: "worldhud",
  presets: CAPTURE_PRESETS_RUNTIME,
  select: { value: "farmland" },
  world: { map_x: 292, map_y: 431, map_z: 0 }
}), {
  filename: "virtuemachine-worldhud-farmland-292-431-0.png",
  preset: CAPTURE_PRESETS_RUNTIME[5]
});
assert.deepEqual(captureFilePlanRuntime({
  presets: CAPTURE_PRESETS_RUNTIME,
  select: { value: "missing" },
  world: { map_x: 10, map_y: 20, map_z: 1 }
}), {
  filename: "virtuemachine-avatar_start-10-20-1.png",
  preset: CAPTURE_PRESETS_RUNTIME[0]
});

assert.equal(
  movedCameraFocusTextRuntime(CAPTURE_PRESETS_RUNTIME[0]),
  "Moved camera focus to preset Avatar Start (307,352,0)."
);
assert.equal(movedCameraFocusTextRuntime(null), "Moved camera focus to preset custom.");
assert.deepEqual(captureSuccessDiagRuntime("shot.png"), {
  diagClass: "diag ok",
  diagText: "Captured shot.png"
});
assert.deepEqual(captureSuccessDiagRuntime(""), {
  diagClass: "diag ok",
  diagText: "Captured "
});

assert.deepEqual(captureViewportStatusRowsRuntime({
  clock: "09:51",
  dataSource: "runtime",
  date: "1 / 13 / 99",
  diagnostic: "ready",
  entityOverlay: 2,
  mapPosition: "317,354,0",
  objectOverlay: "",
  renderParity: "ok",
  stateHash: "abc",
  tile: "0xd2"
}), [
  { label: "Map Position", value: "317,354,0" },
  { label: "Clock", value: "09:51" },
  { label: "Date", value: "1 / 13 / 99" },
  { label: "Tile", value: "0xd2" },
  { label: "Render Parity", value: "ok" },
  { label: "Object Overlay", value: "-" },
  { label: "Entity Overlay", value: "2" },
  { label: "Data Source", value: "runtime" },
  { label: "State Hash", value: "abc" },
  { label: "Diagnostic", value: "ready" }
]);
assert.deepEqual(captureViewportStatusRowsRuntime({}).map((row) => row.value), [
  "-", "-", "-", "-", "-", "-", "-", "-", "-"
]);
assert.equal(
  captureViewportStatusRowsRuntime({ diagnostic: "x".repeat(80) }).at(-1)?.value,
  `${"x".repeat(69)}...`
);
assert.deepEqual(captureViewportStatusRowsFromElementsRuntime({
  clock: { textContent: "10:20" },
  dataSource: { textContent: "runtime" },
  date: { textContent: "2 / 3 / 99" },
  diagnostic: { textContent: "" },
  entityOverlay: null,
  mapPosition: { textContent: "1, 2, 0" },
  objectOverlay: { textContent: "4 / 12" },
  renderParity: { textContent: "ok" },
  stateHash: { textContent: "abc" },
  tile: { textContent: "0x123" }
}), [
  { label: "Map Position", value: "1, 2, 0" },
  { label: "Clock", value: "10:20" },
  { label: "Date", value: "2 / 3 / 99" },
  { label: "Tile", value: "0x123" },
  { label: "Render Parity", value: "ok" },
  { label: "Object Overlay", value: "4 / 12" },
  { label: "Entity Overlay", value: "-" },
  { label: "Data Source", value: "runtime" },
  { label: "State Hash", value: "abc" }
]);

{
  const listeners: Record<string, () => void> = {};
  const button = (name: string) => ({
    addEventListener(type: "click", listener: () => void) {
      listeners[`${name}:${type}`] = listener;
    }
  });
  const calls: string[] = [];
  assert.deepEqual(bindCaptureControlButtonsRuntime({
    jumpButton: button("jump"),
    captureViewportButton: button("viewport"),
    captureWorldHudButton: button("worldhud"),
    paritySnapshotButton: button("parity"),
    onJump: () => calls.push("jump"),
    onCaptureViewport: () => calls.push("viewport"),
    onCaptureWorldHud: () => calls.push("worldhud"),
    onParitySnapshot: async () => {
      calls.push("parity");
    }
  }), {
    boundCaptureViewport: true,
    boundCaptureWorldHud: true,
    boundJump: true,
    boundParitySnapshot: true
  });
  listeners["jump:click"]?.();
  listeners["viewport:click"]?.();
  listeners["worldhud:click"]?.();
  listeners["parity:click"]?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["jump", "viewport", "worldhud", "parity"]);
}

assert.deepEqual(bindCaptureControlButtonsRuntime({
  onJump: () => {},
  onCaptureViewport: () => {},
  onCaptureWorldHud: () => {},
  onParitySnapshot: () => {}
}), {
  boundCaptureViewport: false,
  boundCaptureWorldHud: false,
  boundJump: false,
  boundParitySnapshot: false
});

console.log("ui_capture_runtime_test: ok");

export type CapturePresetRuntime = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
};

export type CapturePresetOptionRuntime = {
  label: string;
  value: string;
};

export type CaptureWorldPositionRuntime = {
  map_x?: unknown;
  map_y?: unknown;
  map_z?: unknown;
};

export type CaptureCameraPresetPatchRuntime = {
  diagClass: "diag ok";
  diagText: string;
  map_x: number;
  map_y: number;
  map_z: number;
  queue: [];
  selectValue: string;
};

export type CaptureFilePlanRuntime = {
  filename: string;
  preset: CapturePresetRuntime | undefined;
};

export type CaptureSuccessDiagRuntime = {
  diagClass: "diag ok";
  diagText: string;
};

export type CaptureViewportStatusRowRuntime = {
  label: string;
  value: string;
};

export type CaptureViewportStatusSourceRuntime = {
  clock?: unknown;
  date?: unknown;
  diagnostic?: unknown;
  entityOverlay?: unknown;
  mapPosition?: unknown;
  objectOverlay?: unknown;
  renderParity?: unknown;
  stateHash?: unknown;
  tile?: unknown;
  dataSource?: unknown;
};

export type CaptureViewportCanvasRuntimeArgs = {
  canvas: HTMLCanvasElement;
  document: Pick<Document, "createElement">;
  rows: readonly CaptureViewportStatusRowRuntime[];
};

export type CaptureWorldHudCanvasRuntimeArgs = {
  document: Pick<Document, "createElement">;
  fallbackCanvas: HTMLCanvasElement;
  legacyBackdropCanvas?: HTMLCanvasElement | null;
  legacyMapRect: { h: number; w: number; x: number; y: number };
  legacyViewportCanvas?: HTMLCanvasElement | null;
};

export type CaptureButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export const CAPTURE_PRESETS_RUNTIME: readonly CapturePresetRuntime[] = Object.freeze([
  { id: "avatar_start", label: "Avatar Start (307,352,0)", x: 307, y: 352, z: 0 },
  { id: "lb_throne", label: "Lord British Throne (307,347,0)", x: 307, y: 347, z: 0 },
  { id: "wood_corner_a", label: "Wood Corner A (355,411,0)", x: 355, y: 411, z: 0 },
  { id: "wood_corner_b", label: "Wood Corner B (356,411,0)", x: 356, y: 411, z: 0 },
  { id: "britain_core", label: "Britain Core (337,365,0)", x: 337, y: 365, z: 0 },
  { id: "farmland", label: "Farmland Props (292,431,0)", x: 292, y: 431, z: 0 },
  { id: "anim_fire", label: "Animation Test Fire (360,397,0)", x: 360, y: 397, z: 0 },
  { id: "anim_wheels", label: "Animation Test Wheels (307,384,0)", x: 307, y: 384, z: 0 }
]);

export function capturePresetByIdRuntime(
  presets: readonly CapturePresetRuntime[],
  id: unknown
): CapturePresetRuntime | undefined {
  return presets.find((p) => p.id === String(id ?? "")) ?? presets[0];
}

export function capturePresetOptionsRuntime(
  presets: readonly CapturePresetRuntime[]
): CapturePresetOptionRuntime[] {
  return presets.map((preset) => ({
    value: preset.id,
    label: preset.label
  }));
}

export function populateCapturePresetSelectRuntime(args: {
  document: Pick<Document, "createElement">;
  select: HTMLSelectElement | null | undefined;
  presets: readonly CapturePresetRuntime[];
}): void {
  if (!args.select) {
    return;
  }
  args.select.innerHTML = "";
  for (const preset of capturePresetOptionsRuntime(args.presets)) {
    const opt = args.document.createElement("option");
    opt.value = preset.value;
    opt.textContent = preset.label;
    args.select.appendChild(opt);
  }
}

export function activeCapturePresetFromSelectRuntime(
  presets: readonly CapturePresetRuntime[],
  select: Pick<HTMLSelectElement, "value"> | null | undefined
): CapturePresetRuntime | undefined {
  return capturePresetByIdRuntime(presets, select ? select.value : "");
}

export function capturePresetFilenameRuntime(args: {
  kind?: "viewport" | "worldhud";
  preset: CapturePresetRuntime | null | undefined;
  x: unknown;
  y: unknown;
  z: unknown;
}): string {
  const tag = args.preset ? args.preset.id : "custom";
  const prefix = args.kind === "worldhud" ? "virtuemachine-worldhud" : "virtuemachine";
  return `${prefix}-${tag}-${Number(args.x) | 0}-${Number(args.y) | 0}-${Number(args.z) | 0}.png`;
}

export function movedCameraFocusTextRuntime(preset: CapturePresetRuntime | null | undefined): string {
  return `Moved camera focus to preset ${preset ? preset.label : "custom"}.`;
}

export function captureSuccessDiagRuntime(filename: unknown): CaptureSuccessDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Captured ${String(filename || "")}`
  };
}

function statusValueRuntime(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

export function captureViewportStatusRowsRuntime(
  source: CaptureViewportStatusSourceRuntime
): CaptureViewportStatusRowRuntime[] {
  const rows: CaptureViewportStatusRowRuntime[] = [
    { label: "Map Position", value: statusValueRuntime(source.mapPosition) },
    { label: "Clock", value: statusValueRuntime(source.clock) },
    { label: "Date", value: statusValueRuntime(source.date) },
    { label: "Tile", value: statusValueRuntime(source.tile) },
    { label: "Render Parity", value: statusValueRuntime(source.renderParity) },
    { label: "Object Overlay", value: statusValueRuntime(source.objectOverlay) },
    { label: "Entity Overlay", value: statusValueRuntime(source.entityOverlay) },
    { label: "Data Source", value: statusValueRuntime(source.dataSource) },
    { label: "State Hash", value: statusValueRuntime(source.stateHash) }
  ];
  const diagnostic = statusValueRuntime(source.diagnostic);
  if (diagnostic !== "-") {
    rows.push({
      label: "Diagnostic",
      value: diagnostic.length > 72 ? `${diagnostic.slice(0, 69)}...` : diagnostic
    });
  }
  return rows;
}

export function composeViewportCaptureCanvasRuntime(
  args: CaptureViewportCanvasRuntimeArgs
): HTMLCanvasElement {
  const margin = 14;
  const gap = 12;
  const frameBorder = 14;
  const panelW = 352;
  const worldW = args.canvas.width;
  const worldH = args.canvas.height;
  const frameW = worldW + (frameBorder * 2);
  const frameH = worldH + (frameBorder * 2);
  const outW = (margin * 2) + frameW + gap + panelW + 8;
  const outH = (margin * 2) + Math.max(frameH, 742);

  const out = args.document.createElement("canvas") as HTMLCanvasElement;
  out.width = outW;
  out.height = outH;
  const g = out.getContext("2d");
  if (!g) {
    return out;
  }
  g.imageSmoothingEnabled = false;

  const frameX = margin;
  const frameY = margin;
  const panelX = frameX + frameW + gap;
  const panelY = margin;

  g.fillStyle = "#070707";
  g.fillRect(0, 0, outW, outH);

  g.fillStyle = "#c7b17f";
  g.fillRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8);
  g.fillStyle = "#7a6946";
  g.fillRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4);
  g.fillStyle = "#3f3522";
  g.fillRect(frameX, frameY, frameW, frameH);
  g.fillStyle = "#101010";
  g.fillRect(frameX + frameBorder, frameY + frameBorder, worldW, worldH);
  g.drawImage(args.canvas, frameX + frameBorder, frameY + frameBorder, worldW, worldH);

  const panelH = outH - (margin * 2);
  g.fillStyle = "#c7b17f";
  g.fillRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8);
  g.fillStyle = "#7a6946";
  g.fillRect(panelX - 2, panelY - 2, panelW + 4, panelH + 4);
  g.fillStyle = "#111a2a";
  g.fillRect(panelX, panelY, panelW, panelH);

  const headerH = 54;
  g.fillStyle = "#1a2740";
  g.fillRect(panelX + 2, panelY + 2, panelW - 4, headerH);
  g.fillStyle = "#2e4469";
  g.fillRect(panelX + 2, panelY + headerH + 4, panelW - 4, 1);

  const textX = panelX + 14;
  let y = panelY + 22;
  g.fillStyle = "#f0d69d";
  g.font = "700 13px Silkscreen, monospace";
  g.fillText("VIRTUE MACHINE", textX, y);
  y += 16;
  g.fillStyle = "#bed0ee";
  g.font = "11px Inter, sans-serif";
  g.fillText("Ultima VI parity capture", textX, y);
  y += 15;
  g.fillStyle = "#8ea8cf";
  g.fillText("mode: legacy", textX, y);
  y = panelY + headerH + 24;

  for (const row of args.rows) {
    if (row.label === "Diagnostic") {
      y += 6;
      g.fillStyle = "#2e4469";
      g.fillRect(panelX + 10, y - 3, panelW - 20, 1);
      y += 12;
    }
    g.fillStyle = "#7f99bd";
    g.font = "11px Inter, sans-serif";
    g.fillText(row.label, textX, y);
    y += 13;
    g.fillStyle = row.label === "Diagnostic" ? "#d8e4f5" : "#e8f1ff";
    g.font = row.label === "Diagnostic" ? "11px Inter, sans-serif" : "700 11px Inter, sans-serif";
    g.fillText(String(row.value ?? "-"), textX, y);
    y += 15;
  }

  return out;
}

export function composeWorldHudCaptureCanvasRuntime(
  args: CaptureWorldHudCanvasRuntimeArgs
): HTMLCanvasElement {
  const out = args.document.createElement("canvas") as HTMLCanvasElement;
  out.width = 320;
  out.height = 200;
  const g = out.getContext("2d");
  if (!g) {
    return out;
  }
  g.imageSmoothingEnabled = false;

  const backdrop = args.legacyBackdropCanvas;
  if (backdrop && backdrop.width > 0 && backdrop.height > 0) {
    g.drawImage(
      backdrop,
      0,
      0,
      backdrop.width,
      backdrop.height,
      0,
      0,
      320,
      200
    );

    const viewport = args.legacyViewportCanvas;
    if (viewport && viewport.width > 0 && viewport.height > 0) {
      g.drawImage(
        viewport,
        0,
        0,
        viewport.width,
        viewport.height,
        args.legacyMapRect.x,
        args.legacyMapRect.y,
        args.legacyMapRect.w,
        args.legacyMapRect.h
      );
    }
    return out;
  }

  g.drawImage(args.fallbackCanvas, 0, 0, args.fallbackCanvas.width, args.fallbackCanvas.height, 0, 0, 320, 200);
  return out;
}

export function cameraPresetPatchRuntime(
  preset: CapturePresetRuntime | null | undefined
): CaptureCameraPresetPatchRuntime | null {
  if (!preset) {
    return null;
  }
  return {
    diagClass: "diag ok",
    diagText: movedCameraFocusTextRuntime(preset),
    map_x: Number(preset.x) | 0,
    map_y: Number(preset.y) | 0,
    map_z: Number(preset.z) | 0,
    queue: [],
    selectValue: preset.id
  };
}

export function captureFilePlanRuntime(args: {
  kind?: "viewport" | "worldhud";
  presets: readonly CapturePresetRuntime[];
  select?: Pick<HTMLSelectElement, "value"> | null;
  world: CaptureWorldPositionRuntime;
}): CaptureFilePlanRuntime {
  const preset = activeCapturePresetFromSelectRuntime(args.presets, args.select);
  return {
    filename: capturePresetFilenameRuntime({
      kind: args.kind,
      preset,
      x: args.world.map_x,
      y: args.world.map_y,
      z: args.world.map_z
    }),
    preset
  };
}

export function bindCaptureControlButtonsRuntime(args: {
  captureViewportButton?: CaptureButtonRuntime | null;
  captureWorldHudButton?: CaptureButtonRuntime | null;
  jumpButton?: CaptureButtonRuntime | null;
  paritySnapshotButton?: CaptureButtonRuntime | null;
  onCaptureViewport: () => void;
  onCaptureWorldHud: () => void;
  onJump: () => void;
  onParitySnapshot: () => void | Promise<void>;
}): {
  boundCaptureViewport: boolean;
  boundCaptureWorldHud: boolean;
  boundJump: boolean;
  boundParitySnapshot: boolean;
} {
  if (args.jumpButton) {
    args.jumpButton.addEventListener("click", args.onJump);
  }
  if (args.captureViewportButton) {
    args.captureViewportButton.addEventListener("click", args.onCaptureViewport);
  }
  if (args.captureWorldHudButton) {
    args.captureWorldHudButton.addEventListener("click", args.onCaptureWorldHud);
  }
  if (args.paritySnapshotButton) {
    args.paritySnapshotButton.addEventListener("click", () => {
      void args.onParitySnapshot();
    });
  }
  return {
    boundCaptureViewport: !!args.captureViewportButton,
    boundCaptureWorldHud: !!args.captureWorldHudButton,
    boundJump: !!args.jumpButton,
    boundParitySnapshot: !!args.paritySnapshotButton
  };
}

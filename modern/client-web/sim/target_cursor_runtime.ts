import {
  legacyVerbLabelRuntime,
  legacyVerbSelectRangeRuntime,
  normalizeLegacyTargetVerbRuntime
} from "./legacy_command_runtime.ts";
import { clampI32Runtime } from "./sim_utils_runtime.ts";

export type TargetCursorStateRuntime = {
  targetVerb: string;
  useCursorActive: boolean;
  useCursorX: number;
  useCursorY: number;
};

export type TargetCursorWorldRuntime = {
  map_x: number;
  map_y: number;
};

export function clampTargetCursorToViewRuntime(args: {
  state: TargetCursorStateRuntime;
  world: TargetCursorWorldRuntime;
  viewW: number;
  viewH: number;
}): void {
  const viewW = Math.max(1, Number(args.viewW) | 0);
  const viewH = Math.max(1, Number(args.viewH) | 0);
  const cx = Number(args.world.map_x) | 0;
  const cy = Number(args.world.map_y) | 0;
  const startX = cx - (viewW >> 1);
  const startY = cy - (viewH >> 1);
  const maxX = startX + viewW - 1;
  const maxY = startY + viewH - 1;
  const state = args.state;
  state.useCursorX = clampI32Runtime(state.useCursorX | 0, startX, maxX);
  state.useCursorY = clampI32Runtime(state.useCursorY | 0, startY, maxY);
  const range = legacyVerbSelectRangeRuntime(state.targetVerb);
  if (Number.isFinite(range) && range >= 0) {
    const dx = (state.useCursorX | 0) - cx;
    const dy = (state.useCursorY | 0) - cy;
    const cheb = Math.max(Math.abs(dx), Math.abs(dy));
    if (cheb > range) {
      const s = range / Math.max(1, cheb);
      const nx = cx + Math.round(dx * s);
      const ny = cy + Math.round(dy * s);
      state.useCursorX = clampI32Runtime(nx | 0, startX, maxX);
      state.useCursorY = clampI32Runtime(ny | 0, startY, maxY);
    }
  }
}

export function beginTargetCursorRuntime(args: {
  state: TargetCursorStateRuntime;
  world: TargetCursorWorldRuntime;
  verb: unknown;
  viewW: number;
  viewH: number;
}): { ok: boolean; diagText: string } {
  const verb = normalizeLegacyTargetVerbRuntime(args.verb);
  if (!verb) {
    return { ok: false, diagText: "" };
  }
  const state = args.state;
  state.useCursorX = Number(args.world.map_x) | 0;
  state.useCursorY = Number(args.world.map_y) | 0;
  state.targetVerb = verb;
  state.useCursorActive = true;
  clampTargetCursorToViewRuntime(args);
  const label = legacyVerbLabelRuntime(verb);
  const directional = (legacyVerbSelectRangeRuntime(verb) | 0) < 0;
  return {
    ok: true,
    diagText: directional
      ? `${label}: choose direction with arrow keys, cancel with Esc.`
      : `${label}: move target with arrows, confirm with Enter/U, cancel with Esc.`
  };
}

export function moveTargetCursorRuntime(args: {
  state: TargetCursorStateRuntime;
  world: TargetCursorWorldRuntime;
  dx: number;
  dy: number;
  viewW: number;
  viewH: number;
}): { shouldCommit: boolean } {
  const state = args.state;
  if (!state.useCursorActive) {
    return { shouldCommit: false };
  }
  const dx = Number(args.dx) | 0;
  const dy = Number(args.dy) | 0;
  const range = legacyVerbSelectRangeRuntime(state.targetVerb);
  if (range === -1) {
    state.useCursorX = ((Number(args.world.map_x) | 0) + dx) | 0;
    state.useCursorY = ((Number(args.world.map_y) | 0) + dy) | 0;
    clampTargetCursorToViewRuntime(args);
    return { shouldCommit: true };
  }
  state.useCursorX = ((state.useCursorX | 0) + dx) | 0;
  state.useCursorY = ((state.useCursorY | 0) + dy) | 0;
  clampTargetCursorToViewRuntime(args);
  return { shouldCommit: false };
}

export function cancelTargetCursorRuntime(state: TargetCursorStateRuntime): boolean {
  if (!state.useCursorActive) {
    return false;
  }
  state.useCursorActive = false;
  state.targetVerb = "";
  return true;
}

import { packCommandRuntime, unpackCommandRuntime } from "./command_wire_runtime.ts";

export const LEGACY_COMMAND_WIRE_SIZE_RUNTIME = 16;

export const LEGACY_TARGET_VERB_RUNTIME = {
  ATTACK: "attack",
  CAST: "cast",
  TALK: "talk",
  LOOK: "look",
  GET: "get",
  DROP: "drop",
  MOVE: "move",
  USE: "use"
} as const;

export type LegacyTargetVerbRuntime = typeof LEGACY_TARGET_VERB_RUNTIME[keyof typeof LEGACY_TARGET_VERB_RUNTIME];

export const LEGACY_COMMAND_TYPE_RUNTIME = {
  MOVE_AVATAR: 1,
  USE_FACING: 2,
  USE_AT_CELL: 3,
  LOOK_AT_CELL: 4,
  TALK_AT_CELL: 5,
  GET_AT_CELL: 6,
  ATTACK_AT_CELL: 7,
  CAST_AT_CELL: 8,
  DROP_AT_CELL: 9,
  MOVE_AT_CELL: 10,
  USE_VERB_AT_CELL: 11
} as const;

export const LEGACY_TARGET_VERB_LABEL_RUNTIME: Record<LegacyTargetVerbRuntime, string> = {
  [LEGACY_TARGET_VERB_RUNTIME.ATTACK]: "Attack",
  [LEGACY_TARGET_VERB_RUNTIME.CAST]: "Cast",
  [LEGACY_TARGET_VERB_RUNTIME.TALK]: "Talk",
  [LEGACY_TARGET_VERB_RUNTIME.LOOK]: "Look",
  [LEGACY_TARGET_VERB_RUNTIME.GET]: "Get",
  [LEGACY_TARGET_VERB_RUNTIME.DROP]: "Drop",
  [LEGACY_TARGET_VERB_RUNTIME.MOVE]: "Move",
  [LEGACY_TARGET_VERB_RUNTIME.USE]: "Use"
};

export const LEGACY_VERB_SELECT_RANGE_RUNTIME: Record<LegacyTargetVerbRuntime, number> = {
  [LEGACY_TARGET_VERB_RUNTIME.ATTACK]: 7,
  [LEGACY_TARGET_VERB_RUNTIME.CAST]: 7,
  [LEGACY_TARGET_VERB_RUNTIME.TALK]: 7,
  [LEGACY_TARGET_VERB_RUNTIME.LOOK]: 7,
  [LEGACY_TARGET_VERB_RUNTIME.GET]: -1,
  [LEGACY_TARGET_VERB_RUNTIME.DROP]: 7,
  [LEGACY_TARGET_VERB_RUNTIME.MOVE]: -1,
  [LEGACY_TARGET_VERB_RUNTIME.USE]: -1
};

export const LEGACY_WORLD_CURSOR_TILE_RUNTIME = {
  DIRECTION: 0x16c,
  SELECT: 0x16d
} as const;

export const LEGACY_MOUSE_CURSOR_INDEX_RUNTIME = {
  POINTER: 0,
  SELECT: 1
} as const;

export const LEGACY_VERB_COMMAND_TYPE_RUNTIME: Record<LegacyTargetVerbRuntime, number> = {
  [LEGACY_TARGET_VERB_RUNTIME.ATTACK]: LEGACY_COMMAND_TYPE_RUNTIME.ATTACK_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.CAST]: LEGACY_COMMAND_TYPE_RUNTIME.CAST_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.TALK]: LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.LOOK]: LEGACY_COMMAND_TYPE_RUNTIME.LOOK_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.GET]: LEGACY_COMMAND_TYPE_RUNTIME.GET_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.DROP]: LEGACY_COMMAND_TYPE_RUNTIME.DROP_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.MOVE]: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AT_CELL,
  [LEGACY_TARGET_VERB_RUNTIME.USE]: LEGACY_COMMAND_TYPE_RUNTIME.USE_VERB_AT_CELL
};

export type LegacyKeyboardCommandActionRuntime =
  | { kind: "target"; verb: LegacyTargetVerbRuntime }
  | { kind: "status_inventory" }
  | { kind: "status_party" }
  | { kind: "rest" }
  | { kind: "toggle_combat" }
  | { kind: "none" };

export type LegacyNonTargetCommandPatchRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
  handled: boolean;
  inCombat?: 0 | 1;
  legacyStatusDisplay?: number;
};

export type LegacyTargetStartPlanRuntime =
  | {
    action: "blocked";
    diagClass: "diag warn";
    diagText: string;
    ledgerLines: readonly string[];
  }
  | {
    action: "begin";
    legacyStatusDisplay?: number;
    shouldPromptDropTarget: boolean;
  };

export function normalizeLegacyTargetVerbRuntime(value: unknown): LegacyTargetVerbRuntime | null {
  const key = String(value || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEGACY_TARGET_VERB_LABEL_RUNTIME, key)
    ? key as LegacyTargetVerbRuntime
    : null;
}

export function legacyVerbCommandTypeRuntime(value: unknown): number {
  const verb = normalizeLegacyTargetVerbRuntime(value);
  return verb ? LEGACY_VERB_COMMAND_TYPE_RUNTIME[verb] : 0;
}

export function legacyVerbSelectRangeRuntime(value: unknown): number {
  const verb = normalizeLegacyTargetVerbRuntime(value);
  return verb ? LEGACY_VERB_SELECT_RANGE_RUNTIME[verb] : 0;
}

export function legacyVerbWorldCursorTileRuntime(value: unknown): number {
  return legacyVerbSelectRangeRuntime(value) < 0
    ? LEGACY_WORLD_CURSOR_TILE_RUNTIME.DIRECTION
    : LEGACY_WORLD_CURSOR_TILE_RUNTIME.SELECT;
}

export function legacyVerbMouseCursorIndexRuntime(value: unknown): number {
  const verb = normalizeLegacyTargetVerbRuntime(value);
  return verb ? LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.SELECT : LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.POINTER;
}

export function legacyVerbLabelRuntime(value: unknown): string {
  const verb = normalizeLegacyTargetVerbRuntime(value);
  return verb ? LEGACY_TARGET_VERB_LABEL_RUNTIME[verb] : "";
}

export function legacyKeyboardCommandActionRuntime(key: unknown): LegacyKeyboardCommandActionRuntime {
  const k = String(key || "").toLowerCase();
  switch (k) {
    case "a":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.ATTACK };
    case "c":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.CAST };
    case "t":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.TALK };
    case "l":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.LOOK };
    case "g":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.GET };
    case "d":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.DROP };
    case "m":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.MOVE };
    case "u":
      return { kind: "target", verb: LEGACY_TARGET_VERB_RUNTIME.USE };
    case "i":
      return { kind: "status_inventory" };
    case "p":
      return { kind: "status_party" };
    case "r":
      return { kind: "rest" };
    case "b":
      return { kind: "toggle_combat" };
    default:
      return { kind: "none" };
  }
}

export function legacyNonTargetCommandPatchRuntime(args: {
  currentInCombat?: unknown;
  inventoryStatusDisplay: unknown;
  key: unknown;
  partyStatusDisplay: unknown;
}): LegacyNonTargetCommandPatchRuntime {
  const action = legacyKeyboardCommandActionRuntime(args.key);
  if (action.kind === "status_inventory") {
    return {
      diagClass: "diag ok",
      diagText: "Status: inventory/equipment.",
      handled: true,
      legacyStatusDisplay: Number(args.inventoryStatusDisplay) | 0
    };
  }
  if (action.kind === "status_party") {
    return {
      diagClass: "diag ok",
      diagText: "Status: party/command.",
      handled: true,
      legacyStatusDisplay: Number(args.partyStatusDisplay) | 0
    };
  }
  if (action.kind === "rest") {
    return {
      diagClass: "diag ok",
      diagText: "Rest: legacy key mapped; rest system integration pending.",
      handled: true
    };
  }
  if (action.kind === "toggle_combat") {
    const inCombat = args.currentInCombat ? 0 : 1;
    return {
      diagClass: "diag ok",
      diagText: inCombat ? "Combat mode: ON" : "Combat mode: OFF",
      handled: true,
      inCombat
    };
  }
  return {
    diagClass: "diag warn",
    diagText: "",
    handled: false
  };
}

export function legacyTargetStartPlanRuntime(args: {
  dropStatusDisplay: unknown;
  hasDropItem?: boolean;
  movementMode: unknown;
  verb: unknown;
}): LegacyTargetStartPlanRuntime {
  if (args.movementMode !== "avatar") {
    return {
      action: "blocked",
      diagClass: "diag warn",
      diagText: "Legacy targeting requires Avatar mode.",
      ledgerLines: []
    };
  }
  const verb = normalizeLegacyTargetVerbRuntime(args.verb);
  if (verb === LEGACY_TARGET_VERB_RUNTIME.DROP) {
    if (!args.hasDropItem) {
      return {
        action: "blocked",
        diagClass: "diag warn",
        diagText: "Drop: inventory is empty.",
        ledgerLines: [">Drop-nothing", "Not possible"]
      };
    }
    return {
      action: "begin",
      legacyStatusDisplay: Number(args.dropStatusDisplay) | 0,
      shouldPromptDropTarget: true
    };
  }
  return {
    action: "begin",
    shouldPromptDropTarget: false
  };
}

export function buildLegacyWireCommandRuntime(
  tick: number,
  type: number,
  arg0: number,
  arg1: number,
  wireSize = LEGACY_COMMAND_WIRE_SIZE_RUNTIME
): {
  tick: number;
  type: number;
  arg0: number;
  arg1: number;
} {
  const bytes = packCommandRuntime(tick, type, arg0, arg1, wireSize);
  return unpackCommandRuntime(bytes);
}
